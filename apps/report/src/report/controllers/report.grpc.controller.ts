/**
 * @file gRPC surface of the report service — called by Gateway for all
 * report-related operations (get, compare, share, PDF, revoke).
 * Proto: `packages/proto/report/v1/report.proto`.
 */
import { Controller, Logger, NotFoundException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ReportService } from '../services/report.service';
import { ReportComparator } from '../services/report.comparator';
import { ShareLinkService } from '../services/share-link.service';
import { PdfGenerator } from '../../infra/pdf/pdf.generator';
import { AnalyzeResult } from '../domain/analyze-result.interface';
import { KeywordResult } from '../domain/keyword-result.interface';

@Controller()
export class ReportGrpcController {
  private readonly logger = new Logger(ReportGrpcController.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly comparator: ReportComparator,
    private readonly shareLink: ShareLinkService,
    private readonly pdf: PdfGenerator,
  ) {}

  @GrpcMethod('ReportService', 'GenerateReport')
  async generateReport(req: any) {
    const report = await this.reportService.generateDirect({
      auditId: req.auditId,
      url: req.url,
      domain: req.domain,
      analyze: this.mapAnalyze(req.analysis, req.auditId, req.url, req.domain),
      keywords: this.mapKeywords(req.keywords, req.auditId),
      cwv: this.mapCwv(req.cwvMetrics),
    });
    return {
      reportId: report.id,
      auditId: report.auditId,
      finalScore: Number(report.finalScore),
      classification: report.classification,
      totalIssues: report.totalIssues,
      criticalIssues: report.criticalIssues,
    };
  }

  @GrpcMethod('ReportService', 'GetReport')
  async getReport(req: { auditId: string }) {
    const report = await this.reportService.getReport(req.auditId);
    return this.toReportResponse(report);
  }

  @GrpcMethod('ReportService', 'CompareReports')
  async compareReports(req: { auditId1: string; auditId2: string }) {
    const { before, after } = await this.reportService.getTwo(req.auditId1, req.auditId2);
    const result = this.comparator.compare(before as any, after as any);
    return {
      scoreDelta: result.scoreDelta,
      ruleDeltas: result.ruleDeltas.map((d) => ({
        ruleId: d.ruleId,
        ruleName: d.ruleName,
        statusBefore: d.statusBefore ?? 'UNSPECIFIED',
        statusAfter: d.statusAfter ?? 'UNSPECIFIED',
        scoreDelta: d.scoreDelta,
      })),
      issuesFixed: result.issuesFixed,
      issuesNew: result.issuesNew,
    };
  }

  @GrpcMethod('ReportService', 'CreateShareLink')
  async createShareLink(req: { auditId: string }) {
    const link = await this.shareLink.create(req.auditId);
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return { shareToken: link.token, shareUrl: `${baseUrl}/shared/${link.token}` };
  }

  @GrpcMethod('ReportService', 'GetSharedReport')
  async getSharedReport(req: { shareToken: string }) {
    const link = await this.shareLink.findActiveByToken(req.shareToken);
    if (!link) throw new NotFoundException('Share link not found or revoked');
    const report = await this.reportService.getReport(link.auditId);
    return this.toReportResponse(report);
  }

  @GrpcMethod('ReportService', 'RevokeShareLink')
  async revokeShareLink(req: { auditId: string }) {
    const ok = await this.shareLink.revoke(req.auditId);
    return { success: ok };
  }

  @GrpcMethod('ReportService', 'GeneratePdf')
  async generatePdf(req: { auditId: string }) {
    const report = await this.reportService.getReport(req.auditId);
    const snapshot = report.analysisSnapshot as unknown as AnalyzeResult;
    const cwv = report.cwvSnapshot as any;
    const out = await this.pdf.generate({
      auditId: report.auditId,
      url: report.url,
      domain: report.domain,
      finalScore: Number(report.finalScore),
      classification: report.classification,
      analyze: snapshot,
      keywords: (report as any).keywords ?? [],
      cwv,
      categoryScores: snapshot.categoryScores,
    });
    return {
      pdfContent: out.pdf,
      filename: out.filename,
      sizeBytes: out.pdf.length,
    };
  }

  @GrpcMethod('ReportService', 'HealthCheck')
  healthCheck() {
    return { healthy: true, version: process.env.npm_package_version ?? '0.0.1' };
  }

  // ─── Mappers ───

