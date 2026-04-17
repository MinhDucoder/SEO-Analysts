import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SitemapDiscovery, parseRobotsTxt, parseSitemapXml } from '../../src/crawler/infra/sitemap/sitemap-discovery';

describe('parseRobotsTxt', () => {
  it('extracts a single Sitemap: directive', () => {
    const txt = 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml';
    expect(parseRobotsTxt(txt)).toEqual(['https://example.com/sitemap.xml']);
  });

  it('extracts multiple Sitemap: directives', () => {
    const txt = [
      'Sitemap: https://example.com/sitemap-a.xml',
      'User-agent: *',
      'sitemap: https://example.com/sitemap-b.xml',
      'SITEMAP: https://example.com/sitemap-c.xml',
    ].join('\n');
    expect(parseRobotsTxt(txt)).toEqual([
      'https://example.com/sitemap-a.xml',
      'https://example.com/sitemap-b.xml',
      'https://example.com/sitemap-c.xml',
    ]);
  });

  it('ignores comments + other directives', () => {
    const txt = '# comment\nUser-agent: *\nAllow: /\nDisallow: /admin\n';
    expect(parseRobotsTxt(txt)).toEqual([]);
  });

  it('returns [] for empty input', () => {
    expect(parseRobotsTxt('')).toEqual([]);
  });
});

describe('parseSitemapXml', () => {
  it('parses a urlset with three URLs', () => {
    const xml = `<?xml version="1.0"?><urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/a</loc></url>
      <url><loc>https://example.com/b</loc></url>
      <url><loc>https://example.com/c</loc></url>
    </urlset>`;
    const result = parseSitemapXml(xml);
    expect(result.kind).toBe('urlset');
    expect(result.urls).toEqual(['https://example.com/a', 'https://example.com/b', 'https://example.com/c']);
    expect(result.subSitemaps).toEqual([]);
  });

  it('parses a sitemapindex with sub-sitemaps', () => {
    const xml = `<?xml version="1.0"?><sitemapindex xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
      <sitemap><loc>https://example.com/sitemap-2.xml</loc></sitemap>
    </sitemapindex>`;
    const result = parseSitemapXml(xml);
    expect(result.kind).toBe('sitemapindex');
    expect(result.subSitemaps).toEqual(['https://example.com/sitemap-1.xml', 'https://example.com/sitemap-2.xml']);
    expect(result.urls).toEqual([]);
  });

  it('truncates url list at MAX_URLS_PER_SITEMAP', () => {
    const urls = Array.from({ length: 60_000 }, (_, i) => `<url><loc>https://example.com/p${i}</loc></url>`).join('');
    const xml = `<urlset>${urls}</urlset>`;
    const result = parseSitemapXml(xml);
    expect(result.urls.length).toBe(50_000);
    expect(result.truncated).toBe(true);
  });

  it('returns empty result for malformed XML', () => {
    const result = parseSitemapXml('<not-xml><just<garbage>>');
    expect(result.urls).toEqual([]);
    expect(result.subSitemaps).toEqual([]);
  });

  it('trims whitespace around <loc> content', () => {
    const xml = `<urlset><url><loc>
      https://example.com/a
    </loc></url></urlset>`;
    const result = parseSitemapXml(xml);
    expect(result.urls).toEqual(['https://example.com/a']);
  });
});

