import { Injectable } from '@nestjs/common';
import { REDIS_KEYS } from '@repo/shared';
import { RedisService } from './redis.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Sliding-window rate limit using a Redis sorted set.
   * @param key the bucket key (e.g. rate_limit:audits:{userId})
   * @param limit max events allowed
   * @param windowSeconds window size in seconds
   */
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const minScore = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

    const pipeline = this.redis.client.multi();
    pipeline.zremrangebyscore(key, 0, minScore);
    pipeline.zcard(key);
    pipeline.zadd(key, now, member);
    pipeline.expire(key, windowSeconds + 1);
    const results = await pipeline.exec();

    if (!results) {
      return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds };
    }
    const count = (results?.[1]?.[1] as number) ?? 0;

    if (count >= limit) {
      // Remove the just-added member because we are over the limit
      await this.redis.client.zrem(key, member);
      const oldest = await this.redis.client.zrange(key, 0, 0, 'WITHSCORES');
      const oldestScore = oldest[1] ? Number(oldest[1]) : now;
      const retryAfter = Math.max(1, Math.ceil((oldestScore + windowMs - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
    }
    return { allowed: true, remaining: limit - count - 1, retryAfterSeconds: 0 };
  }

  auditBucket(userId: string): string {
    return `${REDIS_KEYS.rateLimit(userId)}:audits`;
  }

  loginBucket(email: string): string {
    return `rate_limit:login:${email.toLowerCase()}`;
  }

  registerBucket(ip: string): string {
    return `rate_limit:register:${ip}`;
  }
}
