/**
 * @file Orchestrates rate-limit bucket checks for /public/check. Wraps
 * the generic `RateLimiterService` (Redis sliding window) with the
 * public-API-specific bucket keys + limits. Three buckets evaluated
 * in order: per-IP (anti-brute) → per-key minute → per-key day.
 */
import { Injectable } from '@nestjs/common';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_RATE_LIMITS } from '@repo/shared';

export interface EnforceInput {
  apiKeyId: string;
  ip: string;
}

export interface EnforceResult {
  allowed: boolean;
  remaining: { minute: number; day: number };
  retryAfterSeconds: number;
  resetAt: { minute: string; day: string };
}

@Injectable()
export class PublicApiRateLimitService {
  constructor(private readonly rl: RateLimiterService) {}

  async enforce({ apiKeyId, ip }: EnforceInput): Promise<EnforceResult> {
    const now = Date.now();
    const resetAt = {
      minute: new Date(now + 60_000).toISOString(),
      day: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
    };

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
}
