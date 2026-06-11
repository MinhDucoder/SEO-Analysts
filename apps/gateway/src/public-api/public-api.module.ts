/**
 * @file Feature module for the public third-party SEO API.
 *
 * Surface: (unchanged — see Plan 1)
 * Plan 2 additions:
 *   - SuggestionEnricherService (LLM + cache + concurrency + degrade)
 *   - SeoSuggestChainFactory (lazy chain, config-driven provider via
 *     SEO_AI_* — default Gemini; disabled when SEO_AI_ENABLED is not "true")
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
import { INSTALL_BIND_MODE, readInstallBindMode } from './config/install-bind-mode';
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
      useFactory: (config: ConfigService) => {
        // Config-driven provider (default Gemini) — mirrors the report
        // service's ai-suggest wiring so one SEO_AI_* env set drives both.
        const provider =
          (config.get<string>('SEO_AI_PROVIDER') as 'anthropic' | 'gemini') ?? 'gemini';
        const apiKey =
          provider === 'gemini'
            ? config.get<string>('GEMINI_API_KEY')
            : config.get<string>('ANTHROPIC_API_KEY');
        return new SeoSuggestChainFactory({
          promptsDir: join(__dirname, 'prompts'),
          enabled: config.get<string>('SEO_AI_ENABLED') === 'true',
          provider,
          apiKey,
          model: config.get<string>('SEO_AI_MODEL') ?? 'gemini-2.5-flash',
          // /public/check sends ALL of a page's issues in one call, so the
          // output JSON is large. 2048 truncates it for ~15+ issues (no closing
          // fence → parse fails → silent degrade to template). Default high.
          defaultMaxTokens: Number(config.get<string>('LLM_MAX_TOKENS') ?? 8192),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: INSTALL_BIND_MODE,
      useFactory: (config: ConfigService) => readInstallBindMode(config),
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
