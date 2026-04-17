/**
 * @file Sitemap discovery for F1 site-wide crawl.
 *   1. fetch /robots.txt, extract `Sitemap:` directives
 *   2. fallback to <root>/sitemap.xml when robots has none
 *   3. parse each sitemap; recurse into <sitemapindex> up to 2 levels
 *   4. canonicalize + dedupe + filter to same registrable domain
 *   5. cap at maxUrls
 * All HTTP access is injected via `SitemapHttpClient` so the parser
 * is fully unit-testable without network.
 */
import { SITE_CRAWL_LIMITS } from '@repo/shared';
import { canonicalizeUrl, dedupeUrls, sameRegistrableDomain } from '../../domain/url-canonicalizer';

export interface SitemapHttpResponse {
  status: number;
  body: string;
  contentType: string;
}

export interface SitemapHttpClient {
  fetch(url: string): Promise<SitemapHttpResponse>;
}

export interface SitemapParseResult {
  kind: 'urlset' | 'sitemapindex' | 'unknown';
  urls: string[];
  subSitemaps: string[];
  truncated: boolean;
}

/** Extract `Sitemap: <url>` lines from robots.txt content (case-insensitive). */
export function parseRobotsTxt(content: string): string[] {
  if (!content) return [];
  const out: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*sitemap\s*:\s*(\S+)/i.exec(line);
    if (match && match[1]) out.push(match[1]);
  }
  return out;
}

const LOC_REGEX = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
const IS_INDEX_REGEX = /<sitemapindex\b/i;
const IS_URLSET_REGEX = /<urlset\b/i;

/** Extract URLs (or sub-sitemap URLs) from a sitemap XML body. */
export function parseSitemapXml(xml: string): SitemapParseResult {
  const isIndex = IS_INDEX_REGEX.test(xml);
  const isUrlset = IS_URLSET_REGEX.test(xml);
  if (!isIndex && !isUrlset) {
    return { kind: 'unknown', urls: [], subSitemaps: [], truncated: false };
  }

  const locs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = LOC_REGEX.exec(xml)) !== null) {
    if (match[1]) locs.push(match[1]);
    if (locs.length >= SITE_CRAWL_LIMITS.MAX_URLS_PER_SITEMAP) break;
  }
  LOC_REGEX.lastIndex = 0;

  const truncated = locs.length >= SITE_CRAWL_LIMITS.MAX_URLS_PER_SITEMAP;
  if (isIndex) {
    return { kind: 'sitemapindex', urls: [], subSitemaps: locs, truncated };
  }
  return { kind: 'urlset', urls: locs, subSitemaps: [], truncated };
}

export class SitemapDiscovery {
  constructor(private readonly http: SitemapHttpClient) {}

  /** End-to-end: robots.txt → sitemap chain → canonical URL list, capped. */
  async discoverAllUrls(rootUrl: string, maxUrls: number): Promise<string[]> {
    const origin = safeOrigin(rootUrl);
    if (!origin) return [];

    const startSitemaps = await this.discoverSitemapUrls(origin);
    if (startSitemaps.length === 0) return [];

    const found = new Set<string>();
    await this.traverse(startSitemaps, 0, found, maxUrls, rootUrl);

    return dedupeUrls(Array.from(found)).slice(0, maxUrls);
  }

  /** Returns the list of sitemap URLs to start from (robots or fallback). */
  private async discoverSitemapUrls(origin: string): Promise<string[]> {
    const robotsUrl = `${origin}/robots.txt`;
    const robotsRes = await this.safeFetch(robotsUrl);
    if (robotsRes && robotsRes.status === 200) {
      const declared = parseRobotsTxt(robotsRes.body);
      if (declared.length > 0) return declared;
    }
    // Fallback: probe the conventional /sitemap.xml location
    const fallback = `${origin}/sitemap.xml`;
    const head = await this.safeFetch(fallback);
    if (head && head.status === 200) return [fallback];
    return [];
  }

  /**
   * Walk sitemap + sitemapindex nodes, collecting URL locs into `found`.
   * Enforces both `MAX_SITEMAP_INDEX_DEPTH` and the per-audit `maxUrls`.
   */
  private async traverse(
    sitemapUrls: string[],
    depth: number,
    found: Set<string>,
    maxUrls: number,
    rootUrl: string,
  ): Promise<void> {
    if (depth > SITE_CRAWL_LIMITS.MAX_SITEMAP_INDEX_DEPTH) return;
    for (const sitemapUrl of sitemapUrls) {
      if (found.size >= maxUrls) return;
      const res = await this.safeFetch(sitemapUrl);
      if (!res || res.status !== 200 || !res.body) continue;
      const parsed = parseSitemapXml(res.body);
      if (parsed.kind === 'urlset') {
        for (const raw of parsed.urls) {
          const canon = canonicalizeUrl(raw);
          if (!canon) continue;
          if (!sameRegistrableDomain(canon, rootUrl)) continue;
          found.add(canon);
          if (found.size >= maxUrls) return;
        }
      } else if (parsed.kind === 'sitemapindex') {
        await this.traverse(parsed.subSitemaps, depth + 1, found, maxUrls, rootUrl);
      }
    }
  }

  private async safeFetch(url: string): Promise<SitemapHttpResponse | null> {
    try {
      return await this.http.fetch(url);
    } catch {
      return null;
    }
  }
}

function safeOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}
