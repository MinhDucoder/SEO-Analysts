import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { FeatureFlag, UserRole } from '@repo/shared';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { FeatureNotAvailableError } from '../../billing/domain/billing.errors';

@Injectable()
export class PlanGuard implements CanActivate {
  private readonly logger = new Logger(PlanGuard.name);

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

    // Admin god-mode: bypass every feature gate.
    if (req.user?.role === UserRole.ADMIN) return true;

    if (!enabled) {
      if (userId) {
        // would-block log for observability before enforcement is flipped on
        this.logger.debug(`[billing-flag-off] would-enforce ${flag} for user ${userId}`);
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
