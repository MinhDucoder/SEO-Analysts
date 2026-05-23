import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from '../services/subscription.service';
import { PLAN_FEATURES } from '../domain/plan-features';

@Controller('me/subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Get()
  async current(@CurrentUser('id') userId: string) {
    const sub = await this.subscriptions.getCurrent(userId);
    if (!sub) {
      return {
        planCode: 'free',
        status: 'active',
        expiresAt: null,
        isAdminGranted: false,
        features: PLAN_FEATURES.free,
      };
    }
    return { ...sub, features: PLAN_FEATURES[sub.planCode] };
  }

  @Post('cancel')
  async cancel(@CurrentUser('id') userId: string) {
    await this.subscriptions.cancel(userId);
    return { ok: true };
  }
}
