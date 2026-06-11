/**
 * @file Prisma wrapper for Report + related tables.
 * `createFullReport` wraps Report + ReportKeyword + ReportCwv writes
 * in a single transaction so a partial insert never escapes.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CoreWebVitals } from '@repo/shared';
import { AggregatedReport } from '../domain/report-payload.interface';
import { KeywordResultItem } from '../domain/keyword-result.interface';

export interface CreateFullReportInput {
  auditId: string;
  aggregated: AggregatedReport;
  keywords: KeywordResultItem[];
  cwv: CoreWebVitals;
  cwvDesktop?: CoreWebVitals;
  geoScore?: number | null;
  geoVersion?: string | null;
}

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFullReport(input: CreateFullReportInput) {
    const { auditId, aggregated, keywords, cwv, cwvDesktop, geoScore, geoVersion } = input;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          auditId,
          url: aggregated.url,
          domain: aggregated.domain,
          finalScore: aggregated.finalScore,
          classification: aggregated.classification,
          totalIssues: aggregated.totalIssues,
          criticalIssues: aggregated.criticalIssues,
          warnIssues: aggregated.warnIssues,
          passCount: aggregated.passCount,
          analysisSnapshot: aggregated.analysisSnapshot as any,
          cwvSnapshot: aggregated.cwvSnapshot as any,
          geoScore: geoScore ?? null,
          geoVersion: geoVersion ?? null,
        },
      });

      if (keywords.length > 0) {
        await tx.reportKeyword.createMany({
          data: keywords.map((k) => ({
            reportId: report.id,
            keyword: k.keyword,
            frequency: k.frequency,
            densityPercent: k.densityPercent,
            inTitle: k.inTitle,
            inH1: k.inH1,
            inFirstParagraph: k.inFirstParagraph,
            inMetaDescription: k.inMetaDescription,
            rank: k.rank,
            isTarget: k.isTarget,
          })),
        });
      }

      await tx.reportCwv.create({
        data: {
          reportId: report.id,
          lcpMs: cwv.lcpMs,
          inpMs: cwv.inpMs,
          cls: cwv.cls,
          performanceScore: cwv.performanceScore,
          accessibilityScore: cwv.accessibilityScore,
          bestPracticesScore: cwv.bestPracticesScore,
          lighthouseSeoScore: cwv.seoScore,
          ...(cwvDesktop
            ? {
                desktopLcpMs: cwvDesktop.lcpMs,
                desktopInpMs: cwvDesktop.inpMs,
                desktopCls: cwvDesktop.cls,
                desktopPerformanceScore: cwvDesktop.performanceScore,
                desktopAccessibilityScore: cwvDesktop.accessibilityScore,
                desktopBestPracticesScore: cwvDesktop.bestPracticesScore,
                desktopLighthouseSeoScore: cwvDesktop.seoScore,
              }
            : {}),
        },
      });

      return report;
    });
  }

  async findByAuditId(auditId: string) {
    return this.prisma.report.findUnique({
      where: { auditId },
      include: { keywords: true, cwv: true, shareLink: true },
    });
  }

  async findManyByAuditIds(auditIds: string[]) {
    return this.prisma.report.findMany({
      where: { auditId: { in: auditIds } },
      include: { keywords: true, cwv: true },
    });
  }
}
