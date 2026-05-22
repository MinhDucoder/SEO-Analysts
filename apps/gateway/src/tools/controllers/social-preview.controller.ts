import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { SocialPreviewRequestDto, SocialPreviewResponse } from '../dto/social-preview.dto';
import { SocialPreviewService } from '../services/social-preview.service';
import { ToolsQuotaService } from '../services/tools-quota.service';

@Controller('tools/social-preview')
@OptionalAuth()
export class SocialPreviewController {
  constructor(
    private readonly svc: SocialPreviewService,
    private readonly quota: ToolsQuotaService,
  ) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body() dto: SocialPreviewRequestDto,
    @Req() req: { user?: { id: string } },
    @Ip() ip: string,
  ): Promise<SocialPreviewResponse> {
    if (dto.mode === 'manual') {
      const { data, warnings } = this.svc.executeManual(dto);
      return { data, warnings, meta: { quotaUsed: 0, quotaLeft: 0, cached: false } };
    }
    const q = await this.quota.checkAndIncrement({ userId: req.user?.id, ip });
    const { data, warnings, cached } = await this.svc.executeFromUrl(dto);
    return { data, warnings, meta: { quotaUsed: q.used, quotaLeft: q.remaining, cached } };
  }
}
