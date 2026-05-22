import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import robotsParser from 'robots-parser';
import { LiteFetcherService } from './lite-fetcher.service';
import {
  NestedSitemap,
  RobotsRule,
  SitemapUrlEntry,
  SitemapValidatorResponse,
  SitemapValidatorWarning,
} from '../dto/sitemap-validator.dto';

const SITEMAP_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ROBOTS_MAX_BYTES = 1024 * 1024; // 1 MB
const MAX_NESTED = 10;
const DISPLAY_CAP = 1000;
const CHANGEFREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

type ServiceResult = {
  data: SitemapValidatorResponse['data'];
  warnings: SitemapValidatorWarning[];
  cached: boolean;
};

@Injectable()
export class SitemapValidatorService {
  private readonly xml = new XMLParser({ ignoreAttributes: true });

  constructor(private readonly fetcher: LiteFetcherService) {}

  async execute(
    siteUrl: string,
    options?: { followSitemapIndex?: boolean },
  ): Promise<ServiceResult> {
    const origin = new URL(siteUrl).origin;
    const robotsUrl = `${origin}/robots.txt`;

    let robots: SitemapValidatorResponse['data']['robots'] = {
      url: robotsUrl,
      exists: false,
      rules: [],
      sitemaps: [],
      syntaxErrors: [],
    };
    try {
      const rres = await this.fetcher.get(robotsUrl, { maxBytes: ROBOTS_MAX_BYTES });
      const { rules, syntaxErrors } = this.parseRobots(rres.body);
      const sitemaps = robotsParser(robotsUrl, rres.body).getSitemaps();
      robots = { url: robotsUrl, exists: true, rules, sitemaps, syntaxErrors };
    } catch {
      /* robots.txt absent / unreachable */
    }

    const sitemapUrl = robots.sitemaps[0] ?? `${origin}/sitemap.xml`;
    const sitemap = await this.fetchAndParseSitemap(sitemapUrl, !!options?.followSitemapIndex);

    return { data: { robots, sitemap }, warnings: this.computeWarnings(robots, sitemap), cached: false };
  }

