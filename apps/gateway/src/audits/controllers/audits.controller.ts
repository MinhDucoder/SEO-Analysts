/**
 * @file REST endpoints under `/audits` — CRUD + status + export (PDF) +
 * share-link management + audit-vs-audit comparison.
 * All routes require a valid JWT (JwtAuthGuard applied at class level).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { AuditsService } from '../services/audits.service';
import { CreateAuditDto } from '../dto/create-audit.dto';
import { ListAuditsQuery } from '../dto/list-audits.query';
import { CompareAuditsQuery } from '../dto/compare-audits.query';
import { ReportGrpcClient } from '../../infra/grpc/report.client';

@ApiTags('audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audits')
export class AuditsController {
  constructor(
    private readonly audits: AuditsService,
    private readonly reportClient: ReportGrpcClient,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Tao audit moi' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAuditDto) {
    return this.audits.createAudit(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liet ke audit' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditsQuery) {
    return this.audits.listAudits(user.id, query);
  }

  @Get('compare')
  @ApiOperation({ summary: 'So sanh 2 audit' })
  async compare(@CurrentUser() user: AuthenticatedUser, @Query() query: CompareAuditsQuery) {
    // Ownership check: ensure user owns both
    await Promise.all([
      this.audits.getAuditDetail(user.id, user.role, query.audit1),
      this.audits.getAuditDetail(user.id, user.role, query.audit2),
    ]);
    return this.reportClient.compareReports(query.audit1, query.audit2);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet audit' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.audits.getAuditDetail(user.id, user.role, id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Trang thai audit' })
  status(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.audits.getStatus(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoa audit' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.audits.deleteAudit(user.id, user.role, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Tai PDF report' })
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    await this.audits.getAuditDetail(user.id, user.role, id);
    await this.audits.ensureCompleted(id);
    const { pdfContent, filename } = await this.reportClient.generatePdf(id);
    // gRPC returns the PDF as `bytes` (Buffer); stream it through so the
    // gateway stays the single JWT-checked entry point for downloads.
    const buf = Buffer.isBuffer(pdfContent) ? pdfContent : Buffer.from(pdfContent);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
    return undefined;
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tao share link' })
  async share(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.audits.getAuditDetail(user.id, user.role, id);
    return this.reportClient.createShareLink(id, user.id);
  }

  @Delete(':id/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Thu hoi share link' })
  async revokeShare(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.audits.getAuditDetail(user.id, user.role, id);
    await this.reportClient.revokeShareLink(id, user.id);
  }
}
