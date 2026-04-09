import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditStatus, BULLMQ_QUEUES } from '@repo/shared';
import { CrawlerOrchestrator } from './crawler.orchestrator';
import { EventPublisher } from './event-publisher';

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
            textContent: result.pageData.textContent,
            title: result.pageData.title,
            metaDescription: result.pageData.metaDescription,
            h1Tags: result.pageData.h1Tags,
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
