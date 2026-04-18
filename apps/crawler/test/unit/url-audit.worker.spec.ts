import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UrlAuditWorker } from '../../src/crawler/controllers/url-audit.worker';

const makeJob = (data: unknown) => ({ id: 'job-1', data } as never);

const basePageData = {
  url: 'https://example.com/a',
  finalUrl: 'https://example.com/a',
  statusCode: 200,
  responseTimeMs: 120,
  htmlSizeBytes: 500,
  h1Tags: ['Hello'],
  h2Tags: [],
  h3Tags: [],
  h4Tags: [],
  h5Tags: [],
  h6Tags: [],
  images: [],
  internalLinks: [],
  externalLinks: [],
  schemaJsonLd: [],
  openGraph: {},
  twitterCard: {},
  isHttps: true,
  redirectChain: [],
  contentEncoding: '',
  cacheControl: '',
  textContent: 'hello world',
  rawHtml: '<html></html>',
};

const baseCrawlResult = {
  pageData: basePageData,
  cwvMetrics: { lcpMs: 0, inpMs: 0, cls: 0, performanceScore: 0, accessibilityScore: 0, bestPracticesScore: 0, seoScore: 0 },
  metadata: { crawlerType: 'cheerio', isSpa: false, crawlDurationMs: 100, lighthouseDurationMs: 0, lighthouseCached: false },
};

const baseAnalyzeResult = {
  overallScore: 74.2,
  ruleResults: [
    { ruleId: 'r1', ruleName: 'meta-title', status: 'pass', score: 100, category: 'meta' },
    { ruleId: 'r2', ruleName: 'h1-present', status: 'warn', score: 60, category: 'headings', message: 'Only one H1' },
  ],
  categoryScores: [],
  classification: 'good',
};

