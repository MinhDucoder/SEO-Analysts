import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { FeatureFlag } from '@repo/shared';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { FeatureNotAvailableError } from '../../billing/domain/billing.errors';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const flag = this.reflector.getAllAndOverride<FeatureFlag>(REQUIRE_FEATURE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!flag) return true;

    const enabled = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;

    if (!enabled) {
      if (userId) {
        // would-block log for observability before enforcement is flipped on
        console.debug(`[billing-flag-off] would-enforce ${flag} for user ${userId}`);
      }
      return true;
    }

    if (!userId) throw new FeatureNotAvailableError(flag, 'guest');

    const d = await this.entitlement.hasFeature(userId, flag);
    if (!d.allowed) {
      const plan = await this.entitlement.getEffectivePlan(userId);
      throw new FeatureNotAvailableError(flag, plan);
    }
    return true;
  }
}
