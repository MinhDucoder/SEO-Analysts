/**
 * @file Feature module for the public third-party SEO API.
 *
 * Surface:
 *   - POST  /api/v1/public/check            — analyze content (API-key auth)
 *   - GET   /api/v1/public/rules            — rule catalog       (API-key auth)
 *   - GET   /api/v1/public/health           — liveness            (public)
 *   - POST  /api/v1/users/me/api-keys       — create              (JWT)
 *   - GET   /api/v1/users/me/api-keys       — list                (JWT)
 *   - DELETE /api/v1/users/me/api-keys/:id  — revoke              (JWT)
 *
 * Reuses gateway's existing Prisma + Redis + gRPC client infra. Does NOT
 * touch the audit flow — the module is purely additive.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { GrpcModule } from '../infra/grpc/grpc.module';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ContentExtractorService } from './services/content-extractor.service';
import { PublicApiRateLimitService } from './services/public-api-rate-limit.service';
import { PublicCheckService } from './services/public-check.service';
import { ApiKeysController } from './controllers/api-keys.controller';
import { PublicCheckController } from './controllers/public-check.controller';
import { PublicRulesController } from './controllers/public-rules.controller';
import { PublicHealthController } from './controllers/public-health.controller';

@Module({
  imports: [PrismaModule, RedisModule, GrpcModule],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    ContentExtractorService,
    PublicApiRateLimitService,
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
