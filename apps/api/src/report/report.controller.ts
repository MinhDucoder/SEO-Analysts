import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';

@Controller('api/audits/:id/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  getReport(@Param('id') id: string) {
    return this.reportService.getReport(id);
  }

  @Get('pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.reportService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="seo-audit-${id}.pdf"`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }
}
