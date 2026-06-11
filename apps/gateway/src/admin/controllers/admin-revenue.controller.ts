/**
 * @file Admin revenue endpoints (`/admin/revenue`) — JSON summary + CSV export.
 * Double-guarded: JWT + Roles(ADMIN). CSV streams through @Res like the audits
 * PDF export so the gateway stays the single JWT-checked download entry point.
 */
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { AdminRevenueService } from '../services/admin-revenue.service';
import { RevenueQueryDto } from '../dto/revenue-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/revenue')
export class AdminRevenueController {
  constructor(private readonly revenue: AdminRevenueService) {}

  @Get()
  @ApiOperation({ summary: 'Doanh thu theo ky lich (thang/quy/nam)' })
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.revenue.getRevenue(query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Xuat CSV doanh thu theo ky' })
  async exportCsv(@Query() query: RevenueQueryDto, @Res() res: Response) {
    const { filename, content } = await this.revenue.buildCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(content);
    return undefined;
  }
}
