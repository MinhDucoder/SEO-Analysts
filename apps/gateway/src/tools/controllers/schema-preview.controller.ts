import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { SchemaPreviewRequestDto, SchemaPreviewResponse } from '../dto/schema-preview.dto';
import { SchemaPreviewService } from '../services/schema-preview.service';
import { ToolsQuotaService } from '../services/tools-quota.service';

@Controller('tools/schema-preview')
@OptionalAuth()
export class SchemaPreviewController {
  constructor(
    private readonly svc: SchemaPreviewService,
    private readonly quota: ToolsQuotaService,
  ) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body() dto: SchemaPreviewRequestDto,
    @Req() req: { user?: { id: string } },
    @Ip() ip: string,
  ): Promise<SchemaPreviewResponse> {
    if (dto.mode === 'paste') {
      const { data, warnings } = this.svc.executePaste(dto.raw ?? '');
      return { data, warnings, meta: { quotaUsed: 0, quotaLeft: 0, cached: false } };
    }
    const q = await this.quota.checkAndIncrement({ userId: req.user?.id, ip });
    const { data, warnings, cached } = await this.svc.executeFromUrl(dto.fetchUrl!);
    return { data, warnings, meta: { quotaUsed: q.used, quotaLeft: q.remaining, cached } };
  }
}
