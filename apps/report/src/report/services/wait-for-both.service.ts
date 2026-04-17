/**
 * @file Choreography primitive — counts analyze.done + keyword.done for
 * one audit. Second increment hits 2, triggers `report.start` enqueue.
 * Counter key TTL guards against stuck pipelines.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES, CACHE_TTL, REDIS_KEYS } from '@repo/shared';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class WaitForBothService {
  private readonly logger = new Logger(WaitForBothService.name);
  private readonly REQUIRED_STEPS = 2;

  constructor(
    private readonly redis: RedisService,
    @InjectQueue(BULLMQ_QUEUES.REPORT_START) private readonly reportQueue: Queue,
  ) {}

  async recordAnalyzeDone(auditId: string, payload: unknown): Promise<void> {
    await this.redis
      .client()
      .setex(REDIS_KEYS.auditAnalyzeResult(auditId), CACHE_TTL.AUDIT_RESULT_SECONDS, JSON.stringify(payload));
    await this.maybeTrigger(auditId);
  }

  async recordKeywordDone(auditId: string, payload: unknown): Promise<void> {
    await this.redis
      .client()
      .setex(REDIS_KEYS.auditKeywordResult(auditId), CACHE_TTL.AUDIT_RESULT_SECONDS, JSON.stringify(payload));
    await this.maybeTrigger(auditId);
  }

  private async maybeTrigger(auditId: string): Promise<void> {
    const count = await this.redis.client().incr(REDIS_KEYS.auditCompletedSteps(auditId));
    this.logger.log(`audit ${auditId} completed_steps=${count}/${this.REQUIRED_STEPS}`);
    if (count >= this.REQUIRED_STEPS) {
      await this.reportQueue.add(
        'report.start',
        { auditId },
        { attempts: 2, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: true },
      );
      this.logger.log(`enqueued report.start for ${auditId}`);
    }
  }

  async readBoth(auditId: string): Promise<{ analyze: unknown; keywords: unknown }> {
    const [a, k] = await Promise.all([
      this.redis.client().get(REDIS_KEYS.auditAnalyzeResult(auditId)),
      this.redis.client().get(REDIS_KEYS.auditKeywordResult(auditId)),
    ]);
    if (!a || !k) {
      throw new Error(`Missing payloads for audit ${auditId}: analyze=${!!a} keywords=${!!k}`);
    }
    return { analyze: JSON.parse(a), keywords: JSON.parse(k) };
  }

  /** Read the cached crawl.done payload (CWV mobile + desktop). Returns
   *  null if absent, e.g. when the crawl event was published before this
   *  service started subscribing. Caller must handle the null path. */
  async readCrawl(auditId: string): Promise<Record<string, unknown> | null> {
    const raw = await this.redis.client().get(REDIS_KEYS.auditCrawlResult(auditId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async cleanup(auditId: string): Promise<void> {
    await this.redis
      .client()
      .del(
        REDIS_KEYS.auditAnalyzeResult(auditId),
        REDIS_KEYS.auditKeywordResult(auditId),
        REDIS_KEYS.auditCrawlResult(auditId),
        REDIS_KEYS.auditCompletedSteps(auditId),
      );
  }
}
