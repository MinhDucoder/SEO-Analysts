import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, AuthModule],
  controllers: [PlansController, SubscriptionsController, PaymentIntentsController, CassoWebhookController],
  providers: [PlansService, SubscriptionService, EntitlementService, PaymentIntentService, CassoReconcilerService],
  exports: [PlansService, SubscriptionService, EntitlementService, PaymentIntentService, CassoReconcilerService],
})
export class BillingModule {}
