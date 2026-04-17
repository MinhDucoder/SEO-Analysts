/**
 * @file Redis pub/sub fan-out for the crawl stage:
 * `audit.progress` (live UI ticks), `crawl.done` / `crawl.failed`
 * (consumed by Gateway's ProgressSubscriber + Report listener).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AuditStatus } from '@repo/shared';
import { REDIS_CLIENT } from '../persistence/cache.service';
import { CrawlResult } from '../domain/crawl-result.interface';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publishCrawlDone(auditId: string, result: CrawlResult): Promise<void> {
    const payload = {
      auditId,
      pageData: result.pageData,
      cwvMetrics: result.cwvMetrics,
      metadata: result.metadata,
      textContent: result.pageData.textContent,
    };
    await this.redis.publish('crawl.done', JSON.stringify(payload));
    this.logger.log(`published crawl.done audit=${auditId}`);
  }

  async publishCrawlFailed(auditId: string, error: Error): Promise<void> {
    await this.redis.publish(
      'crawl.failed',
      JSON.stringify({
        auditId,
        status: AuditStatus.FAILED,
        error: error.message,
        name: error.name,
      }),
    );
    this.logger.warn(`published crawl.failed audit=${auditId} err=${error.message}`);
  }

  async publishProgress(
    auditId: string,
    progress: number,
    stage: string,
    status: AuditStatus = AuditStatus.CRAWLING,
    message?: string,
  ): Promise<void> {
    await this.redis.publish(
      'audit.progress',
      JSON.stringify({ auditId, status, progress, stage, message }),
    );
  }
}
