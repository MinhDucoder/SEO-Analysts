import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { CrawlerController } from '../../src/crawler/controllers/crawler.controller';
import { CrawlerOrchestrator } from '../../src/crawler/services/crawler.orchestrator';
import { CacheService } from '../../src/crawler/persistence/cache.service';
import { UrlValidator } from '../../src/crawler/domain/url-validator';
import { CheerioFetcher } from '../../src/crawler/infra/fetchers/cheerio-fetcher';
import { PlaywrightFetcher } from '../../src/crawler/infra/fetchers/playwright-fetcher';
import { PageDataExtractor } from '../../src/crawler/services/page-data-extractor';
import { BrowserPool } from '../../src/crawler/infra/fetchers/browser-pool';

// In-memory Redis stub — keeps the test self-contained
const memory = new Map<string, string>();
const fakeRedis = {
  get: vi.fn(async (k: string) => memory.get(k) ?? null),
  setex: vi.fn(async (k: string, _ttl: number, v: string) => {
    memory.set(k, v);
    return 'OK';
  }),
  publish: vi.fn(async () => 1),
  sadd: vi.fn(async () => 1),
  quit: vi.fn(async () => 'OK'),
};

// Lighthouse stub — real LH would launch Chrome and slow the suite
const makeCwv = (score: number) => ({
  lcpMs: 1500,
  inpMs: 100,
  cls: 0.05,
  performanceScore: score,
  accessibilityScore: 90,
  bestPracticesScore: 90,
  seoScore: 90,
});
const fakeLighthouse = {
  run: vi.fn().mockResolvedValue({ cwv: makeCwv(90), cached: false, durationMs: 1234, formFactor: 'mobile' }),
  runBoth: vi.fn().mockResolvedValue({
    mobile:  { cwv: makeCwv(90), cached: false, durationMs: 1234, formFactor: 'mobile' },
    desktop: { cwv: makeCwv(98), cached: false, durationMs: 1100, formFactor: 'desktop' },
  }),
};

describe('CrawlUrl E2E', () => {
  let controller: CrawlerController;
  let pool: BrowserPool;

  beforeAll(async () => {
    // Manually wire dependencies to avoid NestJS DI + esbuild decorator issues
    pool = new BrowserPool(1);
    const cache = new CacheService(fakeRedis as any);
    const validator = new UrlValidator();
    const cheerio = new CheerioFetcher();
    const playwright = new PlaywrightFetcher(pool);
    const extractor = new PageDataExtractor();
    const orchestrator = new CrawlerOrchestrator(
      validator,
      cache,
      cheerio,
      playwright,
      fakeLighthouse as any,
      extractor,
    );
    controller = new CrawlerController(orchestrator);
  }, 60_000);

  afterAll(async () => {
    await pool.shutdown();
  }, 60_000);

  it('crawls https://example.com via the Cheerio path', async () => {
    const response = await controller.crawlUrl({
      audit_id: '00000000-0000-0000-0000-000000000001',
      url: 'https://example.com/',
      options: { include_lighthouse: true },
    });

    expect(response.audit_id).toBe('00000000-0000-0000-0000-000000000001');
    expect(response.page_data.status_code).toBe(200);
    expect(response.page_data.title).toMatch(/example/i);
    expect(response.metadata.crawler_type).toBe('cheerio');
    expect(response.cwv_metrics.performance_score).toBe(90);
    expect(response.metadata.crawl_duration_ms).toBeGreaterThan(0);
  }, 30_000);

  it('returns the cached crawl on a second call (same URL)', async () => {
    fakeLighthouse.run.mockClear();
    fakeLighthouse.runBoth.mockClear();
    const response = await controller.crawlUrl({
      audit_id: '00000000-0000-0000-0000-000000000002',
      url: 'https://example.com/',
      options: { include_lighthouse: true },
    });
    expect(response.page_data.status_code).toBe(200);
    // Cache hit means the orchestrator returned early — Lighthouse not invoked again
    expect(fakeLighthouse.runBoth).not.toHaveBeenCalled();
  });

  it('rejects SSRF attempts at the controller boundary', async () => {
    await expect(
      controller.crawlUrl({
        audit_id: '00000000-0000-0000-0000-000000000003',
        url: 'http://127.0.0.1/admin',
      }),
    ).rejects.toThrow(/SSRF|loopback/i);
  });

  it('HealthCheck reports healthy', () => {
    const res = controller.healthCheck();
    expect(res.healthy).toBe(true);
    expect(typeof res.version).toBe('string');
    expect(res.uptime_seconds).toBeGreaterThanOrEqual(0);
  });
});
