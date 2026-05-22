import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './controllers/plans.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { PaymentIntentsController } from './controllers/payment-intents.controller';
import { CassoWebhookController } from './controllers/casso-webhook.controller';
import { PlansService } from './services/plans.service';
import { SubscriptionService } from './services/subscription.service';
import { EntitlementService } from './services/entitlement.service';
import { PaymentIntentService } from './services/payment-intent.service';
import { CassoReconcilerService } from './services/casso-reconciler.service';
import { QuotaCounterService } from './services/quota-counter.service';
import { ExpiryCron } from './services/expiry.cron';
import { DevAutoConfirmCron } from './services/dev-autoconfirm.cron';
import { PlanGuard } from '../common/guards/plan.guard';
import { QuotaGuard } from '../common/guards/quota.guard';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), PrismaModule, RedisModule, AuthModule],
  controllers: [PlansController, SubscriptionsController, PaymentIntentsController, CassoWebhookController],
  providers: [PlansService, SubscriptionService, EntitlementService, PaymentIntentService, CassoReconcilerService, QuotaCounterService, ExpiryCron, DevAutoConfirmCron, PlanGuard, QuotaGuard],
  exports: [PlansService, SubscriptionService, EntitlementService, PaymentIntentService, CassoReconcilerService, QuotaCounterService, PlanGuard, QuotaGuard],
})
export class BillingModule {}
