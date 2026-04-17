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
import { EventPublisher } from './services/event-publisher';

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
    ),
  ],
  controllers: [CrawlerController],
  providers: [
    redisFactory,
    browserPoolFactory,
    CacheService,
    UrlValidator,
    CheerioFetcher,
    PlaywrightFetcher,
    LighthouseRunner,
    PageDataExtractor,
    CrawlerOrchestrator,
    EventPublisher,
    CrawlerWorker,
  ],
  exports: [CrawlerOrchestrator],
})
export class CrawlerModule {}
