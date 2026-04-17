/**
 * @file BullMQ worker for `report.start` (enqueued by WaitForBothService
 * after both analyze.done + keyword.done arrive). Publishes `audit.failed`
 * on failure so the Gateway can update the audit status UI.
 */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BULLMQ_QUEUES, AuditStatus } from '@repo/shared';
import { ReportService } from '../services/report.service';
import { WaitForBothService } from '../services/wait-for-both.service';
import { RedisService } from '../../infra/redis/redis.service';

interface ReportStartJob {
  auditId: string;
  url?: string;
  domain?: string;
}

@Processor(BULLMQ_QUEUES.REPORT_START)
export class ReportWorker extends WorkerHost {
  private readonly logger = new Logger(ReportWorker.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly waitSvc: WaitForBothService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<ReportStartJob>): Promise<{ reportId: string; finalScore: number }> {
    const { auditId } = job.data;
    this.logger.log(`processing report.start for ${auditId}`);

    const ZERO_CWV = {
      lcpMs: 0, inpMs: 0, cls: 0,
      performanceScore: 0, accessibilityScore: 0, bestPracticesScore: 0, seoScore: 0,
    };

    // Pull analyze (required) + crawl (optional — present when the crawler
    // published crawl.done after this service started subscribing). Crawl
    // carries the real Lighthouse CWV for both mobile and desktop; analyze
    // carries url/domain fallback for older pipelines.
    const { analyze } = await this.waitSvc.readBoth(auditId);
    const analyzePayload = analyze as Record<string, unknown>;
    const crawlPayload = await this.waitSvc.readCrawl(auditId);

    const url = job.data.url
      ?? (crawlPayload?.['pageData'] as Record<string, unknown> | undefined)?.['url'] as string
      ?? (analyzePayload['url'] as string)
      ?? '';
    const domain = job.data.domain
      ?? (analyzePayload['domain'] as string)
      ?? (url ? new URL(url).hostname : '');

    const cwv = (crawlPayload?.['cwvMetrics'] as Record<string, number>) ?? ZERO_CWV;
    const cwvDesktop = crawlPayload?.['cwvMetricsDesktop'] as Record<string, number> | undefined;

    await this.publishProgress(auditId, 85, 'reporting');

    const report = await this.reportService.generateFromPipeline({
      auditId,
      url,
      domain,
      cwv: cwv as any,
      cwvDesktop: cwvDesktop as any,
    });

    return { reportId: report.id, finalScore: Number(report.finalScore) };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`report.start ${job?.id} failed: ${err.message}`);
    if (job?.data?.auditId) {
      await this.redis.client().publish(
        'audit.failed',
        JSON.stringify({
          auditId: job.data.auditId,
          error: `Report generation failed: ${err.message}`,
        }),
      );
    }
  }

  private async publishProgress(auditId: string, progress: number, stage: string): Promise<void> {
    const event = {
      auditId,
      status: AuditStatus.REPORTING,
      progress,
      stage,
    };
    await this.redis.client().publish('audit.progress', JSON.stringify(event));
  }
}
