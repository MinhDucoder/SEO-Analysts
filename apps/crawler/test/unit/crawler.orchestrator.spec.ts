import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CrawlerOrchestrator } from '../../src/crawler/services/crawler.orchestrator';

const baseFetch = {
  finalUrl: 'https://example.com/',
  statusCode: 200,
  responseTimeMs: 120,
  htmlSizeBytes: 1234,
  html: '<html lang="en"><head><title>Test Page</title></head><body><h1>Hi</h1><p>Plenty of static text content here filling the body well above any spa heuristic threshold so it is treated as a static page by the cheerio fetcher detection logic.</p></body></html>',
  redirectChain: [],
  contentEncoding: 'gzip',
  cacheControl: 'public',
  isSpa: false,
  fetcherType: 'cheerio' as const,
};

describe('CrawlerOrchestrator', () => {
  const validator = { validate: vi.fn().mockResolvedValue(undefined) };
  const cache = {
    getCrawl: vi.fn().mockResolvedValue(null),
    setCrawl: vi.fn().mockResolvedValue(undefined),
  };
  const cheerio = { fetch: vi.fn().mockResolvedValue(baseFetch) };
  const playwright = { fetch: vi.fn().mockResolvedValue({ ...baseFetch, fetcherType: 'playwright' as const }) };
  const lighthouse = {
    run: vi.fn().mockResolvedValue({
      cwv: { lcpMs: 1200, inpMs: 100, cls: 0.05, performanceScore: 90, accessibilityScore: 88, bestPracticesScore: 92, seoScore: 95 },
      cached: false,
      durationMs: 4321,
    }),
  };
  const extractor = {
    extract: vi.fn().mockImplementation((url: string, fetched: any) => ({
      url,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.statusCode,
      responseTimeMs: fetched.responseTimeMs,
      htmlSizeBytes: fetched.htmlSizeBytes,
      title: 'Test Page',
      h1Tags: ['Hi'],
      h2Tags: [], h3Tags: [], h4Tags: [], h5Tags: [], h6Tags: [],
      images: [], internalLinks: [], externalLinks: [],
      schemaJsonLd: [], openGraph: {}, twitterCard: {},
      isHttps: true, redirectChain: [], contentEncoding: 'gzip', cacheControl: 'public',
      textContent: 'text', rawHtml: fetched.html,
    })),
  };

  let orchestrator: CrawlerOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    cache.getCrawl.mockResolvedValue(null);
    cheerio.fetch.mockResolvedValue(baseFetch);
    playwright.fetch.mockResolvedValue({ ...baseFetch, fetcherType: 'playwright' });
    orchestrator = new CrawlerOrchestrator(
      validator as any,
      cache as any,
      cheerio as any,
      playwright as any,
      lighthouse as any,
      extractor as any,
    );
  });

  it('validates URL before fetching', async () => {
    await orchestrator.crawl('https://example.com/');
    expect(validator.validate).toHaveBeenCalledWith('https://example.com/');
  });

  it('returns cached result on cache hit and skips fetch', async () => {
    const cached = { pageData: { url: 'https://example.com/' }, cwvMetrics: {}, metadata: { crawlerType: 'cheerio' } };
    cache.getCrawl.mockResolvedValueOnce(cached);

    const result = await orchestrator.crawl('https://example.com/');
    expect(result).toEqual(cached);
    expect(cheerio.fetch).not.toHaveBeenCalled();
    expect(playwright.fetch).not.toHaveBeenCalled();
  });

  it('uses Cheerio path for static pages', async () => {
    const result = await orchestrator.crawl('https://example.com/');
    expect(cheerio.fetch).toHaveBeenCalled();
    expect(playwright.fetch).not.toHaveBeenCalled();
    expect(result.metadata.crawlerType).toBe('cheerio');
    expect(result.metadata.isSpa).toBe(false);
  });

  it('falls back to Playwright when Cheerio detects SPA', async () => {
    cheerio.fetch.mockResolvedValueOnce({ ...baseFetch, isSpa: true });
    const result = await orchestrator.crawl('https://spa.example.com/');
    expect(cheerio.fetch).toHaveBeenCalled();
    expect(playwright.fetch).toHaveBeenCalled();
    expect(result.metadata.crawlerType).toBe('playwright');
    expect(result.metadata.isSpa).toBe(true);
  });

  it('skips Cheerio when forcePlaywright is set', async () => {
    await orchestrator.crawl('https://example.com/', { forcePlaywright: true });
    expect(cheerio.fetch).not.toHaveBeenCalled();
    expect(playwright.fetch).toHaveBeenCalled();
  });

  it('runs Lighthouse when includeLighthouse is true (default)', async () => {
    const result = await orchestrator.crawl('https://example.com/');
    expect(lighthouse.run).toHaveBeenCalledWith('https://example.com/');
    expect(result.cwvMetrics.lcpMs).toBe(1200);
  });

  it('skips Lighthouse when includeLighthouse=false', async () => {
    const result = await orchestrator.crawl('https://example.com/', { includeLighthouse: false });
    expect(lighthouse.run).not.toHaveBeenCalled();
    expect(result.cwvMetrics.lcpMs).toBe(0);
    expect(result.metadata.lighthouseDurationMs).toBe(0);
  });

  it('caches the final result via CacheService.setCrawl', async () => {
    await orchestrator.crawl('https://example.com/');
    expect(cache.setCrawl).toHaveBeenCalledWith('https://example.com/', expect.any(Object));
  });

  it('reports lighthouseCached=true when LH cache hit', async () => {
    lighthouse.run.mockResolvedValueOnce({
      cwv: { lcpMs: 800, inpMs: 50, cls: 0.01, performanceScore: 99, accessibilityScore: 99, bestPracticesScore: 99, seoScore: 99 },
      cached: true,
      durationMs: 0,
    });
    const result = await orchestrator.crawl('https://example.com/');
    expect(result.metadata.lighthouseCached).toBe(true);
  });
});
