import { describe, expect, it, vi } from 'vitest';
import { LlmsTxtGeneratorService } from '../../src/tools/services/llms-txt-generator.service';
import type { LiteFetcherService } from '../../src/tools/services/lite-fetcher.service';

function makeResult(body: string, status = 200): Partial<Awaited<ReturnType<LiteFetcherService['get']>>> {
  return { body, status, url: 'https://acme.test/', headers: {}, contentType: 'text/html', durationMs: 1, bodyBuffer: Buffer.from(body) };
}

describe('LlmsTxtGeneratorService', () => {
  it('returns markdown with H1 and sitemap pages when sitemap available', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          makeResult('<html><head><title>Acme</title><meta name="description" content="Best tools"></head></html>'),
        )
        .mockResolvedValueOnce(
          makeResult(
            '<urlset><url><loc>https://acme.test/docs/start</loc></url></urlset>',
          ),
        ),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://acme.test');
    expect(out.content).toMatch(/^# Acme\n\n>/m);
    expect(out.content).toContain('https://acme.test/docs/start');
    expect(out.sizeBytes).toBe(out.content.length);
    expect(out.warnings).toHaveLength(0);
  });

  it('warns and falls back to homepage links when no sitemap available (404)', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          makeResult(
            '<html><head><title>S</title></head><body><a href="https://x.test/about">about</a></body></html>',
          ),
        )
        .mockResolvedValueOnce(makeResult('', 404)),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://x.test');
    expect(out.warnings).toContain('Site has no sitemap, generated from homepage links');
  });

  it('warns and falls back when sitemap fetch throws', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          makeResult('<html><head><title>Err</title></head></html>'),
        )
        .mockRejectedValueOnce(new Error('TIMEOUT')),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://err.test');
    expect(out.warnings).toContain('Site has no sitemap, generated from homepage links');
  });

  it('outputs only H1 + summary line when no urls found', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          makeResult('<html><head><title>Empty</title><meta name="description" content="Nothing here"></head></html>'),
        )
        .mockResolvedValueOnce(makeResult('', 404)),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://empty.test');
    // Should have H1 and summary but no ## Main pages section
    expect(out.content).toContain('# Empty');
    expect(out.content).toContain('> Nothing here');
    expect(out.content).not.toContain('## Main pages');
  });

  it('falls back to hostname as title when <title> is missing', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(makeResult('<html><head></head></html>'))
        .mockResolvedValueOnce(makeResult('', 404)),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://notitle.test');
    expect(out.content).toContain('# notitle.test');
  });

  it('handles special chars in title by passing them through', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          makeResult('<html><head><title>Acme & Co. "Best" &lt;tools&gt;</title></head></html>'),
        )
        .mockResolvedValueOnce(makeResult('', 404)),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://acme.test');
    // cheerio decodes HTML entities in text()
    expect(out.content).toContain('# Acme & Co.');
  });

  it('sizeBytes equals content.length', async () => {
    const fakeFetcher = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          makeResult('<html><head><title>Measure</title></head></html>'),
        )
        .mockResolvedValueOnce(
          makeResult('<urlset><url><loc>https://measure.test/a</loc></url></urlset>'),
        ),
    };
    const svc = new LlmsTxtGeneratorService(fakeFetcher as unknown as LiteFetcherService);
    const out = await svc.generate('https://measure.test');
    expect(out.sizeBytes).toBe(Buffer.byteLength(out.content, 'utf8'));
  });
});
