/**
 * @file Redis pub/sub subscriber for `analyze.done`.
 * On each event, records the payload in WaitForBothService — which
 * bumps the per-audit counter and may enqueue `report.start`.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';
import { WaitForBothService } from '../services/wait-for-both.service';

@Injectable()
export class AnalyzeDoneListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyzeDoneListener.name);
  private readonly CHANNEL = 'analyze.done';

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
          this.logger.warn(`analyze.done missing auditId, skipping`);
          return;
        }
        await this.waitSvc.recordAnalyzeDone(payload.auditId, payload);
        this.logger.log(`recorded analyze.done for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle analyze.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
