/**
 * @file BullMQ worker for `analyze.start`. Runs the SEO analysis,
 * caches result in Redis for the Report service, and bumps the
 * per-audit completed-steps set + publishes `analyze.done`.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { BULLMQ_QUEUES, REDIS_KEYS, AuditStatus } from '@repo/shared';
import { AnalyzerService } from '../services/analyzer.service';
import { PageData } from '../domain/page-data.interface';

interface AnalyzeJobData {
  auditId: string;
  pageData: PageData;
  targetKeyword?: string;
}

@Processor(BULLMQ_QUEUES.ANALYZE_START)
export class AnalyzerWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyzerWorker.name);
  private readonly publisher: Redis;

  constructor(private readonly analyzer: AnalyzerService) {
    super();
    this.publisher = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async process(job: Job<AnalyzeJobData>): Promise<void> {
    const { auditId, pageData, targetKeyword } = job.data;
    this.logger.log(`Processing analyze.start job ${job.id} audit=${auditId}`);

    const result = await this.analyzer.analyze(auditId, pageData, targetKeyword);

    // Cache analyze result under the shared Redis key so the orchestrator can aggregate
    await this.publisher.setex(
      REDIS_KEYS.auditAnalyzeResult(auditId),
      3600,
      JSON.stringify({
        auditId,
        overallScore: result.overallScore,
        classification: result.classification,
        ruleResults: result.ruleResults,
        categoryScores: result.categoryScores,
      }),
    );

    // Mark step complete (orchestrator uses this set to detect pipeline completion)
    await this.publisher.sadd(REDIS_KEYS.auditCompletedSteps(auditId), 'analyze');

    // Publish analyze.done event
    await this.publisher.publish(
      'analyze.done',
      JSON.stringify({
        auditId,
        status: AuditStatus.ANALYZING,
        stage: 'analyze',
        progress: 66,
        message: `Analyzer finished: score ${result.overallScore}`,
      }),
    );
  }
}
