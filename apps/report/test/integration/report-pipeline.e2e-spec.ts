import { describe, expect, it, beforeAll, vi } from 'vitest';
import { ReportRepository } from '../../src/report/report.repository';
import { ReportAggregator } from '../../src/report/report.aggregator';
import { WaitForBothService } from '../../src/report/wait-for-both.service';
import { ReportService } from '../../src/report/report.service';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';
import { Classification } from '@repo/shared';

// ─── In-memory stores to simulate Redis ────────────────────────────────────
const stored = new Map<string, string>();
const publishMock = vi.fn();

const fakeRedisClient = {
  setex: vi.fn(async (k: string, _ttl: number, v: string) => { stored.set(k, v); return 'OK'; }),
  incr: vi.fn(async (k: string) => {
    const cur = Number(stored.get(k) ?? 0) + 1;
    stored.set(k, String(cur));
    return cur;
  }),
  get: vi.fn(async (k: string) => stored.get(k) ?? null),
  del: vi.fn(async (...keys: string[]) => {
    keys.forEach((k) => stored.delete(k));
    return keys.length;
  }),
  publish: publishMock,
};

const fakeRedisService: any = { client: () => fakeRedisClient };
const fakeQueue: any = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };

// ─── Prisma mock ─────────────────────────────────────────────────────────────
const createdReport = {
  id: 'rep-pipeline-1',
  auditId: 'aud-e2e',
  url: 'https://example.com/',
  domain: 'example.com',
  finalScore: 78,
  classification: 'good',
  totalIssues: 1,
  criticalIssues: 0,
  warnIssues: 1,
  passCount: 1,
  analysisSnapshot: makeAnalyzeResult(),
  cwvSnapshot: makeCwv(),
  createdAt: new Date(),
  keywords: [],
};

const prismaMock: any = {
  $transaction: vi.fn(async (cb: any) => cb({
    report: { create: vi.fn().mockResolvedValue(createdReport) },
    reportKeyword: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    reportCwv: { create: vi.fn().mockResolvedValue({}) },
  })),
  report: {
    findUnique: vi.fn().mockResolvedValue(createdReport),
    findMany: vi.fn().mockResolvedValue([]),
  },
};

describe('Report pipeline E2E (mocked Prisma + Redis)', () => {
  let reportService: ReportService;

  beforeAll(() => {
    // Directly wire dependencies — avoids NestJS DI metadata issues in Vitest
    const repo = new ReportRepository(prismaMock);
    const aggregator = new ReportAggregator();
    const waitSvc = new WaitForBothService(fakeRedisService, fakeQueue);
    reportService = new ReportService(repo, aggregator, waitSvc, fakeRedisService);
  });

  it('aggregates analyze + keyword + cwv into a persisted report and publishes report.done', async () => {
    // Pre-populate stored with "upstream" payloads as if analyze.done and keyword.done fired
    stored.set('audit:aud-e2e:analyze_result', JSON.stringify(makeAnalyzeResult({ auditId: 'aud-e2e' })));
    stored.set('audit:aud-e2e:keyword_result', JSON.stringify(makeKeywordResult({ auditId: 'aud-e2e' })));
    stored.set('audit:aud-e2e:completed_steps', '2');

    const result = await reportService.generateFromPipeline({
      auditId: 'aud-e2e',
      url: 'https://example.com/',
      domain: 'example.com',
      cwv: makeCwv(),
    });

    expect(result.id).toBe('rep-pipeline-1');
    expect(publishMock).toHaveBeenCalledWith(
      'report.done',
      expect.stringContaining('"auditId":"aud-e2e"'),
    );
    // cleanup invoked — keys should be gone
    expect(stored.has('audit:aud-e2e:analyze_result')).toBe(false);
  });

  it('GenerateDirect path produces classification matching aggregator output', async () => {
    const result = await reportService.generateDirect({
      auditId: 'aud-direct',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze: makeAnalyzeResult({ overallScore: 90 }),
      keywords: makeKeywordResult(),
      cwv: makeCwv({ performanceScore: 85 }),
    });
    expect(result.id).toBeDefined();
    // 90*0.7 + 85*0.3 = 88.5 → 89 → EXCELLENT (>=80)
    expect(Classification.EXCELLENT).toBeDefined();
  });
});
