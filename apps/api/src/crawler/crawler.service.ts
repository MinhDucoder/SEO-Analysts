import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';

export interface CrawlResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSize: number;
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonicalUrl: string | null;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  h4Tags: string[];
  h5Tags: string[];
  h6Tags: string[];
  images: Array<{ src: string; alt: string | null }>;
  internalLinks: string[];
  externalLinks: string[];
  schemaMarkup: object[];
  openGraphTags: Record<string, string>;
  responseHeaders: Record<string, string>;
  redirectChain: string[];
  hasRobotsTxt: boolean;
  robotsTxtContent: string | null;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  isHttps: boolean;
  contentEncoding: string | null;
  cacheControl: string | null;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private lastRequestTime: Record<string, number> = {};

  async crawl(url: string): Promise<CrawlResult> {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;

    await this.respectPoliteness(domain);

    const startTime = Date.now();
    let html: string;
    let statusCode: number;
    let responseHeaders: Record<string, string> = {};
    const redirectChain: string[] = [];

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 10,
        headers: {
          'User-Agent': 'SEOAnalyzerBot/1.0 (+https://seo-platform.dev/bot)',
        },
        validateStatus: () => true,
        beforeRedirect: (options: any) => {
          redirectChain.push(options.href);
        },
      });

      html = response.data;
      statusCode = response.status;
      responseHeaders = Object.fromEntries(
        Object.entries(response.headers).map(([k, v]) => [k, String(v)]),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch ${url}: ${message}`);
    }

    const responseTimeMs = Date.now() - startTime;

    // Check if JS rendering is needed
    const $ = cheerio.load(html);
    const bodyText = $('body').text().trim();

    if (bodyText.length < 100) {
      this.logger.log(`JS rendering needed for ${url}, using Playwright`);
      const rendered = await this.renderWithPlaywright(url);
      if (rendered) {
        html = rendered;
      }
    }

    const $page = cheerio.load(html) as unknown as cheerio.CheerioAPI;
    const extracted = this.extractData($page, url, parsedUrl);

    // Fetch robots.txt and sitemap
    await this.respectPoliteness(domain);
    const robotsData = await this.fetchRobotsTxt(parsedUrl.origin);

    await this.respectPoliteness(domain);
    const sitemapData = await this.checkSitemap(
      parsedUrl.origin,
      robotsData.robotsTxtContent,
    );

    return {
      url,
      statusCode,
      responseTimeMs,
      htmlSize: Buffer.byteLength(html, 'utf8'),
      ...extracted,
      responseHeaders,
      redirectChain,
      ...robotsData,
      ...sitemapData,
      isHttps: parsedUrl.protocol === 'https:',
      contentEncoding: responseHeaders['content-encoding'] || null,
      cacheControl: responseHeaders['cache-control'] || null,
    };
  }

  private extractData($: cheerio.CheerioAPI, url: string, parsedUrl: URL) {
    const title = $('title').first().text() || null;
    const metaDescription =
      $('meta[name="description"]').attr('content') || null;
    const metaRobots = $('meta[name="robots"]').attr('content') || null;
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || null;

    const headingTags = (tag: string) =>
      $(tag)
        .map((_, el) => $(el).text().trim())
        .get();

    const images = $('img')
      .map((_, el) => ({
        src: $(el).attr('src') || '',
        alt: $(el).attr('alt') ?? null,
      }))
      .get();

    const links = $('a[href]')
      .map((_, el) => $(el).attr('href') || '')
      .get()
      .filter(
        (href) =>
          href &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('javascript:'),
      );

    const internalLinks: string[] = [];
    const externalLinks: string[] = [];

    for (const href of links) {
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === parsedUrl.hostname) {
          internalLinks.push(linkUrl.href);
        } else {
          externalLinks.push(linkUrl.href);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    // Schema.org markup (JSON-LD)
    const schemaMarkup: object[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '');
        schemaMarkup.push(parsed);
      } catch {
        // Invalid JSON-LD
      }
    });

    // Open Graph tags
    const openGraphTags: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        openGraphTags[property] = content;
      }
    });

    return {
      title,
      metaDescription,
      metaRobots,
      canonicalUrl,
      h1Tags: headingTags('h1'),
      h2Tags: headingTags('h2'),
      h3Tags: headingTags('h3'),
      h4Tags: headingTags('h4'),
      h5Tags: headingTags('h5'),
      h6Tags: headingTags('h6'),
      images,
      internalLinks: [...new Set(internalLinks)],
      externalLinks: [...new Set(externalLinks)],
      schemaMarkup,
      openGraphTags,
    };
  }

  private async renderWithPlaywright(url: string): Promise<string | null> {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const html = await page.content();
      return html;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Playwright rendering failed for ${url}: ${message}`);
      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async fetchRobotsTxt(
    origin: string,
  ): Promise<{ hasRobotsTxt: boolean; robotsTxtContent: string | null }> {
    try {
      const response = await axios.get(`${origin}/robots.txt`, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'SEOAnalyzerBot/1.0',
        },
      });
      if (response.status === 200) {
        return {
          hasRobotsTxt: true,
          robotsTxtContent: response.data,
        };
      }
      return { hasRobotsTxt: false, robotsTxtContent: null };
    } catch {
      return { hasRobotsTxt: false, robotsTxtContent: null };
    }
  }

  private async checkSitemap(
    origin: string,
    robotsTxtContent: string | null,
  ): Promise<{ hasSitemap: boolean; sitemapUrl: string | null }> {
    // Check robots.txt for sitemap reference
    if (robotsTxtContent) {
      const match = robotsTxtContent.match(/Sitemap:\s*(.+)/i);
      if (match) {
        return { hasSitemap: true, sitemapUrl: match[1].trim() };
      }
    }

    // Check default location
    try {
      const response = await axios.head(`${origin}/sitemap.xml`, {
        timeout: 10000,
        validateStatus: () => true,
      });
      if (response.status === 200) {
        return { hasSitemap: true, sitemapUrl: `${origin}/sitemap.xml` };
      }
    } catch {
      // Ignore
    }

    return { hasSitemap: false, sitemapUrl: null };
  }

  private async respectPoliteness(domain: string): Promise<void> {
    const lastTime = this.lastRequestTime[domain];
    if (lastTime) {
      const elapsed = Date.now() - lastTime;
      if (elapsed < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
      }
    }
    this.lastRequestTime[domain] = Date.now();
  }

  isAllowedByRobotsTxt(robotsTxtContent: string | null, path: string): boolean {
    if (!robotsTxtContent) return true;

    const lines = robotsTxtContent.split('\n');
    let isRelevantAgent = false;
    const disallowedPaths: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim().toLowerCase();
        isRelevantAgent = agent === '*' || agent === 'seoanalyzerbot';
      } else if (
        isRelevantAgent &&
        trimmed.toLowerCase().startsWith('disallow:')
      ) {
        const disallowed = trimmed.split(':').slice(1).join(':').trim();
        if (disallowed) {
          disallowedPaths.push(disallowed);
        }
      }
    }

    return !disallowedPaths.some((dp) => path.startsWith(dp));
  }
}
