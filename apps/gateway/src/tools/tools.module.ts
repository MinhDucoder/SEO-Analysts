import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../infra/redis/redis.module';
import { RedisService } from '../infra/redis/redis.service';
import { BillingModule } from '../billing/billing.module';
import { LiteFetcherService } from './services/lite-fetcher.service';
import { ToolsQuotaService } from './services/tools-quota.service';
import { GooglePreviewService } from './services/google-preview.service';
import { GooglePreviewController } from './controllers/google-preview.controller';
import { SocialPreviewService } from './services/social-preview.service';
import { SocialPreviewController } from './controllers/social-preview.controller';
import { FaviconCheckerService } from './services/favicon-checker.service';
import { FaviconCheckerController } from './controllers/favicon-checker.controller';
import { SchemaPreviewService } from './services/schema-preview.service';
import { SchemaPreviewController } from './controllers/schema-preview.controller';
import { SitemapValidatorService } from './services/sitemap-validator.service';
import { SitemapValidatorController } from './controllers/sitemap-validator.controller';

@Module({
  imports: [ConfigModule, RedisModule, BillingModule],
  controllers: [
    GooglePreviewController,
    SocialPreviewController,
    FaviconCheckerController,
    SchemaPreviewController,
    SitemapValidatorController,
  ],
  providers: [
    // Factory wiring so LiteFetcher gets the real Redis client (10-min cache).
    {
      provide: LiteFetcherService,
      useFactory: (redis: RedisService) => new LiteFetcherService({}, redis),
      inject: [RedisService],
    },
    ToolsQuotaService,
    GooglePreviewService,
    SocialPreviewService,
    FaviconCheckerService,
    SchemaPreviewService,
    SitemapValidatorService,
  ],
  exports: [LiteFetcherService, ToolsQuotaService],
})
export class ToolsModule {}
