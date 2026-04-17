import { Injectable, Logger } from '@nestjs/common';
import { CoreWebVitals } from '@repo/shared';
import { CacheService } from '../persistence/cache.service';
import { CheerioFetcher } from '../infra/fetchers/cheerio-fetcher';
import { LighthouseRunner } from './lighthouse-runner';
import { PageDataExtractor } from './page-data-extractor';
import { PlaywrightFetcher } from '../infra/fetchers/playwright-fetcher';
import { UrlValidator } from '../domain/url-validator';
import { CrawlOptions, CrawlResult } from '../domain/crawl-result.interface';
import { FetchResult } from '../domain/fetcher.interface';

const ZERO_CWV: CoreWebVitals = {
  lcpMs: 0,
  inpMs: 0,
  cls: 0,
  performanceScore: 0,
  accessibilityScore: 0,
  bestPracticesScore: 0,
  seoScore: 0,
};

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
  ) {}

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

    // 3. Lighthouse (default on)
    const includeLh = options.includeLighthouse !== false;
    let cwv: CoreWebVitals = ZERO_CWV;
    let lhDurationMs = 0;
    let lhCached = false;
    if (includeLh) {
      try {
        const lh = await this.lighthouse.run(url);
        cwv = lh.cwv;
        lhDurationMs = lh.durationMs;
        lhCached = lh.cached;
      } catch (err) {
        this.logger.warn(`Lighthouse failed for ${url}: ${(err as Error).message}`);
      }
    }

    // 4. Extract PageData
    const pageData = this.extractor.extract(url, fetched);

    // 5. Build result and cache
    const result: CrawlResult = {
      pageData,
      cwvMetrics: cwv,
      metadata: {
        crawlerType: fetched.fetcherType,
        isSpa: fetched.isSpa,
        crawlDurationMs: Date.now() - startedAt,
        lighthouseDurationMs: lhDurationMs,
        lighthouseCached: lhCached,
      },
    };

    await this.cache.setCrawl(url, result);
    return result;
  }
}
