import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';
import { PLAN_FEATURES, QuotaDimension } from '@repo/shared';
import { REQUIRE_QUOTA_KEY } from '../decorators/require-quota.decorator';
import { QuotaExceededError } from '../../billing/domain/billing.errors';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
    private readonly counter: QuotaCounterService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ dimension: QuotaDimension; increment: number }>(
      REQUIRE_QUOTA_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!meta) return true;

    const enabled = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;

    if (!enabled) {
      if (userId) {
        // would-block log for observability before enforcement is flipped on
        console.debug(`[billing-flag-off] would-enforce quota:${meta.dimension} for user ${userId}`);
      }
      return true;
    }

    const res = ctx.switchToHttp().getResponse();
    if (!userId) throw new QuotaExceededError(meta.dimension, 0, new Date());

    const plan = await this.entitlement.getEffectivePlan(userId);
    const limit = PLAN_FEATURES[plan][meta.dimension] as number;
    const r = await this.counter.consume(userId, meta.dimension, limit, meta.increment);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(r.remaining));
    res.setHeader('X-Quota-Reset', r.resetAt.toISOString());

    if (!r.allowed) throw new QuotaExceededError(meta.dimension, limit, r.resetAt);
    return true;
  }
}
