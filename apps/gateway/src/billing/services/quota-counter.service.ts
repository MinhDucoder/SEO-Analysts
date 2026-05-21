import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';

export interface QuotaResult {
  allowed: boolean;
  used: number;
  remaining: number;
  resetAt: Date;
}

@Injectable()
export class QuotaCounterService {
  constructor(private readonly redis: RedisService) {}

  async consume(userId: string, dimension: string, limit: number, increment = 1): Promise<QuotaResult> {
    const { key, resetAt } = this.key(userId, dimension);
    if (limit <= 0) {
      const used = Number((await this.redis.client.get(key)) ?? 0);
      return { allowed: false, used, remaining: 0, resetAt };
    }
    const usedBefore = Number((await this.redis.client.get(key)) ?? 0);
    if (usedBefore >= limit) {
      return { allowed: false, used: usedBefore, remaining: 0, resetAt };
    }
    const usedAfter = await this.redis.client.incrby(key, increment);
    if (usedBefore === 0) {
      await this.redis.client.expire(key, 32 * 86_400);
    }
    return {
      allowed: usedAfter <= limit,
      used: usedAfter,
      remaining: Math.max(0, limit - usedAfter),
      resetAt,
    };
  }

  async peek(userId: string, dimension: string, limit: number): Promise<QuotaResult> {
    const { key, resetAt } = this.key(userId, dimension);
    const used = Number((await this.redis.client.get(key)) ?? 0);
    return {
      allowed: used < limit,
      used,
      remaining: Math.max(0, limit - used),
      resetAt,
    };
  }

  private key(userId: string, dimension: string): { key: string; resetAt: Date } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ym = `${y}-${m}`;
    const resetAt = new Date(Date.UTC(y, now.getUTCMonth() + 1, 1, 0, 0, 0));
    return { key: `quota:${userId}:${dimension}:${ym}`, resetAt };
  }
}
