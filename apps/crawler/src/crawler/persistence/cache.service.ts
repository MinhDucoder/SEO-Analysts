import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Redis } from 'ioredis';
import { CACHE_TTL, REDIS_KEYS } from '@repo/shared';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  hashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }

  async getCrawl<T = unknown>(url: string): Promise<T | null> {
    const key = REDIS_KEYS.crawlCache(this.hashUrl(url));
    return this.safeGet<T>(key);
  }

  async setCrawl(url: string, value: unknown): Promise<void> {
    const key = REDIS_KEYS.crawlCache(this.hashUrl(url));
    await this.redis.setex(key, CACHE_TTL.CRAWL_SECONDS, JSON.stringify(value));
  }

  async getLighthouse<T = unknown>(url: string): Promise<T | null> {
    const key = REDIS_KEYS.lighthouseCache(this.hashUrl(url));
    return this.safeGet<T>(key);
  }

  async setLighthouse(url: string, value: unknown): Promise<void> {
    const key = REDIS_KEYS.lighthouseCache(this.hashUrl(url));
    await this.redis.setex(key, CACHE_TTL.LIGHTHOUSE_SECONDS, JSON.stringify(value));
  }

  private async safeGet<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Corrupted cache entry at ${key}: ${(err as Error).message}`);
      return null;
    }
  }
}
