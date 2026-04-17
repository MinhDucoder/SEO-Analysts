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

    // Read both payloads up-front to derive url + domain + cwv from the analyze snapshot
    const { analyze } = await this.waitSvc.readBoth(auditId);
    const analyzePayload = analyze as Record<string, unknown>;
    const url = job.data.url ?? (analyzePayload['url'] as string) ?? '';
    const domain = job.data.domain ?? (analyzePayload['domain'] as string) ?? '';
    const cwv = (analyzePayload['cwv'] as Record<string, number>) ?? {
      lcpMs: 0,
      inpMs: 0,
      cls: 0,
      performanceScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      seoScore: 0,
    };

    await this.publishProgress(auditId, 85, 'reporting');

    const report = await this.reportService.generateFromPipeline({
      auditId,
      url,
      domain,
      cwv: cwv as any,
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
