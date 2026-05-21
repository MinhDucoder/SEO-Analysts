/**
 * @file Feature module for the public third-party SEO API.
 *
 * Surface: (unchanged — see Plan 1)
 * Plan 2 additions:
 *   - SuggestionEnricherService (LLM + cache + concurrency + degrade)
 *   - SeoSuggestChainFactory (lazy chain, disabled when ANTHROPIC_API_KEY absent)
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { GrpcModule } from '../infra/grpc/grpc.module';
import { BillingModule } from '../billing/billing.module';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ContentExtractorService } from './services/content-extractor.service';
import { PublicApiRateLimitService } from './services/public-api-rate-limit.service';
import { PublicCheckService } from './services/public-check.service';
import { SuggestionEnricherService } from './services/suggestion-enricher.service';
import { SeoSuggestChainFactory } from './services/seo-suggest-chain.factory';
import { ApiKeysController } from './controllers/api-keys.controller';
import { PublicCheckController } from './controllers/public-check.controller';
import { PublicRulesController } from './controllers/public-rules.controller';
import { PublicHealthController } from './controllers/public-health.controller';

@Module({
  imports: [PrismaModule, RedisModule, GrpcModule, ConfigModule, BillingModule],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    ContentExtractorService,
    PublicApiRateLimitService,
    {
      provide: SeoSuggestChainFactory,
      useFactory: (config: ConfigService) =>
        new SeoSuggestChainFactory({
          promptsDir: join(__dirname, 'prompts'),
          apiKey: config.get<string>('ANTHROPIC_API_KEY'),
          model: config.get<string>('LLM_MODEL') ?? 'claude-sonnet-4-6',
          defaultMaxTokens: Number(config.get<string>('LLM_MAX_TOKENS') ?? 2048),
        }),
      inject: [ConfigService],
    },
    SuggestionEnricherService,
    PublicCheckService,
  ],
  controllers: [
    ApiKeysController,
    PublicCheckController,
    PublicRulesController,
    PublicHealthController,
  ],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class PublicApiModule {}
