import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheerioFetcher } from '../../src/crawler/infra/fetchers/cheerio-fetcher';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

describe('CheerioFetcher', () => {
  let fetcher: CheerioFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new CheerioFetcher();
  });

  it('fetches a static HTML page and returns isSpa=false', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body><h1>Hello</h1><p>This is plenty of static text content rendered server-side that fills the body well above any threshold so it cannot possibly be flagged as a SPA placeholder by the heuristics.</p></body></html>',
      headers: { 'content-encoding': 'gzip', 'cache-control': 'public, max-age=3600' },
      request: { res: { responseUrl: 'https://example.com/' } },
    });

    const result = await fetcher.fetch('https://example.com/');

    expect(result.statusCode).toBe(200);
    expect(result.finalUrl).toBe('https://example.com/');
    expect(result.isSpa).toBe(false);
    expect(result.fetcherType).toBe('cheerio');
    expect(result.contentEncoding).toBe('gzip');
    expect(result.cacheControl).toBe('public, max-age=3600');
    expect(result.htmlSizeBytes).toBeGreaterThan(0);
  });

  it('detects SPA: empty <div id="root">', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body><div id="root"></div></body></html>',
      headers: {},
      request: { res: { responseUrl: 'https://spa.example.com/' } },
    });

    const result = await fetcher.fetch('https://spa.example.com/');
    expect(result.isSpa).toBe(true);
  });

  it('detects SPA: <div id="app"> with noscript warning', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body><div id="app"></div><noscript>You need to enable JavaScript</noscript></body></html>',
      headers: {},
      request: { res: { responseUrl: 'https://spa.example.com/' } },
    });

    const result = await fetcher.fetch('https://spa.example.com/');
    expect(result.isSpa).toBe(true);
  });

  it('detects SPA: window.__NEXT_DATA__ with minimal body', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body><div id="__next"></div><script id="__NEXT_DATA__">{}</script></body></html>',
      headers: {},
      request: { res: { responseUrl: 'https://nextjs.example.com/' } },
    });

    const result = await fetcher.fetch('https://nextjs.example.com/');
    expect(result.isSpa).toBe(true);
  });

  it('passes the user-agent header through', async () => {
    const get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body>x</body></html>',
      headers: {},
      request: { res: { responseUrl: 'https://example.com/' } },
    });
    mockedAxios.get = get;

    await fetcher.fetch('https://example.com/', { userAgent: 'CustomBot/1.0' });

    expect(get).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'CustomBot/1.0' }),
      }),
    );
  });

  it('records response time and final URL after redirects', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body>redirected content body that is long enough not to look like a single-page-application placeholder for testing purposes here</body></html>',
      headers: {},
      request: { res: { responseUrl: 'https://www.example.com/' } },
    });

    const result = await fetcher.fetch('https://example.com/');
    expect(result.finalUrl).toBe('https://www.example.com/');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });
});
