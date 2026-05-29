import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BULLMQ_QUEUES } from '@repo/shared';
import { CacheService, REDIS_CLIENT } from './persistence/cache.service';
import { CheerioFetcher } from './infra/fetchers/cheerio-fetcher';
import { PlaywrightFetcher } from './infra/fetchers/playwright-fetcher';
import { BrowserPool } from './infra/fetchers/browser-pool';
import { LighthouseRunner } from './services/lighthouse-runner';
import { PageDataExtractor } from './services/page-data-extractor';
import { UrlValidator } from './domain/url-validator';
import { CrawlerOrchestrator } from './services/crawler.orchestrator';
import { CrawlerController } from './controllers/crawler.controller';
import { CrawlerWorker } from './controllers/crawler.worker';
import { LiteFetchController } from './controllers/lite-fetch.controller';
import { LiteFetchService } from './services/lite-fetch.service';
import { EventPublisher } from './services/event-publisher';
import { LlmsTxtFetcherService } from './infra/fetchers/llms-txt-fetcher.service';
import { PoliteFetcher } from './infra/fetchers/polite-fetcher';
import { LinkChecker } from './infra/fetchers/link-checker';
import { SitemapDiscovery } from './infra/sitemap/sitemap-discovery';
import { UndiciSitemapHttpClient } from './infra/sitemap/undici-sitemap-http-client';
import { SiteCrawlCounter } from './services/site-crawl-counter.service';
import { PageAuditResultStore } from './services/page-audit-result-store.service';
import { SiteCrawlStartWorker } from './controllers/site-crawl-start.worker';
import { UrlAuditWorker } from './controllers/url-audit.worker';
import { SiteCrawlAggregateWorker } from './controllers/site-crawl-aggregate.worker';
import { GrpcClientFactory } from './infra/grpc/grpc-client.factory';
import { AnalyzerGrpcClient } from './infra/grpc/analyzer-grpc-client';

const redisFactory = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService): Redis =>
    new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: Number(config.get('REDIS_PORT', 6379)),
      password: config.get('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: null,
    }),
  inject: [ConfigService],
};

const browserPoolFactory = {
  provide: BrowserPool,
  useFactory: () => new BrowserPool(Number(process.env.BROWSER_POOL_SIZE ?? 3)),
};

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: Number(config.get('REDIS_PORT', 6379)),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: BULLMQ_QUEUES.CRAWL_START },
      { name: BULLMQ_QUEUES.ANALYZE_START },
      { name: BULLMQ_QUEUES.KEYWORD_START },
      { name: BULLMQ_QUEUES.SITE_CRAWL_START },
      { name: BULLMQ_QUEUES.SITE_CRAWL_URL_AUDIT },
      { name: BULLMQ_QUEUES.SITE_CRAWL_AGGREGATE },
    ),
  ],
  controllers: [CrawlerController, LiteFetchController],
  providers: [
    redisFactory,
    browserPoolFactory,
    CacheService,
    UrlValidator,
    CheerioFetcher,
    PlaywrightFetcher,
    LighthouseRunner,
    PageDataExtractor,
    LlmsTxtFetcherService,
    CrawlerOrchestrator,
    EventPublisher,
    CrawlerWorker,
    LiteFetchService,
    // F1 site-wide crawl
    {
      provide: PoliteFetcher,
      useFactory: () => new PoliteFetcher(globalThis.fetch.bind(globalThis) as typeof fetch),
    },
    {
      provide: LinkChecker,
      useFactory: () => new LinkChecker(globalThis.fetch.bind(globalThis) as typeof fetch),
    },
    {
      provide: SitemapDiscovery,
      useFactory: (client: UndiciSitemapHttpClient) => new SitemapDiscovery(client),
      inject: [UndiciSitemapHttpClient],
    },
    UndiciSitemapHttpClient,
    SiteCrawlCounter,
    PageAuditResultStore,
    GrpcClientFactory,
    AnalyzerGrpcClient,
    SiteCrawlStartWorker,
    UrlAuditWorker,
    SiteCrawlAggregateWorker,
  ],
  exports: [CrawlerOrchestrator],
})
export class CrawlerModule {}
