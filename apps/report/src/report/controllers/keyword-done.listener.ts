/**
 * @file Redis pub/sub subscriber for `keyword.done`.
 * Counterpart to AnalyzeDoneListener — second event to arrive triggers
 * `report.start` (order of analyze vs keyword is not guaranteed).
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';
import { WaitForBothService } from '../services/wait-for-both.service';

@Injectable()
export class KeywordDoneListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeywordDoneListener.name);
  private readonly CHANNEL = 'keyword.done';

  constructor(
    private readonly redis: RedisService,
    private readonly waitSvc: WaitForBothService,
  ) {}

  async onModuleInit(): Promise<void> {
    const sub = this.redis.subscriber();
    await sub.subscribe(this.CHANNEL);
    sub.on('message', async (channel, raw) => {
      if (channel !== this.CHANNEL) return;
      try {
        const payload = JSON.parse(raw) as { auditId?: string };
        if (!payload?.auditId) {
          this.logger.warn(`keyword.done missing auditId, skipping`);
          return;
        }
        await this.waitSvc.recordKeywordDone(payload.auditId, payload);
        this.logger.log(`recorded keyword.done for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle keyword.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
