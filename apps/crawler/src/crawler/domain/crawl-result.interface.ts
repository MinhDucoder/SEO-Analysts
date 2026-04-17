/**
 * @file Output contract of `CrawlerOrchestrator.crawl()` —
 * combines extracted page data, Lighthouse CWV, and crawl metadata.
 */
import { CoreWebVitals } from '@repo/shared';
import { PageData } from './page-data.interface';

export interface CrawlMetadata {
  crawlerType: 'cheerio' | 'playwright';
  isSpa: boolean;
  crawlDurationMs: number;
  lighthouseDurationMs: number;
  lighthouseCached: boolean;
}

export interface CrawlResult {
  pageData: PageData;
  cwvMetrics: CoreWebVitals;
  metadata: CrawlMetadata;
}

export interface CrawlOptions {
  forcePlaywright?: boolean;
  includeLighthouse?: boolean;
  userAgent?: string;
  timeoutMs?: number;
}
