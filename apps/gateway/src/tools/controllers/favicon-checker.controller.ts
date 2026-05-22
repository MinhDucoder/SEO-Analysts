import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { FaviconCheckerRequestDto, FaviconCheckerResponse } from '../dto/favicon-checker.dto';
import { FaviconCheckerService } from '../services/favicon-checker.service';
import { ToolsQuotaService } from '../services/tools-quota.service';

@Controller('tools/favicon-checker')
@OptionalAuth()
export class FaviconCheckerController {
  constructor(
    private readonly svc: FaviconCheckerService,
    private readonly quota: ToolsQuotaService,
  ) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body() dto: FaviconCheckerRequestDto,
    @Req() req: { user?: { id: string } },
    @Ip() ip: string,
  ): Promise<FaviconCheckerResponse> {
    const q = await this.quota.checkAndIncrement({ userId: req.user?.id, ip });
    const { data, warnings, cached } = await this.svc.execute(dto.url);
    return { data, warnings, meta: { quotaUsed: q.used, quotaLeft: q.remaining, cached } };
  }
}
