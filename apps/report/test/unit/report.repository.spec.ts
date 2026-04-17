import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportRepository } from '../../src/report/persistence/report.repository';
import { makeAnalyzeResult } from '../fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../fixtures/keyword-result.fixture';
import { makeCwv } from '../fixtures/cwv.fixture';

const tx = {
  report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  reportKeyword: { createMany: vi.fn() },
  reportCwv: { create: vi.fn() },
};

const prismaMock: any = {
  $transaction: vi.fn(async (cb: any) => cb(tx)),
  report: tx.report,
  reportKeyword: tx.reportKeyword,
  reportCwv: tx.reportCwv,
};

describe('ReportRepository', () => {
  let repo: ReportRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ReportRepository(prismaMock);
  });

  it('persists report + keywords + cwv inside a single transaction', async () => {
    tx.report.create.mockResolvedValueOnce({
      id: 'rep-1',
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      finalScore: 80,
      classification: 'excellent',
      totalIssues: 1,
      criticalIssues: 1,
      warnIssues: 1,
      passCount: 1,
      analysisSnapshot: {},
      cwvSnapshot: {},
      createdAt: new Date(),
    });

    const aggregated = {
      url: 'https://example.com/',
      domain: 'example.com',
      finalScore: 80,
      classification: 'excellent',
      totalIssues: 1,
      criticalIssues: 1,
      warnIssues: 1,
      passCount: 1,
      analysisSnapshot: makeAnalyzeResult(),
      cwvSnapshot: makeCwv(),
    };
    const created = await repo.createFullReport({
      auditId: 'aud-1',
      aggregated,
      keywords: makeKeywordResult().keywords,
      cwv: makeCwv(),
    });

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(tx.report.create).toHaveBeenCalledOnce();
    expect(tx.reportKeyword.createMany).toHaveBeenCalledOnce();
    expect(tx.reportCwv.create).toHaveBeenCalledOnce();
    expect(created.id).toBe('rep-1');
  });

  it('persists desktop CWV fields on ReportCwv when cwvDesktop is provided', async () => {
    tx.report.create.mockResolvedValueOnce({ id: 'rep-2', auditId: 'aud-2', finalScore: 75 });
    const aggregated = {
      url: 'https://example.com/', domain: 'example.com', finalScore: 75,
      classification: 'good', totalIssues: 0, criticalIssues: 0, warnIssues: 0, passCount: 0,
      analysisSnapshot: makeAnalyzeResult(), cwvSnapshot: makeCwv(),
    };
    const mobile  = { lcpMs: 1800, inpMs: 180, cls: 0.08, performanceScore: 82, accessibilityScore: 88, bestPracticesScore: 90, seoScore: 92 };
    const desktop = { lcpMs:  900, inpMs:  70, cls: 0.02, performanceScore: 96, accessibilityScore: 94, bestPracticesScore: 97, seoScore: 98 };

    await repo.createFullReport({
      auditId: 'aud-2',
      aggregated,
      keywords: [],
      cwv: mobile,
      cwvDesktop: desktop,
    });

    expect(tx.reportCwv.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportId: 'rep-2',
        lcpMs: 1800,
        performanceScore: 82,
        desktopLcpMs: 900,
        desktopPerformanceScore: 96,
        desktopAccessibilityScore: 94,
        desktopBestPracticesScore: 97,
        desktopLighthouseSeoScore: 98,
      }),
    });
  });

  it('omits desktop fields when cwvDesktop is absent', async () => {
    tx.report.create.mockResolvedValueOnce({ id: 'rep-3', auditId: 'aud-3', finalScore: 50 });
    const aggregated = {
      url: 'https://example.com/', domain: 'example.com', finalScore: 50,
      classification: 'fair', totalIssues: 0, criticalIssues: 0, warnIssues: 0, passCount: 0,
      analysisSnapshot: makeAnalyzeResult(), cwvSnapshot: makeCwv(),
    };
    await repo.createFullReport({ auditId: 'aud-3', aggregated, keywords: [], cwv: makeCwv() });
    const call = tx.reportCwv.create.mock.calls[0][0];
    expect(call.data.desktopLcpMs).toBeUndefined();
    expect(call.data.desktopPerformanceScore).toBeUndefined();
  });

  it('findByAuditId returns report with relations', async () => {
    prismaMock.report.findUnique.mockResolvedValueOnce({ id: 'r1', auditId: 'aud-1' });
    const found = await repo.findByAuditId('aud-1');
    expect(prismaMock.report.findUnique).toHaveBeenCalledWith({
      where: { auditId: 'aud-1' },
      include: { keywords: true, cwv: true, shareLink: true },
    });
    expect(found?.id).toBe('r1');
  });

  it('findManyByAuditIds returns multiple reports', async () => {
    prismaMock.report.findMany.mockResolvedValueOnce([{ id: 'r1' }, { id: 'r2' }]);
    const list = await repo.findManyByAuditIds(['a', 'b']);
    expect(list).toHaveLength(2);
  });
});
