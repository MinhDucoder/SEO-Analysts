/**
 * @file BullMQ worker for the `keyword.start` queue — main async entrypoint.
 * Triggered by the Crawler after `crawl.done`; publishes `keyword.done`
 * on success so Report service can aggregate.
 */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { KeywordAnalyzerService } from '../services/keyword-analyzer.service';
import { EventPublisher } from '../services/event.publisher';
import type { KeywordAnalyzeInput } from '../dto/keyword-request.dto';

/**
 * Job payload is produced by the Gateway when it fans out after the
 * crawler completes. Shape mirrors KeywordRequest proto + carries the
 * raw text extracted by the crawler.
 */
interface KeywordStartJobData {
  auditId: string;
  url: string;
  textContent: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language?: string;
}

/**
 * Processes keyword jobs with concurrency 4 (stateless pipeline step, so
 * safe to parallelize — bottleneck is CPU for tokenization on large pages).
 */
@Processor(BULLMQ_QUEUES.KEYWORD_START, { concurrency: 4 })
export class KeywordWorker extends WorkerHost {
  private readonly logger = new Logger(KeywordWorker.name);

  constructor(
    private readonly analyzer: KeywordAnalyzerService,
    private readonly events: EventPublisher,
  ) {
    super();
  }

  /**
   * Handle a single keyword job. Result is cached in Redis; `keyword.done`
   * is always published (with status=failed on error) so the Report
   * service's "wait for both" counter never stalls.
   */
  async process(job: Job<KeywordStartJobData>): Promise<void> {
    const { auditId } = job.data;
    this.logger.log(`Processing keyword.start audit=${auditId} jobId=${job.id}`);

    try {
      const input: KeywordAnalyzeInput = {
        auditId: job.data.auditId,
        url: job.data.url,
        textContent: job.data.textContent,
        title: job.data.title,
        h1Text: job.data.h1Text,
        metaDescription: job.data.metaDescription,
        targetKeyword: job.data.targetKeyword,
        language: job.data.language,
      };
      const result = await this.analyzer.analyze(input);
      await this.events.cacheResult(auditId, result);
      await this.events.publishDone({ auditId, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Keyword analysis failed audit=${auditId}: ${message}`);
      await this.events.publishDone({ auditId, status: 'failed', error: message });
      throw err; // let BullMQ record the failure for retries
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<KeywordStartJobData>) {
    this.logger.log(`Completed audit=${job.data.auditId} jobId=${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<KeywordStartJobData>, err: Error) {
    this.logger.error(`Failed audit=${job.data.auditId} jobId=${job.id}: ${err.message}`);
  }
}
