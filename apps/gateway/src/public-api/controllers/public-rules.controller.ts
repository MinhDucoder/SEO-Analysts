/**
 * @file GET /api/v1/public/rules — rule catalog proxied from
 * seo-analyzer's ListRules gRPC. Cached in Redis (10m TTL) per language.
 * API-key protected.
 */
import { Controller, Get, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { AnalyzerGrpcClient } from '../../infra/grpc/analyzer.client';
import { RedisService } from '../../infra/redis/redis.service';
import {
  PUBLIC_API_REDIS_KEYS,
  PUBLIC_API_CACHE_TTL,
} from '@repo/shared';
import { PublicApiExceptionFilter } from '../filters/public-api-exception.filter';

@ApiTags('Public SEO Check')
@ApiBearerAuth('apiKey')
@UseFilters(PublicApiExceptionFilter)
@Controller('public')
export class PublicRulesController {
  constructor(
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly redis: RedisService,
  ) {}

  @Get('rules')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'List available SEO rules with metadata.' })
  async list() {
    const cacheKey = PUBLIC_API_REDIS_KEYS.rulesList('vi');
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // fall through on cache miss/err
    }
    const rules = await this.analyzer.listRules();
    const payload = { ruleVersion: '1.2.0', rules };
    try {
      await this.redis.client.setex(
        cacheKey,
        PUBLIC_API_CACHE_TTL.RULES_LIST_SECONDS,
        JSON.stringify(payload),
      );
    } catch {
      // best-effort cache write
    }
    return payload;
  }
}
