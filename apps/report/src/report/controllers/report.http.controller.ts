import { Controller, Get, Param, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from '../services/report.service';
import { PdfGenerator } from '../../infra/pdf/pdf.generator';
import { AnalyzeResult } from '../domain/analyze-result.interface';

@Controller('audits')
export class ReportHttpController {
  constructor(
    private readonly reportService: ReportService,
    private readonly pdf: PdfGenerator,
  ) {}

  @Get(':id/export')
  async export(
    @Param('id') auditId: string,
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
  ): Promise<void> {
    if (format !== 'pdf') {
      throw new BadRequestException(`Unsupported export format: ${format}`);
    }

    const report = await this.reportService.getReport(auditId);
    const snapshot = report.analysisSnapshot as unknown as AnalyzeResult;
    const out = await this.pdf.generate({
      auditId: report.auditId,
      url: report.url,
      domain: report.domain,
      finalScore: Number(report.finalScore),
      classification: report.classification,
      analyze: snapshot,
      keywords: (report as any).keywords ?? [],
      cwv: report.cwvSnapshot as any,
      categoryScores: snapshot.categoryScores,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.setHeader('Content-Length', String(out.pdf.length));
    res.end(out.pdf);
  }
}
