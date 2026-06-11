/**
 * @file POST /api/v1/public/check — third-party SEO content check.
 * Guarded by ApiKey (Bearer sk_...). Applies per-key/per-IP rate limits
 * and sets standard X-RateLimit-* headers on success + Retry-After on 429.
 * Marked @Public() to bypass the app-wide JwtAuthGuard.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard, RequestWithApiKey } from '../guards/api-key.guard';
import { PublicCheckService } from '../services/public-check.service';
import { PublicApiRateLimitService } from '../services/public-api-rate-limit.service';
import { PublicCheckRequestDto } from '../dto/public-check-request.dto';
import { PublicApiExceptionFilter } from '../filters/public-api-exception.filter';
import { EntitlementService } from '../../billing/services/entitlement.service';

@ApiTags('Public SEO Check')
@ApiBearerAuth('apiKey')
@UseFilters(PublicApiExceptionFilter)
@Controller('public')
export class PublicCheckController {
  constructor(
    private readonly svc: PublicCheckService,
    private readonly rl: PublicApiRateLimitService,
    private readonly entitlement: EntitlementService,
  ) {}

  @Post('check')
  @Public()
  @UseGuards(ApiKeyGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Analyze content for SEO issues (sync).' })
  @ApiOkResponse({ description: 'Analysis complete' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async check(
    @Body() dto: PublicCheckRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authed = req as RequestWithApiKey;
    if (!authed.apiKey) {
      throw new HttpException(
        { statusCode: 401, code: 'MISSING_API_KEY', message: 'API key required' },
        401,
      );
    }
    // `req.ip` is populated correctly because `trust proxy` is configured
    // in main.ts. Reading the raw X-Forwarded-For header here would allow
    // any client to spoof its IP and bypass per-IP rate limits.
    const ip = req.ip ?? '0.0.0.0';

    const isAdmin = await this.entitlement.isAdmin(authed.apiKey.userId);
    const rlRes = await this.rl.enforce({ apiKeyId: authed.apiKey.id, ip, bypass: isAdmin });
    res.setHeader('X-RateLimit-Limit-Minute', '20');
    res.setHeader('X-RateLimit-Remaining-Minute', String(rlRes.remaining.minute));
    res.setHeader('X-RateLimit-Limit-Day', '500');
    res.setHeader('X-RateLimit-Remaining-Day', String(rlRes.remaining.day));

    if (!rlRes.allowed) {
      res.setHeader('Retry-After', String(rlRes.retryAfterSeconds));
      throw new HttpException(
        {
          statusCode: 429,
          error: 'RateLimitExceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          retryAfterSeconds: rlRes.retryAfterSeconds,
        },
        429,
      );
    }

    const response = await this.svc.execute(dto, {
      apiKeyId: authed.apiKey.id,
      userId: authed.apiKey.userId,
      ip,
      usage: { remaining: rlRes.remaining, resetAt: rlRes.resetAt },
    });
    res.setHeader('X-Request-Id', response.meta.requestId);
    res.setHeader('X-Rule-Version', response.meta.ruleVersion);
    return response;
  }
}
