/**
 * @file Orchestrates rate-limit bucket checks for /public/check. Wraps
 * the generic `RateLimiterService` (Redis sliding window) with the
 * public-API-specific bucket keys + limits. Three buckets evaluated
 * in order: per-IP (anti-brute) → per-key minute → per-key day.
 */
import { Injectable } from '@nestjs/common';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';
import { RedisService } from '../../infra/redis/redis.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_RATE_LIMITS } from '@repo/shared';

export interface EnforceInput {
  apiKeyId: string;
  ip: string;
  /** Admin god-mode: skip all buckets (per-IP, per-key minute, per-key day). */
  bypass?: boolean;
}

export interface EnforceResult {
  allowed: boolean;
  remaining: { minute: number; day: number };
  retryAfterSeconds: number;
  resetAt: { minute: string; day: string };
}

@Injectable()
export class PublicApiRateLimitService {
  constructor(
    private readonly rl: RateLimiterService,
    private readonly redis: RedisService,
  ) {}

  async enforce({ apiKeyId, ip, bypass }: EnforceInput): Promise<EnforceResult> {
    const now = Date.now();
    const resetAt = {
      minute: new Date(now + 60_000).toISOString(),
      day: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
    };

    // Admin god-mode: no public-API rate limiting.
    if (bypass) {
      return {
        allowed: true,
        remaining: {
          minute: PUBLIC_API_RATE_LIMITS.PER_KEY_MINUTE,
          day: PUBLIC_API_RATE_LIMITS.PER_KEY_DAY,
        },
        retryAfterSeconds: 0,
        resetAt,
      };
    }

    const ipR = await this.rl.consume(
      PUBLIC_API_REDIS_KEYS.rateLimitIp(ip),
      PUBLIC_API_RATE_LIMITS.PER_IP_MINUTE,
      60,
    );
    if (!ipR.allowed) {
      return {
        allowed: false,
        remaining: { minute: 0, day: 0 },
        retryAfterSeconds: ipR.retryAfterSeconds,
        resetAt,
      };
    }

    const minR = await this.rl.consume(
      PUBLIC_API_REDIS_KEYS.rateLimitMinute(apiKeyId),
      PUBLIC_API_RATE_LIMITS.PER_KEY_MINUTE,
      60,
    );
    if (!minR.allowed) {
      return {
        allowed: false,
        remaining: { minute: 0, day: 0 },
        retryAfterSeconds: minR.retryAfterSeconds,
        resetAt,
      };
    }

    const dayR = await this.rl.consume(
      PUBLIC_API_REDIS_KEYS.rateLimitDay(apiKeyId),
      PUBLIC_API_RATE_LIMITS.PER_KEY_DAY,
      24 * 3600,
    );
    if (!dayR.allowed) {
      return {
        allowed: false,
        remaining: { minute: minR.remaining, day: 0 },
        retryAfterSeconds: dayR.retryAfterSeconds,
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining: { minute: minR.remaining, day: dayR.remaining },
      retryAfterSeconds: 0,
      resetAt,
    };
  }

  /** Try to acquire one LLM slot for this API key. Returns false if cap reached. */
  async acquireConcurrency(apiKeyId: string): Promise<boolean> {
    const key = PUBLIC_API_REDIS_KEYS.rateLimitConcurrency(apiKeyId);
    const count = await this.redis.client.incr(key);
    await this.redis.client.expire(key, 30);
    if (count > PUBLIC_API_RATE_LIMITS.PER_KEY_CONCURRENCY) {
      await this.redis.client.decr(key);
      return false;
    }
    return true;
  }

  /** Release one LLM slot. Called in `finally` blocks after enrichment. */
  async releaseConcurrency(apiKeyId: string): Promise<void> {
    const key = PUBLIC_API_REDIS_KEYS.rateLimitConcurrency(apiKeyId);
    await this.redis.client.decr(key);
  }
}
