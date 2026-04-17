import { describe, expect, it, vi } from 'vitest';
import { UndiciSitemapHttpClient } from '../../src/crawler/infra/sitemap/undici-sitemap-http-client';
import { PoliteFetcher } from '../../src/crawler/infra/fetchers/polite-fetcher';

describe('UndiciSitemapHttpClient', () => {
  it('delegates fetch to PoliteFetcher and returns status/body/contentType', async () => {
    const pf = {
      fetch: vi.fn().mockResolvedValue({
        status: 200,
        body: '<urlset><url><loc>https://example.com/</loc></url></urlset>',
        contentType: 'application/xml',
        attempts: 1,
        durationMs: 12,
      }),
    };
    const client = new UndiciSitemapHttpClient(pf as unknown as PoliteFetcher);
    const res = await client.fetch('https://example.com/sitemap.xml');
    expect(pf.fetch).toHaveBeenCalledWith('https://example.com/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.body).toContain('<urlset>');
    expect(res.contentType).toBe('application/xml');
  });

  it('passes through non-200 status codes without raising', async () => {
    const pf = {
      fetch: vi.fn().mockResolvedValue({ status: 404, body: '', contentType: 'text/plain', attempts: 1, durationMs: 5 }),
    };
    const client = new UndiciSitemapHttpClient(pf as unknown as PoliteFetcher);
    const res = await client.fetch('https://example.com/robots.txt');
    expect(res.status).toBe(404);
  });
});
