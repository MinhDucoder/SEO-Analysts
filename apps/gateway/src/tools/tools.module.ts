import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../infra/redis/redis.module';
import { RedisService } from '../infra/redis/redis.service';
import { BillingModule } from '../billing/billing.module';
import { LiteFetcherService } from './services/lite-fetcher.service';
import { ToolsQuotaService } from './services/tools-quota.service';

@Module({
  imports: [ConfigModule, RedisModule, BillingModule],
  providers: [
    // Factory wiring so LiteFetcher gets the real Redis client (10-min cache).
    {
      provide: LiteFetcherService,
      useFactory: (redis: RedisService) => new LiteFetcherService({}, redis),
      inject: [RedisService],
    },
    ToolsQuotaService,
  ],
  // Controllers + per-tool services are added in Phase 2 as each tool is wired.
  exports: [LiteFetcherService, ToolsQuotaService],
})
export class ToolsModule {}
