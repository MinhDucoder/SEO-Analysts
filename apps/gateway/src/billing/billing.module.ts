import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './controllers/plans.controller';
import { PlansService } from './services/plans.service';
import { SubscriptionService } from './services/subscription.service';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [PlansController],
  providers: [PlansService, SubscriptionService],
  exports: [PlansService, SubscriptionService],
})
export class BillingModule {}
