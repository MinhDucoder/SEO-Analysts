/**
 * @file BullMQ worker for `ai-suggest.start` (enqueued by AiSuggestListener
 * on `report.done`). Generates per-rule AI suggestions and publishes
 * `audit.suggestions.done`. NEVER publishes audit.failed — AI suggestion
 * failure must not roll back audit completion.
 */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { AiSuggestService } from '../services/ai-suggest.service';
import { RedisService } from '../../../infra/redis/redis.service';

interface AiSuggestJob {
  auditId: string;
  reportId: string;
}

@Processor(BULLMQ_QUEUES.AI_SUGGEST_START)
export class AiSuggestWorker extends WorkerHost {
  private readonly logger = new Logger(AiSuggestWorker.name);

  constructor(
    private readonly svc: AiSuggestService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<AiSuggestJob>): Promise<{ count: number }> {
    const { auditId } = job.data;
    this.logger.log(`processing ai-suggest.start for ${auditId}`);
    const suggestions = await this.svc.generate(auditId);
    await this.redis.client().publish(
      'audit.suggestions.done',
      JSON.stringify({ auditId, count: suggestions.length }),
    );
    return { count: suggestions.length };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`ai-suggest.start ${job?.id} failed: ${err.message}`);
    // Intentional: do NOT publish audit.failed. AI suggestion failure must
    // never roll back audit completion. After BullMQ exhausts retries, the
    // Report.aiSuggestions column stays NULL — UI treats that as "not generated".
  }
}
