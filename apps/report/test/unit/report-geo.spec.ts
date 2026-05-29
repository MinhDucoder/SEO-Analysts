/**
 * @file Task 23 — verify that geoScore + geoVersion flow from the
 * aggregator input through to repo.createFullReport.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportService } from '../../src/report/services/report.service';
import { ReportAggregator } from '../../src/report/services/report.aggregator';
import { makeAnalyzeResult } from '../fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../fixtures/keyword-result.fixture';
import { makeCwv } from '../fixtures/cwv.fixture';

const repo: any = {
  createFullReport: vi.fn(),
  findByAuditId: vi.fn(),
  findManyByAuditIds: vi.fn(),
};
const waitSvc: any = {
  readBoth: vi.fn(),
  cleanup: vi.fn(),
};
const publishMock = vi.fn();
const redisSvc: any = {
  client: () => ({ publish: publishMock }),
};

describe('ReportService — GEO fields', () => {
  let service: ReportService;
  const aggregator = new ReportAggregator();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportService(repo, aggregator, waitSvc, redisSvc);
    repo.createFullReport.mockResolvedValue({ id: 'rep-geo', auditId: 'aud-geo', finalScore: 78 });
  });

  it('persists geoScore + geoVersion when present in aggregator input', async () => {
    const analyze = makeAnalyzeResult({ geoScore: 85, geoVersion: '1.0' });
    const keywords = makeKeywordResult();
    const cwv = makeCwv();

    await service.generateDirect({
      auditId: 'aud-geo',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze,
      keywords,
      cwv,
    });

    expect(repo.createFullReport).toHaveBeenCalledOnce();
    const callArg = repo.createFullReport.mock.calls[0][0];
    expect(callArg.geoScore).toBe(85);
    expect(callArg.geoVersion).toBe('1.0');
  });

  it('persists null geoScore + null geoVersion when aggregator omits them', async () => {
    const analyze = makeAnalyzeResult(); // no geo fields
    const keywords = makeKeywordResult();
    const cwv = makeCwv();

    await service.generateDirect({
      auditId: 'aud-geo-2',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze,
      keywords,
      cwv,
    });

    expect(repo.createFullReport).toHaveBeenCalledOnce();
    const callArg = repo.createFullReport.mock.calls[0][0];
    expect(callArg.geoScore).toBeNull();
    expect(callArg.geoVersion).toBeNull();
  });
});