describe('UrlAuditWorker', () => {
  let orchestrator: { crawl: ReturnType<typeof vi.fn> };
  let analyzer: { analyzePage: ReturnType<typeof vi.fn> };
  let resultStore: { append: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  let counter: { markDone: ReturnType<typeof vi.fn> };
  let publisher: {
    publishProgress: ReturnType<typeof vi.fn>;
    publishPageAuditDone: ReturnType<typeof vi.fn>;
  };
  let aggregateQueue: { add: ReturnType<typeof vi.fn> };
  let worker: UrlAuditWorker;

  beforeEach(() => {
    orchestrator = { crawl: vi.fn().mockResolvedValue(baseCrawlResult) };
    analyzer = { analyzePage: vi.fn().mockResolvedValue(baseAnalyzeResult) };
    resultStore = { append: vi.fn().mockResolvedValue(undefined), count: vi.fn().mockResolvedValue(0) };
    counter = { markDone: vi.fn().mockResolvedValue({ done: 1, expected: 3, complete: false }) };
    publisher = {
      publishProgress: vi.fn().mockResolvedValue(undefined),
      publishPageAuditDone: vi.fn().mockResolvedValue(undefined),
    };
    aggregateQueue = { add: vi.fn().mockResolvedValue({}) };
    worker = new UrlAuditWorker(
      orchestrator as never,
      analyzer as never,
      resultStore as never,
      counter as never,
      publisher as never,
      aggregateQueue as never,
    );
  });

  it('crawls the URL without Lighthouse', async () => {
    await worker.process(makeJob({ auditId: 'aud-1', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(orchestrator.crawl).toHaveBeenCalledWith(
      'https://example.com/a',
      expect.objectContaining({ includeLighthouse: false }),
    );
  });

  it('calls the analyzer with auditId + pageData', async () => {
    await worker.process(makeJob({ auditId: 'aud-2', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(analyzer.analyzePage).toHaveBeenCalledWith(
      'aud-2',
      expect.objectContaining({ url: 'https://example.com/a' }),
      undefined,
    );
  });

  it('forwards targetKeyword to the analyzer when present in the job', async () => {
    await worker.process(makeJob({
      auditId: 'aud-3', url: 'https://example.com/a', rootUrl: 'https://example.com/', targetKeyword: 'seo tools',
    }));

    expect(analyzer.analyzePage).toHaveBeenCalledWith('aud-3', expect.any(Object), 'seo tools');
  });

  it('appends a PageAuditResult with rounded score + mapped issues to the result store', async () => {
    await worker.process(makeJob({ auditId: 'aud-4', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(resultStore.append).toHaveBeenCalledWith('aud-4', expect.objectContaining({
      url: 'https://example.com/a',
      score: 74,
      issues: expect.arrayContaining([
        expect.objectContaining({ ruleName: 'meta-title', status: 'pass' }),
        expect.objectContaining({ ruleName: 'h1-present', status: 'warn', message: 'Only one H1' }),
      ]),
    }));
  });

  it('publishes page-audit.done so gateway can persist the row', async () => {
    await worker.process(makeJob({ auditId: 'aud-5', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(publisher.publishPageAuditDone).toHaveBeenCalledWith(
      'aud-5',
      expect.objectContaining({ url: 'https://example.com/a', score: 74 }),
    );
  });

  it('marks done in the counter and publishes per-URL progress with monotonic percent', async () => {
    counter.markDone.mockResolvedValue({ done: 2, expected: 4, complete: false });
    await worker.process(makeJob({ auditId: 'aud-6', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(counter.markDone).toHaveBeenCalledWith('aud-6');
    expect(publisher.publishProgress).toHaveBeenCalledWith(
      'aud-6',
      expect.any(Number),
      'site-crawl-audit',
      expect.anything(),
      expect.stringMatching(/2\/4/),
    );
    const pct = publisher.publishProgress.mock.calls[0][1];
    expect(pct).toBeGreaterThanOrEqual(20);
    expect(pct).toBeLessThanOrEqual(90);
  });

  it('does NOT enqueue the aggregate job when the counter is incomplete', async () => {
    counter.markDone.mockResolvedValue({ done: 1, expected: 3, complete: false });
    await worker.process(makeJob({ auditId: 'aud-7', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(aggregateQueue.add).not.toHaveBeenCalled();
  });

  it('enqueues the aggregate job exactly once when the counter reports complete', async () => {
    counter.markDone.mockResolvedValue({ done: 3, expected: 3, complete: true });
    await worker.process(makeJob({ auditId: 'aud-8', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(aggregateQueue.add).toHaveBeenCalledTimes(1);
    expect(aggregateQueue.add).toHaveBeenCalledWith(
      'site-crawl.aggregate',
      expect.objectContaining({ auditId: 'aud-8', rootUrl: 'https://example.com/' }),
      expect.any(Object),
    );
  });

  it('records a failed PageAuditResult + still marks done when the crawl fails', async () => {
    orchestrator.crawl.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      worker.process(makeJob({ auditId: 'aud-9', url: 'https://example.com/a', rootUrl: 'https://example.com/' })),
    ).resolves.not.toThrow();

    expect(analyzer.analyzePage).not.toHaveBeenCalled();
    expect(resultStore.append).toHaveBeenCalledWith('aud-9', expect.objectContaining({
      url: 'https://example.com/a',
      score: 0,
      error: expect.stringMatching(/ECONNREFUSED/),
    }));
    expect(counter.markDone).toHaveBeenCalledWith('aud-9');
    expect(publisher.publishPageAuditDone).toHaveBeenCalledWith('aud-9', expect.objectContaining({ score: 0 }));
  });

  it('records a failed PageAuditResult when the analyzer fails (crawl succeeded)', async () => {
    analyzer.analyzePage.mockRejectedValue(new Error('analyzer deadline exceeded'));
    await worker.process(makeJob({ auditId: 'aud-10', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(resultStore.append).toHaveBeenCalledWith('aud-10', expect.objectContaining({
      url: 'https://example.com/a',
      score: 0,
      error: expect.stringMatching(/analyzer/),
    }));
    expect(counter.markDone).toHaveBeenCalledWith('aud-10');
  });

  it('still enqueues aggregate when a failing URL was the final one', async () => {
    orchestrator.crawl.mockRejectedValue(new Error('network down'));
    counter.markDone.mockResolvedValue({ done: 3, expected: 3, complete: true });

    await worker.process(makeJob({ auditId: 'aud-11', url: 'https://example.com/a', rootUrl: 'https://example.com/' }));

    expect(aggregateQueue.add).toHaveBeenCalledTimes(1);
  });
});
