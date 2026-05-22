import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import {
  SitemapValidatorRequestDto,
  SitemapValidatorResponse,
} from '../dto/sitemap-validator.dto';
import { SitemapValidatorService } from '../services/sitemap-validator.service';
import { ToolsQuotaService } from '../services/tools-quota.service';

@Controller('tools/sitemap-validator')
@OptionalAuth()
export class SitemapValidatorController {
  constructor(
    private readonly svc: SitemapValidatorService,
    private readonly quota: ToolsQuotaService,
  ) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body() dto: SitemapValidatorRequestDto,
    @Req() req: { user?: { id: string } },
    @Ip() ip: string,
  ): Promise<SitemapValidatorResponse> {
    const q = await this.quota.checkAndIncrement({ userId: req.user?.id, ip });
    const { data, warnings, cached } = await this.svc.execute(dto.siteUrl, dto.options);
    return { data, warnings, meta: { quotaUsed: q.used, quotaLeft: q.remaining, cached } };
  }
}
