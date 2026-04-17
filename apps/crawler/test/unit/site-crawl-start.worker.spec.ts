import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SiteCrawlStartWorker } from '../../src/crawler/controllers/site-crawl-start.worker';

const makeJob = (data: unknown) => ({ id: 'job-1', data } as any);

describe('SiteCrawlStartWorker', () => {
  let discovery: { discoverAllUrls: ReturnType<typeof vi.fn> };
  let counter: { setExpected: ReturnType<typeof vi.fn> };
  let urlAuditQueue: { add: ReturnType<typeof vi.fn> };
  let publisher: { publishProgress: ReturnType<typeof vi.fn>; publishCrawlFailed: ReturnType<typeof vi.fn> };
  let worker: SiteCrawlStartWorker;

  beforeEach(() => {
    discovery = { discoverAllUrls: vi.fn() };
    counter = { setExpected: vi.fn().mockResolvedValue(undefined) };
    urlAuditQueue = { add: vi.fn().mockResolvedValue({}) };
    publisher = {
      publishProgress: vi.fn().mockResolvedValue(undefined),
      publishCrawlFailed: vi.fn().mockResolvedValue(undefined),
    };
    worker = new SiteCrawlStartWorker(
      discovery as any,
      counter as any,
      urlAuditQueue as any,
      publisher as any,
    );
  });

  it('discovers URLs and fans out one url-audit job per discovered URL', async () => {
    discovery.discoverAllUrls.mockResolvedValue([
      'https://example.com/', 'https://example.com/a', 'https://example.com/b',
    ]);
    await worker.process(makeJob({ auditId: 'aud-1', rootUrl: 'https://example.com/', maxUrls: 500 }));

    expect(discovery.discoverAllUrls).toHaveBeenCalledWith('https://example.com/', 500);
    expect(counter.setExpected).toHaveBeenCalledWith('aud-1', 3);
    expect(urlAuditQueue.add).toHaveBeenCalledTimes(3);
    expect(urlAuditQueue.add).toHaveBeenNthCalledWith(
      1,
      'site-crawl.url-audit',
      expect.objectContaining({ auditId: 'aud-1', url: 'https://example.com/' }),
      expect.any(Object),
    );
  });

  it('caps fan-out at the per-audit maxUrls setting', async () => {
    const urls = Array.from({ length: 1000 }, (_, i) => `https://example.com/p${i}`);
    discovery.discoverAllUrls.mockResolvedValue(urls.slice(0, 500));
    await worker.process(makeJob({ auditId: 'aud-2', rootUrl: 'https://example.com/', maxUrls: 500 }));
    expect(counter.setExpected).toHaveBeenCalledWith('aud-2', 500);
    expect(urlAuditQueue.add).toHaveBeenCalledTimes(500);
  });

  it('uses DEFAULT_MAX_URLS when maxUrls missing from job data', async () => {
    discovery.discoverAllUrls.mockResolvedValue(['https://example.com/']);
    await worker.process(makeJob({ auditId: 'aud-3', rootUrl: 'https://example.com/' }));
    const [, defaultMax] = discovery.discoverAllUrls.mock.calls[0];
    expect(defaultMax).toBe(500);
  });

  it('publishes progress at start + after discovery', async () => {
    discovery.discoverAllUrls.mockResolvedValue(['https://example.com/']);
    await worker.process(makeJob({ auditId: 'aud-4', rootUrl: 'https://example.com/' }));
    expect(publisher.publishProgress).toHaveBeenCalledWith(
      'aud-4', 10, 'site-crawl-discovery', expect.anything(), expect.any(String),
    );
    expect(publisher.publishProgress).toHaveBeenCalledWith(
      'aud-4', 20, 'site-crawl-fanout', expect.anything(), expect.stringContaining('1'),
    );
  });

  it('publishes crawl.failed + rethrows when discovery returns zero URLs', async () => {
    discovery.discoverAllUrls.mockResolvedValue([]);
    await expect(worker.process(makeJob({ auditId: 'aud-5', rootUrl: 'https://no-sitemap.example/' })))
      .rejects.toThrow(/no URLs/i);
    expect(publisher.publishCrawlFailed).toHaveBeenCalledWith('aud-5', expect.any(Error));
    expect(urlAuditQueue.add).not.toHaveBeenCalled();
  });

  it('publishes crawl.failed + rethrows on discovery error', async () => {
    discovery.discoverAllUrls.mockRejectedValue(new Error('sitemap timeout'));
    await expect(worker.process(makeJob({ auditId: 'aud-6', rootUrl: 'https://example.com/' })))
      .rejects.toThrow(/sitemap timeout/);
    expect(publisher.publishCrawlFailed).toHaveBeenCalledWith('aud-6', expect.any(Error));
  });
});
