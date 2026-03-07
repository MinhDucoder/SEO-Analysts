import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';

@Controller('api/audits')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  createAudit(
    @Body() dto: CreateAuditDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    const userId = req.user?.id || null;
    return this.auditService.createAudit(dto.url, userId);
  }

  @Get(':id')
  getAudit(@Param('id') id: string) {
    return this.auditService.getAudit(id);
  }

  @Get('history')
  getHistory(@Query('url') url: string) {
    return this.auditService.getAuditHistory(url);
  }
}
