/**
 * @file Orchestrates the crawl pipeline:
 * validate → cache lookup → fetch (Cheerio → Playwright fallback) →
 * Lighthouse (best-effort) → PageData extract → cache → return.
 */
import { Injectable, Logger } from '@nestjs/common';
import { CoreWebVitals, LinkCheckResult } from '@repo/shared';
import { CacheService } from '../persistence/cache.service';
import { CheerioFetcher } from '../infra/fetchers/cheerio-fetcher';
import { LighthouseRunner } from './lighthouse-runner';
import { LinkChecker } from '../infra/fetchers/link-checker';
import { PageDataExtractor } from './page-data-extractor';
import { PlaywrightFetcher } from '../infra/fetchers/playwright-fetcher';
import { UrlValidator } from '../domain/url-validator';
import { CrawlOptions, CrawlResult } from '../domain/crawl-result.interface';
import { FetchResult } from '../domain/fetcher.interface';
import { PageData } from '../domain/page-data.interface';

const ZERO_CWV: CoreWebVitals = {
  lcpMs: 0,
  inpMs: 0,
  cls: 0,
  performanceScore: 0,
  accessibilityScore: 0,
  bestPracticesScore: 0,
  seoScore: 0,
};

/**
 * Main crawl entrypoint. Injected by both `CrawlerController` (sync gRPC)
 * and `CrawlerWorker` (async BullMQ). Lighthouse failures are non-fatal —
 * we still return PageData with zeroed CWV so the audit can continue.
 */
@Injectable()
export class CrawlerOrchestrator {
  private readonly logger = new Logger(CrawlerOrchestrator.name);

  constructor(
    private readonly validator: UrlValidator,
    private readonly cache: CacheService,
    private readonly cheerio: CheerioFetcher,
    private readonly playwright: PlaywrightFetcher,
    private readonly lighthouse: LighthouseRunner,
    private readonly extractor: PageDataExtractor,
    private readonly linkChecker: LinkChecker,
  ) {}

  /**
   * Fetch + analyze a single URL end-to-end.
   *
   * @param url Fully-qualified URL (validated before fetch).
   * @param options `forcePlaywright` skips Cheerio; `includeLighthouse=false`
   *   skips CWV; `timeoutMs`/`userAgent` forwarded to the chosen fetcher.
   */
  async crawl(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const startedAt = Date.now();
    await this.validator.validate(url);

    // 1. Cache check
    const cached = await this.cache.getCrawl<CrawlResult>(url);
    if (cached) {
      this.logger.log(`crawl cache HIT for ${url}`);
      return cached;
    }

    // 2. Fetch — Cheerio first unless forced
    let fetched: FetchResult;
    if (options.forcePlaywright) {
      fetched = await this.playwright.fetch(url, options);
    } else {
      fetched = await this.cheerio.fetch(url, options);
      if (fetched.isSpa) {
        this.logger.log(`SPA detected at ${url}, falling back to Playwright`);
        fetched = await this.playwright.fetch(url, options);
        fetched.isSpa = true;
      }
    }

    // 3. Lighthouse (default on) — runs both mobile + desktop
    const includeLh = options.includeLighthouse !== false;
    let cwvMobile: CoreWebVitals = ZERO_CWV;
    let cwvDesktop: CoreWebVitals | undefined;
    let lhDurationMs = 0;
    let lhCached = false;
    let lhDurationMsDesktop = 0;
    let lhCachedDesktop = false;
    if (includeLh) {
      try {
        const dual = await this.lighthouse.runBoth(url);
        cwvMobile = dual.mobile.cwv;
        lhDurationMs = dual.mobile.durationMs;
        lhCached = dual.mobile.cached;
        cwvDesktop = dual.desktop.cwv;
        lhDurationMsDesktop = dual.desktop.durationMs;
        lhCachedDesktop = dual.desktop.cached;
      } catch (err) {
        this.logger.warn(`Lighthouse failed for ${url}: ${(err as Error).message}`);
      }
    }

    // 4. Extract PageData
    const pageData = this.extractor.extract(url, fetched);

    // 5. F4 broken-link check (opt-in — expensive for N links)
    let linkChecks: LinkCheckResult[] | undefined;
    if (options.includeLinkChecks) {
      linkChecks = await this.runLinkChecks(pageData);
    }

    // 6. Build result and cache
    const result: CrawlResult = {
      pageData,
      cwvMetrics: cwvMobile,
      cwvMetricsDesktop: cwvDesktop,
      metadata: {
        crawlerType: fetched.fetcherType,
        isSpa: fetched.isSpa,
        crawlDurationMs: Date.now() - startedAt,
        lighthouseDurationMs: lhDurationMs,
        lighthouseCached: lhCached,
        lighthouseDurationMsDesktop: lhDurationMsDesktop,
        lighthouseCachedDesktop: lhCachedDesktop,
      },
      ...(linkChecks ? { linkChecks } : {}),
    };

    await this.cache.setCrawl(url, result);
    return result;
  }

  /**
   * Run broken-link checks and write the resolved status back onto
   * every matching `LinkInfo.statusCode` so existing rules (e.g.
   * ExternalLinksRule) can score on real HTTP status without a proto
   * change. Failure is non-fatal: we log and return undefined so the
   * rest of the crawl pipeline keeps working.
   */
  private async runLinkChecks(pageData: PageData): Promise<LinkCheckResult[] | undefined> {
    const links = [...pageData.internalLinks, ...pageData.externalLinks];
    const hrefs = links.map((l) => l.href);
    if (hrefs.length === 0) return [];

    try {
      const results = await this.linkChecker.checkAll(hrefs);
      const byHref = new Map(results.map((r) => [r.href, r]));
      for (const link of links) {
        const r = byHref.get(link.href);
        if (r) link.statusCode = r.status;
      }
      return results;
    } catch (err) {
      this.logger.warn(`link checks failed for ${pageData.url}: ${(err as Error).message}`);
      return undefined;
    }
  }
}
