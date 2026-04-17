/**
 * @file Output contract of `CrawlerOrchestrator.crawl()` —
 * combines extracted page data, Lighthouse CWV, and crawl metadata.
 * `cwvMetrics` is the mobile run (primary for SEO per Google's
 * mobile-first indexing); `cwvMetricsDesktop` is the optional
 * desktop run used for side-by-side reporting.
 */
import { CoreWebVitals } from '@repo/shared';
import { PageData } from './page-data.interface';

export interface CrawlMetadata {
  crawlerType: 'cheerio' | 'playwright';
  isSpa: boolean;
  crawlDurationMs: number;
  lighthouseDurationMs: number;
  lighthouseCached: boolean;
  lighthouseDurationMsDesktop?: number;
  lighthouseCachedDesktop?: boolean;
}

export interface CrawlResult {
  pageData: PageData;
  cwvMetrics: CoreWebVitals;
  cwvMetricsDesktop?: CoreWebVitals;
  metadata: CrawlMetadata;
}

export interface CrawlOptions {
  forcePlaywright?: boolean;
  includeLighthouse?: boolean;
  userAgent?: string;
  timeoutMs?: number;
}
