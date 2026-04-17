import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BULLMQ_QUEUES } from '@repo/shared';
import { CacheService, REDIS_CLIENT } from './cache.service';
import { CheerioFetcher } from './cheerio-fetcher';
import { PlaywrightFetcher } from './playwright-fetcher';
import { BrowserPool } from './browser-pool';
import { LighthouseRunner } from './lighthouse-runner';
import { PageDataExtractor } from './page-data-extractor';
import { UrlValidator } from './url-validator';
import { CrawlerOrchestrator } from './crawler.orchestrator';
import { CrawlerController } from './crawler.controller';
import { CrawlerWorker } from './crawler.worker';
import { EventPublisher } from './event-publisher';

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
