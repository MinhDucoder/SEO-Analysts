/**
 * @file BullMQ producers for the audit pipeline entry points.
 * - `crawl.start`   → single-URL audit (Tier 0)
 * - `site-crawl.start` → F1 site-wide audit (fan-outs to per-URL jobs)
 * Both use `jobId: <kind>-<auditId>` so BullMQ dedupes rapid retries.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';

export interface CrawlStartPayload {
  auditId: string;
  url: string;
  options?: {
    targetKeyword?: string;
  };
}

export interface SiteCrawlStartPayload {
  auditId: string;
  rootUrl: string;
  maxUrls?: number;
  targetKeyword?: string;
}

@Injectable()
export class AuditQueueProducer {
  private readonly logger = new Logger(AuditQueueProducer.name);

  constructor(
    @InjectQueue(BULLMQ_QUEUES.CRAWL_START) private readonly crawlQueue: Queue,
    @InjectQueue(BULLMQ_QUEUES.SITE_CRAWL_START) private readonly siteCrawlQueue: Queue,
  ) {}

  async enqueueCrawlStart(payload: CrawlStartPayload): Promise<void> {
    const job = await this.crawlQueue.add('crawl.start', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
      jobId: `crawl-${payload.auditId}`,
    });
    this.logger.log(`Enqueued crawl.start job ${job.id} for audit ${payload.auditId}`);
  }

  async enqueueSiteCrawlStart(payload: SiteCrawlStartPayload): Promise<void> {
    const job = await this.siteCrawlQueue.add('site-crawl.start', payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
      jobId: `site-crawl-${payload.auditId}`,
    });
    this.logger.log(`Enqueued site-crawl.start job ${job.id} for audit ${payload.auditId}`);
  }
}
