import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateScheduledAuditDto } from '../dto/create-scheduled-audit.dto';
import { ScheduledAuditsService } from '../services/scheduled-audits.service';

@ApiTags('scheduled-audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduled-audits')
export class ScheduledAuditsController {
  constructor(private readonly svc: ScheduledAuditsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateScheduledAuditDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateScheduledAuditDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.svc.list(req.user.id);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.get(req.user.id, id);
  }

  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.toggle(req.user.id, id, false);
  }

  @Patch(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.toggle(req.user.id, id, true);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    await this.svc.delete(req.user.id, id);
  }
}
