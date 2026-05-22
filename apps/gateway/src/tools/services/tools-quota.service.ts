import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PLAN_FEATURES } from '@repo/shared';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';

const ANON_LIMIT = 3;
const ANON_WINDOW_SECONDS = 3600;
const SOFT_CAP = 1000;

export interface ToolsQuotaResult {
  scope: 'user-day' | 'ip-hour';
  used: number;
  limit: number;
  remaining: number;
  resetAt?: Date;
  softCap?: boolean;
}

/**
 * Gates tool fetches: anonymous callers get a per-IP sliding-window rate limit;
 * authenticated callers consume their daily `tools_fetches_daily` quota (with a
 * soft cap for unlimited plans). When billing is disabled, authed users are
 * unmetered.
 */
@Injectable()
export class ToolsQuotaService {
  constructor(
    private readonly entitlement: EntitlementService,
    private readonly counter: QuotaCounterService,
    private readonly rateLimiter: RateLimiterService,
    private readonly config: ConfigService,
  ) {}

  async checkAndIncrement(ctx: { userId?: string; ip: string }): Promise<ToolsQuotaResult> {
    if (!ctx.userId) {
      const r = await this.rateLimiter.consume(
        `rate_limit:tools:anon:${ctx.ip}`,
        ANON_LIMIT,
        ANON_WINDOW_SECONDS,
      );
      if (!r.allowed) {
        throw new HttpException(
          { code: 'TOOLS_ANON_RATE_LIMIT', message: 'Sign in for more requests' },
          429,
        );
      }
      return {
        scope: 'ip-hour',
        used: ANON_LIMIT - r.remaining,
        limit: ANON_LIMIT,
        remaining: r.remaining,
      };
    }

    const enabled = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
    if (!enabled) {
      return { scope: 'user-day', used: 0, limit: -1, remaining: -1 };
    }

    const plan = await this.entitlement.getEffectivePlan(ctx.userId);
    const planLimit = PLAN_FEATURES[plan].tools_fetches_daily;
    const effectiveLimit = planLimit === -1 ? SOFT_CAP : planLimit;
    const r = await this.counter.consume(ctx.userId, 'tools_fetches_daily', effectiveLimit, 1);
    if (!r.allowed) {
      throw new HttpException(
        {
          code: planLimit === -1 ? 'TOOLS_SOFT_CAP' : 'TOOLS_QUOTA_EXCEEDED',
          message:
            planLimit === -1 ? 'Daily soft cap reached' : 'Daily quota exceeded — upgrade plan',
        },
        429,
      );
    }
    return {
      scope: 'user-day',
      used: r.used,
      limit: effectiveLimit,
      remaining: r.remaining,
      resetAt: r.resetAt,
      softCap: planLimit === -1,
    };
  }
}
