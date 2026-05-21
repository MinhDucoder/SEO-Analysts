import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './controllers/plans.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { PlansService } from './services/plans.service';
import { SubscriptionService } from './services/subscription.service';
import { EntitlementService } from './services/entitlement.service';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionService, EntitlementService],
  exports: [PlansService, SubscriptionService, EntitlementService],
})
export class BillingModule {}
