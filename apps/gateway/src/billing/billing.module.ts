import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './controllers/plans.controller';
import { PlansService } from './services/plans.service';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class BillingModule {}
