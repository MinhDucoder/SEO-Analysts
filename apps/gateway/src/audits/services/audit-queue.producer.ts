/**
 * @file BullMQ producer for `crawl.start` — the entry point that kicks
 * off the whole audit pipeline. Uses `jobId: crawl-<auditId>` so BullMQ
 * dedupes rapid retries against the same audit.
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

@Injectable()
export class AuditQueueProducer {
  private readonly logger = new Logger(AuditQueueProducer.name);

  constructor(@InjectQueue(BULLMQ_QUEUES.CRAWL_START) private readonly queue: Queue) {}

  async enqueueCrawlStart(payload: CrawlStartPayload): Promise<void> {
    const job = await this.queue.add('crawl.start', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
      jobId: `crawl-${payload.auditId}`,
    });
    this.logger.log(`Enqueued crawl.start job ${job.id} for audit ${payload.auditId}`);
  }
}
