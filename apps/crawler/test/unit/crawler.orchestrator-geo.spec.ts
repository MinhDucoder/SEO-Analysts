import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CrawlerOrchestrator } from '../../src/crawler/services/crawler.orchestrator';

const baseFetch = {
  finalUrl: 'https://example.com/',
  statusCode: 200,
  responseTimeMs: 100,
  htmlSizeBytes: 500,
  html: '<html><body><h1>hi</h1><p>plenty of static text to avoid spa heuristic threshold which the cheerio fetcher uses by counting bytes in the body before invoking playwright fallback path</p></body></html>',
  redirectChain: [],
  contentEncoding: '',
  cacheControl: '',
  isSpa: false,
  fetcherType: 'cheerio' as const,
};

function makePageData(url: string) {
  return {
    url,
    finalUrl: url,
    statusCode: 200,
    responseTimeMs: 100,
    htmlSizeBytes: 500,
    h1Tags: [], h2Tags: [], h3Tags: [], h4Tags: [], h5Tags: [], h6Tags: [],
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
    textContent: '',
    rawHtml: '',
  } as any;
}

describe('CrawlerOrchestrator — GEO enrichment (runGeo flag)', () => {
  const validator = { validate: vi.fn().mockResolvedValue(undefined) };
  const cache = { getCrawl: vi.fn().mockResolvedValue(null), setCrawl: vi.fn().mockResolvedValue(undefined) };
  const cheerio = { fetch: vi.fn().mockResolvedValue(baseFetch) };
  const playwright = { fetch: vi.fn() };
  const lighthouse = { run: vi.fn(), runBoth: vi.fn() };
  const extractor = { extract: vi.fn().mockImplementation((url: string) => makePageData(url)) };
  const linkChecker = { checkAll: vi.fn() };
  const llmsTxtFetcher = { fetch: vi.fn() };

  const mockGlobalFetch = vi.fn();

  let orchestrator: CrawlerOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGlobalFetch.mockReset();
    vi.stubGlobal('fetch', mockGlobalFetch);
    cache.getCrawl.mockResolvedValue(null);
    cheerio.fetch.mockResolvedValue(baseFetch);
    extractor.extract.mockImplementation((url: string) => makePageData(url));
    orchestrator = new CrawlerOrchestrator(
      validator as any,
      cache as any,
      cheerio as any,
      playwright as any,
      lighthouse as any,
      extractor as any,
      linkChecker as any,
      llmsTxtFetcher as any,
    );
  });

  it('does not attach aiBotAccess or llmsTxt when runGeo is undefined', async () => {
    const result = await orchestrator.crawl('https://example.com/', { includeLighthouse: false });
    expect(result.pageData.aiBotAccess).toBeUndefined();
    expect(result.pageData.llmsTxt).toBeUndefined();
    expect(llmsTxtFetcher.fetch).not.toHaveBeenCalled();
  });

  it('attaches aiBotAccess + llmsTxt when runGeo is true', async () => {
    mockGlobalFetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => 'User-agent: GPTBot\nDisallow: /\n',
    });
    llmsTxtFetcher.fetch.mockResolvedValue({
      url: 'https://example.com/llms.txt',
      status: 200,
      h1: 'Example',
      sectionCount: 0,
      sizeBytes: 10,
    });

    const result = await orchestrator.crawl('https://example.com/', { includeLighthouse: false, runGeo: true });

    expect(llmsTxtFetcher.fetch).toHaveBeenCalledWith('https://example.com');
    expect(result.pageData.aiBotAccess).toEqual({
      robotsTxtUrl: 'https://example.com/robots.txt',
      robotsTxtStatus: 200,
      rules: [{ userAgent: 'GPTBot', disallow: ['/'], allow: [] }],
    });
    expect(result.pageData.llmsTxt).toEqual({
      url: 'https://example.com/llms.txt',
      status: 200,
      h1: 'Example',
      sectionCount: 0,
      sizeBytes: 10,
    });
  });

  it('still attaches llmsTxt if robots.txt fetch fails', async () => {
    mockGlobalFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    llmsTxtFetcher.fetch.mockResolvedValue({
      url: 'https://example.com/llms.txt',
      status: 404,
      sectionCount: 0,
      sizeBytes: 0,
    });

    const result = await orchestrator.crawl('https://example.com/', { includeLighthouse: false, runGeo: true });

    // robots.txt fetch failed → status -1, rules empty (parser returns []) → still attached
    expect(result.pageData.aiBotAccess).toEqual({
      robotsTxtUrl: 'https://example.com/robots.txt',
      robotsTxtStatus: -1,
      rules: [],
    });
    expect(result.pageData.llmsTxt?.status).toBe(404);
  });

  it('re-enriches a cache hit when runGeo flag is set but cached result lacks GEO data', async () => {
    const stalePageData = makePageData('https://example.com/');
    cache.getCrawl.mockResolvedValueOnce({
      pageData: stalePageData,
      cwvMetrics: { lcpMs: 0, inpMs: 0, cls: 0, performanceScore: 0, accessibilityScore: 0, bestPracticesScore: 0, seoScore: 0 },
      metadata: { crawlerType: 'cheerio', isSpa: false, crawlDurationMs: 100, lighthouseDurationMs: 0, lighthouseCached: false },
    });
    mockGlobalFetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => 'User-agent: GPTBot\nAllow: /\n',
    });
    llmsTxtFetcher.fetch.mockResolvedValue({
      url: 'https://example.com/llms.txt',
      status: 200,
      h1: 'Example',
      sectionCount: 0,
      sizeBytes: 10,
    });

    const result = await orchestrator.crawl('https://example.com/', { includeLighthouse: false, runGeo: true });

    expect(result.pageData.aiBotAccess).toBeDefined();
    expect(result.pageData.aiBotAccess?.rules).toHaveLength(1);
    expect(result.pageData.llmsTxt?.h1).toBe('Example');
    expect(cache.setCrawl).toHaveBeenCalledTimes(1);
    // cheerio fetcher should NOT have been called — we hit cache
    expect(cheerio.fetch).not.toHaveBeenCalled();
  });
});