  private mapAnalyze(analysis: any, auditId: string, url: string, domain: string): AnalyzeResult {
    return {
      auditId,
      url,
      domain,
      overallScore: analysis?.overallScore ?? 0,
      ruleResults: (analysis?.ruleResults ?? []).map((r: any) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        category: r.category,
        status: r.status,
        score: r.score,
        weight: r.weight ?? 5,
        message: r.message ?? '',
        suggestion: r.suggestion ?? null,
        metadata: r.metadata ?? {},
      })),
      categoryScores: (analysis?.categoryScores ?? []).map((c: any) => ({
        category: c.category,
        score: c.score,
        passCount: c.passCount ?? 0,
        warnCount: c.warnCount ?? 0,
        failCount: c.failCount ?? 0,
      })),
    };
  }

  private mapKeywords(payload: any, auditId: string): KeywordResult {
    return {
      auditId,
      keywords: (payload?.keywords ?? []).map((k: any) => ({
        keyword: k.keyword,
        frequency: k.frequency,
        densityPercent: k.densityPercent,
        inTitle: !!k.inTitle,
        inH1: !!k.inH1,
        inFirstParagraph: !!k.inFirstParagraph,
        inMetaDescription: !!k.inMetaDescription,
        rank: k.rank,
        isTarget: !!k.isTarget,
      })),
    };
  }

  private mapCwv(payload: any) {
    return {
      lcpMs: payload?.lcpMs ?? 0,
      inpMs: payload?.inpMs ?? 0,
      cls: payload?.cls ?? 0,
      performanceScore: payload?.performanceScore ?? 0,
      accessibilityScore: payload?.accessibilityScore ?? 0,
      bestPracticesScore: payload?.bestPracticesScore ?? 0,
      seoScore: payload?.seoScore ?? 0,
    };
  }

  private toReportResponse(report: any) {
    const snapshot = report.analysisSnapshot as AnalyzeResult;
    const cwv = report.cwvSnapshot as any;
    return {
      reportId: report.id,
      auditId: report.auditId,
      url: report.url,
      domain: report.domain,
      finalScore: Number(report.finalScore),
      classification: report.classification,
      ruleResults: (snapshot.ruleResults ?? []).map((r: any) => ({
        ...r,
        category: toProtoCategory(r.category),
        status: toProtoCheckStatus(r.status),
      })),
      categoryScores: (snapshot.categoryScores ?? []).map((c: any) => ({
        ...c,
        category: toProtoCategory(c.category),
      })),
      keywords: report.keywords ?? [],
      cwvMetrics: cwv,
      targetKeyword: undefined,
      createdAt: report.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}

// Proto-loader is configured with `enums: String`, so it serializes enum
// fields using the proto enum's *name* (e.g. `ISSUE_CATEGORY_LINKS`). The
// JS enums in `@repo/shared` use lower-case values (`links`, `fail`),
// which the loader treats as unknown and falls back to UNSPECIFIED — the
// FE then renders every category as "Other" and every status as "skipped".
// These mappers bridge JS-side enum values to the proto name the wire
// format expects.
function toProtoCategory(value: unknown): string {
  switch (value) {
    case 'meta':
      return 'ISSUE_CATEGORY_META';
    case 'headings':
      return 'ISSUE_CATEGORY_HEADINGS';
    case 'images':
      return 'ISSUE_CATEGORY_IMAGES';
    case 'links':
      return 'ISSUE_CATEGORY_LINKS';
    case 'performance':
      return 'ISSUE_CATEGORY_PERFORMANCE';
    case 'technical':
    case 'content':
      // Proto enum has no CONTENT — fold it into TECHNICAL so the FE has
      // a category to render instead of dropping the rule.
      return 'ISSUE_CATEGORY_TECHNICAL';
    default:
      if (typeof value === 'string' && value.startsWith('ISSUE_CATEGORY_')) return value;
      return 'ISSUE_CATEGORY_UNSPECIFIED';
  }
}

function toProtoCheckStatus(value: unknown): string {
  switch (value) {
    case 'pass':
      return 'CHECK_STATUS_PASS';
    case 'warn':
      return 'CHECK_STATUS_WARN';
    case 'fail':
      return 'CHECK_STATUS_FAIL';
    default:
      if (typeof value === 'string' && value.startsWith('CHECK_STATUS_')) return value;
      return 'CHECK_STATUS_UNSPECIFIED';
  }
}
