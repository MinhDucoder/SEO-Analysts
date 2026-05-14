import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { ContentExtractorService } from '../../src/public-api/services/content-extractor.service';
import type { CrawlerGrpcClient } from '../../src/infra/grpc/crawler.client';

function makeCrawler(): CrawlerGrpcClient {
  return {
    liteFetch: vi.fn(),
  } as unknown as CrawlerGrpcClient;
}

describe('ContentExtractorService — URL mode error mapping (COR-B2)', () => {
  let svc: ContentExtractorService;
  let crawler: CrawlerGrpcClient;

  beforeEach(() => {
    crawler = makeCrawler();
    svc = new ContentExtractorService(crawler);
  });

  it('maps "timeout" message to 424 URL_FETCH_TIMEOUT', async () => {
    (crawler.liteFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('timeout'),
    );
    await expect(
      svc.extract({ type: 'url', url: 'https://example.com' }),
    ).rejects.toMatchObject({
      constructor: HttpException,
      response: { code: 'URL_FETCH_TIMEOUT' },
      status: 424,
    });
  });

  it('maps AbortError to 424 URL_FETCH_TIMEOUT', async () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    (crawler.liteFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
    await expect(
      svc.extract({ type: 'url', url: 'https://example.com' }),
    ).rejects.toMatchObject({
      response: { code: 'URL_FETCH_TIMEOUT' },
      status: 424,
    });
  });

  it('maps non-timeout fetch errors to 424 URL_FETCH_FAILED', async () => {
    (crawler.liteFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('HTTP 404'),
    );
    await expect(
      svc.extract({ type: 'url', url: 'https://example.com' }),
    ).rejects.toMatchObject({
      response: { code: 'URL_FETCH_FAILED', message: 'HTTP 404' },
      status: 424,
    });
  });

  it('maps content-type errors to 424 URL_FETCH_FAILED', async () => {
    (crawler.liteFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('response is not HTML (content-type: application/pdf)'),
    );
    await expect(
      svc.extract({ type: 'url', url: 'https://example.com' }),
    ).rejects.toMatchObject({
      response: { code: 'URL_FETCH_FAILED' },
      status: 424,
    });
  });

  it('passes through liteFetch result on success', async () => {
    (crawler.liteFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      finalUrl: 'https://example.com/',
      statusCode: 200,
      html: '<html><body>hi</body></html>',
      sizeBytes: 27,
      fetchTimeMs: 80,
      redirectChain: [],
      fromCache: false,
    });
    const out = await svc.extract({ type: 'url', url: 'https://example.com' });
    expect(out.html).toContain('<body>hi</body>');
    expect(out.resolvedUrl).toBe('https://example.com/');
    expect(out.fromCache).toBe(false);
  });
});