describe('SitemapDiscovery.discoverAllUrls', () => {
  let http: { fetch: ReturnType<typeof vi.fn> };
  let discovery: SitemapDiscovery;

  beforeEach(() => {
    http = { fetch: vi.fn() };
    discovery = new SitemapDiscovery(http);
  });

  it('follows robots.txt -> sitemap -> url list', async () => {
    http.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) {
        return { status: 200, body: 'Sitemap: https://example.com/sitemap.xml', contentType: 'text/plain' };
      }
      if (url === 'https://example.com/sitemap.xml') {
        return {
          status: 200,
          body: '<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/about</loc></url></urlset>',
          contentType: 'application/xml',
        };
      }
      return { status: 404, body: '', contentType: 'text/plain' };
    });

    const urls = await discovery.discoverAllUrls('https://example.com/', 500);
    expect(urls).toEqual(['https://example.com/', 'https://example.com/about']);
  });

  it('falls back to /sitemap.xml when robots.txt has no Sitemap: directive', async () => {
    http.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) {
        return { status: 200, body: 'User-agent: *\nAllow: /', contentType: 'text/plain' };
      }
      if (url === 'https://example.com/sitemap.xml') {
        return {
          status: 200,
          body: '<urlset><url><loc>https://example.com/fallback</loc></url></urlset>',
          contentType: 'application/xml',
        };
      }
      return { status: 404, body: '', contentType: 'text/plain' };
    });
    const urls = await discovery.discoverAllUrls('https://example.com/', 500);
    expect(urls).toEqual(['https://example.com/fallback']);
  });

  it('recursively flattens a sitemap index (depth 2 max)', async () => {
    http.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) {
        return { status: 200, body: 'Sitemap: https://example.com/index.xml', contentType: 'text/plain' };
      }
      if (url.endsWith('/index.xml')) {
        return {
          status: 200,
          body: '<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>',
          contentType: 'application/xml',
        };
      }
      if (url.endsWith('/a.xml')) {
        return { status: 200, body: '<urlset><url><loc>https://example.com/a1</loc></url></urlset>', contentType: 'application/xml' };
      }
      if (url.endsWith('/b.xml')) {
        return { status: 200, body: '<urlset><url><loc>https://example.com/b1</loc></url></urlset>', contentType: 'application/xml' };
      }
      return { status: 404, body: '', contentType: 'text/plain' };
    });
    const urls = await discovery.discoverAllUrls('https://example.com/', 500);
    expect(urls.sort()).toEqual(['https://example.com/a1', 'https://example.com/b1']);
  });

  it('caps results at maxUrls', async () => {
    http.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) {
        return { status: 200, body: 'Sitemap: https://example.com/sitemap.xml', contentType: 'text/plain' };
      }
      const many = Array.from({ length: 100 }, (_, i) => `<url><loc>https://example.com/p${i}</loc></url>`).join('');
      return { status: 200, body: `<urlset>${many}</urlset>`, contentType: 'application/xml' };
    });
    const urls = await discovery.discoverAllUrls('https://example.com/', 10);
    expect(urls.length).toBe(10);
  });

  it('canonicalizes + dedupes URLs found in the sitemap', async () => {
    http.fetch.mockImplementation(async () => ({
      status: 200,
      body:
        '<urlset>' +
        '<url><loc>https://Example.COM/</loc></url>' +
        '<url><loc>https://example.com/?utm_source=x</loc></url>' +
        '<url><loc>https://example.com/about</loc></url>' +
        '</urlset>',
      contentType: 'application/xml',
    }));
    const urls = await discovery.discoverAllUrls('https://example.com/', 500);
    expect(urls).toEqual(['https://example.com/', 'https://example.com/about']);
  });

  it('returns empty array when neither robots nor /sitemap.xml exist', async () => {
    http.fetch.mockResolvedValue({ status: 404, body: '', contentType: 'text/plain' });
    const urls = await discovery.discoverAllUrls('https://example.com/', 500);
    expect(urls).toEqual([]);
  });

  it('ignores URLs pointing to a different registrable domain', async () => {
    http.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/robots.txt')) {
        return { status: 200, body: 'Sitemap: https://example.com/sitemap.xml', contentType: 'text/plain' };
      }
      return {
        status: 200,
        body:
          '<urlset>' +
          '<url><loc>https://example.com/keep</loc></url>' +
          '<url><loc>https://evil.com/drop</loc></url>' +
          '</urlset>',
        contentType: 'application/xml',
      };
    });
    const urls = await discovery.discoverAllUrls('https://example.com/', 500);
    expect(urls).toEqual(['https://example.com/keep']);
  });
});
