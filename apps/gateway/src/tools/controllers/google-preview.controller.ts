import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { GooglePreviewRequestDto, GooglePreviewResponse } from '../dto/google-preview.dto';
import { GooglePreviewService } from '../services/google-preview.service';
import { ToolsQuotaService } from '../services/tools-quota.service';

@Controller('tools/google-preview')
@OptionalAuth()
export class GooglePreviewController {
  constructor(
    private readonly svc: GooglePreviewService,
    private readonly quota: ToolsQuotaService,
  ) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body() dto: GooglePreviewRequestDto,
    @Req() req: { user?: { id: string } },
    @Ip() ip: string,
  ): Promise<GooglePreviewResponse> {
    if (dto.mode === 'manual') {
      const { data, warnings } = this.svc.executeManual(dto);
      return { data, warnings, meta: { quotaUsed: 0, quotaLeft: 0, cached: false } };
    }
    // url mode — charge quota then fetch. (v1: cache hits still charge; see plan notes.)
    const q = await this.quota.checkAndIncrement({ userId: req.user?.id, ip });
    const { data, warnings, cached } = await this.svc.executeFromUrl(dto);
    return {
      data,
      warnings,
      meta: { quotaUsed: q.used, quotaLeft: q.remaining, cached },
    };
  }
}
