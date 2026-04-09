import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportService } from '../../src/report/report.service';
import { ReportAggregator } from '../../src/report/report.aggregator';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

const repo: any = {
  createFullReport: vi.fn(),
  findByAuditId: vi.fn(),
  findManyByAuditIds: vi.fn(),
};
const waitSvc: any = {
  readBoth: vi.fn(),
  cleanup: vi.fn(),
};
const redisSvc: any = {
  client: () => ({ publish: vi.fn() }),
};
const publishMock = vi.fn();
redisSvc.client = () => ({ publish: publishMock });

describe('ReportService.generateFromPipeline', () => {
  let service: ReportService;
  const aggregator = new ReportAggregator();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportService(repo, aggregator, waitSvc, redisSvc);
  });

  it('reads payloads, aggregates, persists, publishes report.done, cleans up', async () => {
    const analyze = makeAnalyzeResult();
    const keywords = makeKeywordResult();
    const cwv = makeCwv();

    waitSvc.readBoth.mockResolvedValueOnce({ analyze, keywords });
    repo.createFullReport.mockResolvedValueOnce({
      id: 'rep-1',
      auditId: 'aud-1',
      finalScore: 78,
    });

    // For this branch, cwv comes from the analyze payload's snapshot OR fallback
    const result = await service.generateFromPipeline({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      cwv,
    });

    expect(waitSvc.readBoth).toHaveBeenCalledWith('aud-1');
    expect(repo.createFullReport).toHaveBeenCalledOnce();
    expect(publishMock).toHaveBeenCalledWith(
      'report.done',
      expect.stringContaining('"auditId":"aud-1"'),
    );
    expect(waitSvc.cleanup).toHaveBeenCalledWith('aud-1');
    expect(result.id).toBe('rep-1');
  });

  it('throws if payloads are missing', async () => {
    waitSvc.readBoth.mockRejectedValueOnce(new Error('Missing payloads'));
    await expect(
      service.generateFromPipeline({
        auditId: 'aud-1',
        url: 'https://example.com/',
        domain: 'example.com',
        cwv: makeCwv(),
      }),
    ).rejects.toThrow(/missing/i);
    expect(repo.createFullReport).not.toHaveBeenCalled();
  });
});
