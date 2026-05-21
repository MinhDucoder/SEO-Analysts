import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { FeatureFlag } from '@repo/shared';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { FeatureNotAvailableError } from '../../billing/domain/billing.errors';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const flag = this.reflector.getAllAndOverride<FeatureFlag>(REQUIRE_FEATURE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!flag) return true;

    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new FeatureNotAvailableError(flag, 'guest');

    const d = await this.entitlement.hasFeature(userId, flag);
    if (!d.allowed) {
      const plan = await this.entitlement.getEffectivePlan(userId);
      throw new FeatureNotAvailableError(flag, plan);
    }
    return true;
  }
}
