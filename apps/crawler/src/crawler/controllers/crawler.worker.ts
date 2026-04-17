/**
 * @file BullMQ worker for `crawl.start` — the pipeline's front door.
 * On success it fans out to `analyze.start` + `keyword.start` (parallel)
 * and publishes progress ticks so the Gateway can update clients.
 */
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditStatus, BULLMQ_QUEUES } from '@repo/shared';
import { CrawlerOrchestrator } from '../services/crawler.orchestrator';
import { EventPublisher } from '../services/event-publisher';

interface CrawlJobData {
  auditId: string;
  url: string;
  targetKeyword?: string;
  options?: {
    forcePlaywright?: boolean;
    includeLighthouse?: boolean;
    userAgent?: string;
    timeoutMs?: number;
  };
}

@Processor(BULLMQ_QUEUES.CRAWL_START)
export class CrawlerWorker extends WorkerHost {
  private readonly logger = new Logger(CrawlerWorker.name);

  constructor(
    private readonly orchestrator: CrawlerOrchestrator,
    private readonly publisher: EventPublisher,
    @InjectQueue(BULLMQ_QUEUES.ANALYZE_START) private readonly analyzeQueue: Queue,
    @InjectQueue(BULLMQ_QUEUES.KEYWORD_START) private readonly keywordQueue: Queue,
  ) {
    super();
  }

  /**
   * Handle one crawl job. Progress events are published on success
   * (10% start, 33% crawl-done); on failure `crawl.failed` is emitted
   * and the error is re-thrown so BullMQ records the failure for retries.
   */
  async process(job: Job<CrawlJobData>): Promise<void> {
    const { auditId, url, targetKeyword, options } = job.data;
    this.logger.log(`processing crawl.start job=${job.id} audit=${auditId} url=${url}`);

    try {
      await this.publisher.publishProgress(auditId, 10, 'crawl-start', AuditStatus.CRAWLING, 'Crawl started');

      const result = await this.orchestrator.crawl(url, options ?? {});

      await this.publisher.publishProgress(
        auditId,
        33,
        'crawl-done',
        AuditStatus.CRAWLING,
        `Fetched via ${result.metadata.crawlerType} in ${result.metadata.crawlDurationMs}ms`,
      );
      await this.publisher.publishCrawlDone(auditId, result);

      // Choreography: enqueue both downstream steps in parallel.
      // Report Service is responsible for the "wait for both" Redis counter.
      await Promise.all([
        this.analyzeQueue.add(
          'analyze',
          { auditId, pageData: result.pageData, targetKeyword },
          { removeOnComplete: true, removeOnFail: false },
        ),
        this.keywordQueue.add(
          'keyword',
          {
            auditId,
            url,
            textContent: result.pageData.textContent,
            title: result.pageData.title,
            h1Text: result.pageData.h1Tags?.[0] ?? '',
            metaDescription: result.pageData.metaDescription,
            targetKeyword,
          },
          { removeOnComplete: true, removeOnFail: false },
        ),
      ]);

      this.logger.log(`enqueued analyze.start + keyword.start for audit=${auditId}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`crawl failed audit=${auditId}: ${error.message}`, error.stack);
      await this.publisher.publishCrawlFailed(auditId, error);
      throw error; // let BullMQ mark the job failed
    }
  }
}