  private parseRobots(content: string): { rules: RobotsRule[]; syntaxErrors: string[] } {
    const rules: RobotsRule[] = [];
    const syntaxErrors: string[] = [];
    let currentUA = '*';
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;
      const idx = line.indexOf(':');
      if (idx === -1) {
        syntaxErrors.push(`Malformed line: "${rawLine.trim()}"`);
        continue;
      }
      const field = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      if (field === 'user-agent') currentUA = value || '*';
      else if (field === 'allow') rules.push({ userAgent: currentUA, type: 'allow', value });
      else if (field === 'disallow') rules.push({ userAgent: currentUA, type: 'disallow', value });
      else if (['sitemap', 'crawl-delay', 'host', 'clean-param', 'request-rate'].includes(field)) {
        /* known non-rule directive */
      } else {
        syntaxErrors.push(`Unknown directive: "${field}"`);
      }
    }
    return { rules, syntaxErrors };
  }

  private async fetchAndParseSitemap(
    sitemapUrl: string,
    follow: boolean,
  ): Promise<SitemapValidatorResponse['data']['sitemap']> {
    const empty = {
      url: sitemapUrl,
      type: 'empty' as const,
      isIndex: false,
      totalUrls: 0,
      displayedUrls: 0,
      truncated: false,
    };

    let body: string;
    try {
      const res = await this.fetcher.get(sitemapUrl, { maxBytes: SITEMAP_MAX_BYTES });
      body = res.body;
    } catch {
      return empty;
    }

    let doc: any;
    try {
      doc = this.xml.parse(body);
    } catch {
      return empty;
    }

    if (doc?.sitemapindex) {
      const entries = this.toArray(doc.sitemapindex.sitemap);
      const nested: NestedSitemap[] = entries
        .map((e) => ({ url: this.locOf(e), urlCount: 0, errors: [] as string[] }))
        .filter((n) => n.url);

      if (follow) {
        await Promise.all(
          nested.slice(0, MAX_NESTED).map(async (n) => {
            try {
              const nres = await this.fetcher.get(n.url, { maxBytes: SITEMAP_MAX_BYTES });
              const ndoc = this.xml.parse(nres.body);
              n.urlCount = this.toArray(ndoc?.urlset?.url).length;
            } catch {
              n.errors.push('Failed to fetch or parse nested sitemap.');
            }
          }),
        );
      }

      return {
        url: sitemapUrl,
        type: 'index',
        isIndex: true,
        nestedSitemaps: nested,
        totalUrls: nested.reduce((s, n) => s + n.urlCount, 0),
        displayedUrls: 0,
        truncated: false,
      };
    }

    if (doc?.urlset) {
      const items = this.toArray(doc.urlset.url);
      const displayed = items.slice(0, DISPLAY_CAP).map((u) => this.validateEntry(u));
      return {
        url: sitemapUrl,
        type: 'urlset',
        isIndex: false,
        urls: displayed,
        totalUrls: items.length,
        displayedUrls: displayed.length,
        truncated: items.length > DISPLAY_CAP,
      };
    }

    return empty;
  }

  private validateEntry(u: any): SitemapUrlEntry {
    const loc = this.locOf(u);
    const errors: string[] = [];

    if (!loc || !/^https?:\/\//i.test(loc)) {
      errors.push('"loc" is missing or not an http(s) URL.');
    }
    const lastmod = u?.lastmod != null ? String(u.lastmod) : undefined;
    if (lastmod && Number.isNaN(Date.parse(lastmod))) {
      errors.push('"lastmod" is not a valid ISO 8601 date.');
    }
    const changefreq = u?.changefreq != null ? String(u.changefreq) : undefined;
    if (changefreq && !CHANGEFREQ.includes(changefreq)) {
      errors.push(`"changefreq" "${changefreq}" is not a valid value.`);
    }
    let priority: number | undefined;
    if (u?.priority != null && u.priority !== '') {
      priority = Number(u.priority);
      if (Number.isNaN(priority) || priority < 0 || priority > 1) {
        errors.push('"priority" must be between 0.0 and 1.0.');
      }
    }

    return { loc, lastmod, changefreq, priority, isValid: errors.length === 0, errors };
  }

  private locOf(node: any): string {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    const loc = node.loc;
    if (loc == null) return '';
    return typeof loc === 'string' ? loc : String(loc);
  }

  private toArray<T>(value: T | T[] | undefined): T[] {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  private computeWarnings(
    robots: SitemapValidatorResponse['data']['robots'],
    sitemap: SitemapValidatorResponse['data']['sitemap'],
  ): SitemapValidatorWarning[] {
    const w: SitemapValidatorWarning[] = [];
    if (!robots.exists) {
      w.push({ field: 'robots', severity: 'info', message: 'No robots.txt found.' });
    }
    for (const e of robots.syntaxErrors) {
      w.push({ field: 'robots', severity: 'warn', message: e });
    }
    if (sitemap.type === 'empty') {
      w.push({ field: 'sitemap', severity: 'error', message: 'No valid sitemap found.' });
    }
    if (sitemap.urls) {
      const invalid = sitemap.urls.filter((u) => !u.isValid).length;
      if (invalid > 0) {
        w.push({
          field: 'sitemap',
          severity: 'warn',
          message: `${invalid} sitemap URL entr${invalid === 1 ? 'y has' : 'ies have'} validation errors.`,
        });
      }
    }
    if (sitemap.truncated) {
      w.push({
        field: 'sitemap',
        severity: 'info',
        message: `Sitemap has ${sitemap.totalUrls} URLs; showing first ${DISPLAY_CAP}.`,
      });
    }
    return w;
  }
}
