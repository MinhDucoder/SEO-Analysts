/**
 * @file Redis pub/sub subscriber for `crawl.done`. Caches the crawl
 * payload (CWV mobile + desktop) under `REDIS_KEYS.auditCrawlResult`
 * so `ReportWorker` can read it when assembling the final report.
 * Cached with the same TTL as analyze/keyword snapshots.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CACHE_TTL, REDIS_KEYS } from '@repo/shared';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class CrawlDoneListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrawlDoneListener.name);
  private readonly CHANNEL = 'crawl.done';

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    const sub = this.redis.subscriber();
    await sub.subscribe(this.CHANNEL);
    sub.on('message', async (channel, raw) => {
      if (channel !== this.CHANNEL) return;
      try {
        const payload = JSON.parse(raw) as { auditId?: string };
        if (!payload?.auditId) {
          this.logger.warn(`crawl.done missing auditId, skipping`);
          return;
        }
        await this.redis
          .client()
          .setex(
            REDIS_KEYS.auditCrawlResult(payload.auditId),
            CACHE_TTL.AUDIT_RESULT_SECONDS,
            raw,
          );
        this.logger.log(`cached crawl.done for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle crawl.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
