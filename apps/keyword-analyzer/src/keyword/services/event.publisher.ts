/**
 * @file Emits pipeline events for the keyword-analysis step.
 * Writes the result to Redis cache + publishes `keyword.done` so the
 * Report service can proceed with aggregation.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_KEYS } from '@repo/shared';

export interface KeywordDoneEvent {
  auditId: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Owns a dedicated Redis connection for caching + pub/sub. Separate
 * from BullMQ's own Redis client to avoid blocking the queue loop.
 */
@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPublisher.name);
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /**
   * Caches the keyword result as JSON under `audit:{id}:keyword_result`
   * with a 1-hour TTL so Report service can read it later.
   */
  async cacheResult(auditId: string, payload: unknown): Promise<void> {
    const key = REDIS_KEYS.auditKeywordResult(auditId);
    await this.client.set(key, JSON.stringify(payload), 'EX', 3600);
  }

  /**
   * Publishes the `keyword.done` event on the `keyword.done` Pub/Sub channel.
   * Report service's KeywordDoneListener subscribes to this channel.
   */
  async publishDone(event: KeywordDoneEvent): Promise<void> {
    const message = JSON.stringify(event);
    const subs = await this.client.publish('keyword.done', message);
    this.logger.log(`Published keyword.done audit=${event.auditId} status=${event.status} subscribers=${subs}`);
  }
}
