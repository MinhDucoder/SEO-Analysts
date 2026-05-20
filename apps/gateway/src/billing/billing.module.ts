import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class BillingModule {}
