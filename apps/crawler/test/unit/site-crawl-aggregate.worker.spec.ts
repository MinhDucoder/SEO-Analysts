import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SiteCrawlAggregateWorker } from '../../src/crawler/controllers/site-crawl-aggregate.worker';
import type { PageAuditResult } from '../../src/crawler/services/page-audit-result-store.service';

const makeJob = (data: unknown) => ({ id: 'job-1', data } as never);

const page = (overrides: Partial<PageAuditResult> = {}): PageAuditResult => ({
  url: 'https://example.com/',
  score: 80,
  issues: [],
  fetchedAt: '2026-04-18T12:00:00.000Z',
  ...overrides,
});

describe('SiteCrawlAggregateWorker', () => {
  let resultStore: {
    readAll: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  let counter: { cleanup: ReturnType<typeof vi.fn> };
  let publisher: {
    publishProgress: ReturnType<typeof vi.fn>;
    publishSiteCrawlDone: ReturnType<typeof vi.fn>;
  };
  let worker: SiteCrawlAggregateWorker;

  beforeEach(() => {
    resultStore = {
      readAll: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    counter = { cleanup: vi.fn().mockResolvedValue(undefined) };
    publisher = {
      publishProgress: vi.fn().mockResolvedValue(undefined),
      publishSiteCrawlDone: vi.fn().mockResolvedValue(undefined),
    };
    worker = new SiteCrawlAggregateWorker(
      resultStore as never,
      counter as never,
      publisher as never,
    );
  });

  it('reads page audits for the auditId and publishes a summary', async () => {
    resultStore.readAll.mockResolvedValue([
      page({ url: 'https://x/a', score: 80, issues: [{ ruleId: 'r1', ruleName: 'x', status: 'pass', score: 100 }] }),
      page({ url: 'https://x/b', score: 60, issues: [{ ruleId: 'r2', ruleName: 'y', status: 'fail', score: 0 }] }),
    ]);

    await worker.process(makeJob({ auditId: 'aud-1', rootUrl: 'https://x/' }));

    expect(resultStore.readAll).toHaveBeenCalledWith('aud-1');
    expect(publisher.publishSiteCrawlDone).toHaveBeenCalledWith(
      'aud-1',
      expect.objectContaining({ rootUrl: 'https://x/', totalUrls: 2 }),
    );
  });

  it('computes avg score across all pages (integer-rounded)', async () => {
    resultStore.readAll.mockResolvedValue([
      page({ score: 80 }),
      page({ score: 60 }),
      page({ score: 40 }),
    ]);
    await worker.process(makeJob({ auditId: 'aud-2', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary.avgScore).toBe(60);
  });

  it('computes median score for odd-sized populations', async () => {
    resultStore.readAll.mockResolvedValue([
      page({ score: 30 }),
      page({ score: 70 }),
      page({ score: 50 }),
    ]);
    await worker.process(makeJob({ auditId: 'aud-3', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary.medianScore).toBe(50);
  });

  it('computes median score for even-sized populations (avg of middle two)', async () => {
    resultStore.readAll.mockResolvedValue([
      page({ score: 40 }),
      page({ score: 60 }),
      page({ score: 80 }),
      page({ score: 100 }),
    ]);
    await worker.process(makeJob({ auditId: 'aud-4', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary.medianScore).toBe(70);
  });

  it('returns top-10 worst pages sorted ascending by score', async () => {
    const inputs = Array.from({ length: 15 }, (_, i) =>
      page({ url: `https://x/p${i}`, score: i * 5 + 10, issues: Array.from({ length: i }, () => ({ ruleId: 'r', ruleName: 'x', status: 'fail', score: 0 })) }),
    );
    resultStore.readAll.mockResolvedValue(inputs);

    await worker.process(makeJob({ auditId: 'aud-5', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary.worstPages).toHaveLength(10);
    const scores = summary.worstPages.map((p: { score: number }) => p.score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(scores[0]).toBe(10);
  });

  it('includes issueCount on each worst-page entry', async () => {
    resultStore.readAll.mockResolvedValue([
      page({ url: 'https://x/a', score: 30, issues: [
        { ruleId: 'r1', ruleName: 'x', status: 'fail', score: 0 },
        { ruleId: 'r2', ruleName: 'y', status: 'warn', score: 50 },
      ] }),
    ]);

    await worker.process(makeJob({ auditId: 'aud-6', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary.worstPages[0]).toMatchObject({
      url: 'https://x/a',
      score: 30,
      issueCount: 2,
    });
  });

  it('counts failed URLs separately from audited URLs', async () => {
    resultStore.readAll.mockResolvedValue([
      page({ score: 80 }),
      page({ score: 0, error: 'ECONNREFUSED' }),
      page({ score: 0, error: 'timeout' }),
    ]);

    await worker.process(makeJob({ auditId: 'aud-7', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary.totalUrls).toBe(3);
    expect(summary.failedUrls).toBe(2);
    expect(summary.auditedUrls).toBe(1);
  });

  it('handles an empty result list without throwing', async () => {
    resultStore.readAll.mockResolvedValue([]);
    await worker.process(makeJob({ auditId: 'aud-empty', rootUrl: 'https://x/' }));

    const summary = publisher.publishSiteCrawlDone.mock.calls[0][1];
    expect(summary).toMatchObject({
      totalUrls: 0,
      auditedUrls: 0,
      failedUrls: 0,
      avgScore: 0,
      medianScore: 0,
      worstPages: [],
    });
  });

  it('cleans up Redis state (counter + results) after publishing', async () => {
    resultStore.readAll.mockResolvedValue([page({ score: 80 })]);
    await worker.process(makeJob({ auditId: 'aud-8', rootUrl: 'https://x/' }));

    expect(counter.cleanup).toHaveBeenCalledWith('aud-8');
    expect(resultStore.clear).toHaveBeenCalledWith('aud-8');
    // cleanup happens AFTER publish so downstream listeners can still read the list if they race
    expect(publisher.publishSiteCrawlDone.mock.invocationCallOrder[0])
      .toBeLessThan(counter.cleanup.mock.invocationCallOrder[0]);
  });

  it('publishes final 100% progress tick with COMPLETED status', async () => {
    resultStore.readAll.mockResolvedValue([page({ score: 80 })]);
    await worker.process(makeJob({ auditId: 'aud-9', rootUrl: 'https://x/' }));

    expect(publisher.publishProgress).toHaveBeenCalledWith(
      'aud-9', 100, 'site-crawl-done', expect.anything(), expect.any(String),
    );
  });
});
