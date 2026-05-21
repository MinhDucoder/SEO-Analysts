/**
 * @file Redis pub/sub subscriber for `report.done`. On each event, enqueues
 * a BullMQ `ai-suggest.start` job (when SEO_AI_ENABLED). Gated here so the
 * worker (and its LLM provider) never runs when the feature is off.
 */
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { RedisService } from '../../../infra/redis/redis.service';

@Injectable()
export class AiSuggestListener implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AiSuggestListener.name);
  private readonly CHANNEL = 'report.done';

  constructor(
    private readonly redis: RedisService,
    @InjectQueue(BULLMQ_QUEUES.AI_SUGGEST_START)
    private readonly queue: Queue,
  ) {}

  // Subscribe after ALL modules initialized — this module is nested under
  // ReportModule and would otherwise run before RedisService.onModuleInit
  // populates the subscriber client.
  async onApplicationBootstrap(): Promise<void> {
    const sub = this.redis.subscriber();
    await sub.subscribe(this.CHANNEL);
    sub.on('message', async (channel, raw) => {
      if (channel !== this.CHANNEL) return;
      try {
        const payload = JSON.parse(raw) as { auditId?: string; reportId?: string };
        if (!payload?.auditId || !payload?.reportId) {
          this.logger.warn(`report.done missing fields, skipping`);
          return;
        }
        if (process.env['SEO_AI_ENABLED'] !== 'true') {
          this.logger.log(`ai-suggest disabled, skipping auditId=${payload.auditId}`);
          return;
        }
        await this.queue.add(
          'ai-suggest',
          { auditId: payload.auditId, reportId: payload.reportId },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        );
        this.logger.log(`enqueued ai-suggest.start for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle report.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
