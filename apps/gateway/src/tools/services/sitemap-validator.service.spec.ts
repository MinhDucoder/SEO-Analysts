import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SitemapValidatorService } from './sitemap-validator.service';
import type { LiteFetcherService } from './lite-fetcher.service';

const robotsTxt = `User-agent: *
Disallow: /admin
Allow: /public
Sitemap: https://example.com/sitemap.xml
Crawl-delay: 10
bogusline`;

function urlset(n: number): string {
  let body = '<urlset>';
  for (let i = 0; i < n; i++) {
    body += `<url><loc>https://example.com/p${i}</loc><lastmod>2024-01-0${(i % 9) + 1}</lastmod><changefreq>daily</changefreq><priority>0.5</priority></url>`;
  }
  return body + '</urlset>';
}

describe('SitemapValidatorService', () => {
  let fetcher: { get: ReturnType<typeof vi.fn> };
  let svc: SitemapValidatorService;

  beforeEach(() => {
    fetcher = { get: vi.fn() };
    svc = new SitemapValidatorService(fetcher as unknown as LiteFetcherService);
  });

  it('parses robots.txt rules + sitemaps + flags malformed lines', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) return { url, body: robotsTxt, status: 200, headers: {} };
      return { url, body: urlset(2), status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', {});
    expect(r.data.robots.exists).toBe(true);
    expect(r.data.robots.rules).toContainEqual({ userAgent: '*', type: 'disallow', value: '/admin' });
    expect(r.data.robots.sitemaps).toContain('https://example.com/sitemap.xml');
    expect(r.data.robots.syntaxErrors.length).toBeGreaterThan(0);
  });

  it('uses the Sitemap directive from robots to locate the sitemap', async () => {
    const seen: string[] = [];
    fetcher.get.mockImplementation(async (url: string) => {
      seen.push(url);
      if (url.endsWith('/robots.txt'))
        return {
          url,
          body: 'Sitemap: https://example.com/custom-sitemap.xml',
          status: 200,
          headers: {},
        };
      return { url, body: urlset(1), status: 200, headers: {} };
    });
    await svc.execute('https://example.com', {});
    expect(seen).toContain('https://example.com/custom-sitemap.xml');
  });

  it('falls back to /sitemap.xml when robots is absent', async () => {
    const seen: string[] = [];
    fetcher.get.mockImplementation(async (url: string) => {
      seen.push(url);
      if (url.endsWith('/robots.txt')) throw new Error('DNS_FAIL');
      return { url, body: urlset(1), status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', {});
    expect(r.data.robots.exists).toBe(false);
    expect(seen).toContain('https://example.com/sitemap.xml');
  });

  it('lists urlset entries and validates each', async () => {
    const badXml = `<urlset>
      <url><loc>https://example.com/ok</loc><lastmod>2024-01-01</lastmod><changefreq>daily</changefreq><priority>0.5</priority></url>
      <url><loc>ftp://bad/proto</loc><changefreq>sometimes</changefreq><priority>5</priority></url>
    </urlset>`;
    fetcher.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) throw new Error('none');
      return { url, body: badXml, status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', {});
    expect(r.data.sitemap.type).toBe('urlset');
    expect(r.data.sitemap.totalUrls).toBe(2);
    const bad = r.data.sitemap.urls!.find((u) => u.loc === 'ftp://bad/proto');
    expect(bad!.isValid).toBe(false);
    expect(bad!.errors.length).toBeGreaterThan(0);
  });

  it('truncates display to 1000 URLs and marks truncated', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) throw new Error('none');
      return { url, body: urlset(1200), status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', {});
    expect(r.data.sitemap.totalUrls).toBe(1200);
    expect(r.data.sitemap.displayedUrls).toBe(1000);
    expect(r.data.sitemap.truncated).toBe(true);
  });

  it('lists nested sitemaps for a sitemapindex (no follow → urlCount 0)', async () => {
    const index = `<sitemapindex>
      <sitemap><loc>https://example.com/s1.xml</loc></sitemap>
      <sitemap><loc>https://example.com/s2.xml</loc></sitemap>
      <sitemap><loc>https://example.com/s3.xml</loc></sitemap>
    </sitemapindex>`;
    fetcher.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) throw new Error('none');
      return { url, body: index, status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', {});
    expect(r.data.sitemap.type).toBe('index');
    expect(r.data.sitemap.isIndex).toBe(true);
    expect(r.data.sitemap.nestedSitemaps).toHaveLength(3);
    expect(r.data.sitemap.nestedSitemaps!.every((n) => n.urlCount === 0)).toBe(true);
  });

  it('follows nested sitemaps when followSitemapIndex=true', async () => {
    const index = `<sitemapindex>
      <sitemap><loc>https://example.com/s1.xml</loc></sitemap>
      <sitemap><loc>https://example.com/s2.xml</loc></sitemap>
    </sitemapindex>`;
    fetcher.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) throw new Error('none');
      if (url.endsWith('/sitemap.xml')) return { url, body: index, status: 200, headers: {} };
      return { url, body: urlset(4), status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', { followSitemapIndex: true });
    expect(r.data.sitemap.nestedSitemaps!.every((n) => n.urlCount === 4)).toBe(true);
    expect(r.data.sitemap.totalUrls).toBe(8);
  });

  it('returns type=empty for malformed XML', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) throw new Error('none');
      return { url, body: '<<< not xml >>>', status: 200, headers: {} };
    });
    const r = await svc.execute('https://example.com', {});
    expect(r.data.sitemap.type).toBe('empty');
  });
});
