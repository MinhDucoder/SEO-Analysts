import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportRepository } from '../../src/report/report.repository';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

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
