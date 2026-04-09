# Plan 3: Crawler Service Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD — where a Vitest spec file is listed before the implementation file, write the test first, watch it fail, then implement.

**Goal:** Implement the complete Crawler business logic on top of the scaffold produced by Plan 1 — a stateless NestJS microservice that fetches a URL using a Cheerio-first / Playwright-fallback strategy, runs Lighthouse for Core Web Vitals, extracts a full `PageData` object, caches results in Redis, exposes a gRPC `CrawlUrl` RPC, and consumes BullMQ `crawl.start` jobs to publish `crawl.done` events for the choreography pipeline.

**Architecture:** The crawler is **stateless** — no PostgreSQL, only Redis for caching and Pub/Sub. A request enters via either gRPC `CrawlUrl` (called by Gateway) or BullMQ `crawl.start` (enqueued by Gateway after audit creation). A `CrawlerOrchestrator` validates the URL (SSRF), checks Redis cache (`crawl:{sha256(url)}`, 30 min TTL), tries `CheerioFetcher` first (~200 ms), falls back to `PlaywrightFetcher` if SPA heuristics match, runs `LighthouseRunner` for CWV (cached `lighthouse:{sha256(url)}` 1 h), and returns `{pageData, cwvMetrics, metadata}`. The `CrawlerBullMQWorker` calls the same orchestrator, then publishes `crawl.done` (Redis Pub/Sub) and enqueues `analyze.start` + `keyword.start` jobs (choreography pattern — Report Service is responsible for the "wait for both" Redis counter).

**Tech Stack:** NestJS 10 (microservice), @nestjs/microservices (gRPC), @nestjs/bullmq 10, BullMQ 5, ioredis 5, axios 1.7, cheerio 1.0, playwright 1.48, lighthouse 12, chrome-launcher 1, Vitest 2.

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md` section 7 "Core Logic — Crawler Service" (decision tree, SPA heuristics, browser pool).

**Depends on:** Plan 1 (Foundation) — complete. The scaffold already provides `apps/crawler/src/main.ts` (gRPC bootstrap on port 50052), `AppModule`, `package.json` with axios/cheerio/playwright/bullmq/ioredis dependencies, and `packages/proto/crawler/v1/crawler.proto`.

---

## File Structure

Files produced by this plan (new, unless noted):

```
apps/crawler/
├── package.json                                  # MODIFY — add lighthouse, chrome-launcher
├── src/
│   ├── app.module.ts                             # MODIFY — wire CrawlerModule
│   ├── main.ts                                   # MODIFY — hybrid bootstrap (HTTP + gRPC + workers)
│   ├── crawler/
│   │   ├── crawler.module.ts
│   │   ├── crawler.orchestrator.ts
│   │   ├── crawler.controller.ts                 # gRPC controller (CrawlUrl + HealthCheck)
│   │   ├── crawler.worker.ts                     # BullMQ processor for crawl.start
│   │   ├── url-validator.ts
│   │   ├── cheerio-fetcher.ts
│   │   ├── playwright-fetcher.ts
│   │   ├── browser-pool.ts
│   │   ├── lighthouse-runner.ts
│   │   ├── page-data-extractor.ts
│   │   ├── cache.service.ts
│   │   ├── event-publisher.ts
│   │   └── interfaces/
│   │       ├── page-data.interface.ts            # PageData TS type (mirrors proto)
│   │       ├── crawl-result.interface.ts         # { pageData, cwvMetrics, metadata }
│   │       └── fetcher.interface.ts              # IFetcher contract
├── test/
│   ├── unit/
│   │   ├── url-validator.spec.ts
│   │   ├── cache.service.spec.ts
│   │   ├── cheerio-fetcher.spec.ts
│   │   ├── page-data-extractor.spec.ts
│   │   ├── browser-pool.spec.ts
│   │   ├── playwright-fetcher.spec.ts
│   │   ├── lighthouse-runner.spec.ts
│   │   └── crawler.orchestrator.spec.ts
│   └── integration/
│       └── crawl-url.e2e-spec.ts
└── vitest.config.ts                              # CREATE
```

---

## Task 1: Vitest Configuration & Test Setup

**Files:**
- Create: `apps/crawler/vitest.config.ts`
- Modify: `apps/crawler/package.json`

- [ ] **Step 1: Add lighthouse + chrome-launcher dependencies**

Modify `apps/crawler/package.json` — add the following entries to `dependencies`:

```json
"chrome-launcher": "^1.1.2",
"lighthouse": "^12.2.0"
```

And add to `devDependencies`:

```json
"@types/node": "^22.0.0"
```

Then run install from the repo root:

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN && npm install --workspace @seo/crawler
```

- [ ] **Step 2: Create vitest.config.ts**

Create `apps/crawler/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 60_000, // Playwright + Lighthouse can be slow
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/crawler/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/interfaces/**'],
    },
  },
  resolve: {
    alias: {
      '@crawler': resolve(__dirname, 'src/crawler'),
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/crawler/package.json apps/crawler/vitest.config.ts package-lock.json
git commit -m "chore(crawler): add lighthouse + chrome-launcher deps and vitest config"
```

---

## Task 2: URL Validator (SSRF Prevention)

**Files:**
- Create: `apps/crawler/src/crawler/url-validator.ts`
- Create: `apps/crawler/test/unit/url-validator.spec.ts`

- [ ] **Step 1: TDD — write failing tests**

Create `apps/crawler/test/unit/url-validator.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UrlValidator, UrlValidationError } from '../../src/crawler/url-validator';

describe('UrlValidator', () => {
  let validator: UrlValidator;

  beforeEach(() => {
    validator = new UrlValidator();
  });

  describe('syntactic checks', () => {
    it('accepts a valid https URL', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['93.184.216.34']);
      await expect(validator.validate('https://example.com/page')).resolves.toBeUndefined();
    });

    it('rejects non-http(s) protocols', async () => {
      await expect(validator.validate('ftp://example.com')).rejects.toThrow(UrlValidationError);
      await expect(validator.validate('file:///etc/passwd')).rejects.toThrow(UrlValidationError);
      await expect(validator.validate('javascript:alert(1)')).rejects.toThrow(UrlValidationError);
    });

    it('rejects malformed URLs', async () => {
      await expect(validator.validate('not-a-url')).rejects.toThrow(UrlValidationError);
      await expect(validator.validate('')).rejects.toThrow(UrlValidationError);
    });
  });

  describe('SSRF blocklist (literal hostnames)', () => {
    it.each([
      'http://localhost/admin',
      'http://127.0.0.1/',
      'http://127.0.0.5/',
      'http://[::1]/',
      'http://0.0.0.0/',
    ])('blocks literal blocklisted hostname: %s', async (url) => {
      await expect(validator.validate(url)).rejects.toThrow(/SSRF|private|loopback/i);
    });
  });

  describe('SSRF blocklist (private IP ranges after DNS resolution)', () => {
    it('blocks 10.0.0.0/8 after DNS resolution', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['10.1.2.3']);
      await expect(validator.validate('http://internal.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks 172.16.0.0/12', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['172.20.30.40']);
      await expect(validator.validate('http://internal.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks 192.168.0.0/16', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['192.168.1.1']);
      await expect(validator.validate('http://internal.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks 169.254.0.0/16 link-local', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['169.254.169.254']);
      await expect(validator.validate('http://metadata.example.com/')).rejects.toThrow(/link-local|private/i);
    });

    it('allows public IPv4', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['8.8.8.8']);
      await expect(validator.validate('http://dns.google/')).resolves.toBeUndefined();
    });
  });

  describe('SSRF blocklist (IPv6)', () => {
    it('blocks fc00::/7 unique-local', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['fc00::1']);
      await expect(validator.validate('http://v6.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks fe80::/10 link-local', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['fe80::1']);
      await expect(validator.validate('http://v6.example.com/')).rejects.toThrow(/link-local|private/i);
    });
  });

  describe('DNS rebinding defense', () => {
    it('rejects when DNS resolves to multiple IPs and any one is private', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['8.8.8.8', '10.0.0.1']);
      await expect(validator.validate('http://attacker.example.com/')).rejects.toThrow(/private/i);
    });
  });
});
```

- [ ] **Step 2: Implement UrlValidator**

Create `apps/crawler/src/crawler/url-validator.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

const LITERAL_BLOCKLIST = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
]);

@Injectable()
export class UrlValidator {
  async validate(rawUrl: string): Promise<void> {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new UrlValidationError('URL is required and must be a string');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new UrlValidationError(`Malformed URL: ${rawUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UrlValidationError(`Unsupported protocol: ${parsed.protocol}`);
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (LITERAL_BLOCKLIST.has(hostname)) {
      throw new UrlValidationError(`SSRF: blocked loopback/literal host ${hostname}`);
    }

    // If hostname is itself an IP literal, validate directly
    if (isIP(hostname)) {
      this.assertPublicIp(hostname);
      return;
    }

    // Resolve DNS and check every returned IP (rebinding defense)
    const ips = await this.resolveHost(hostname);
    if (ips.length === 0) {
      throw new UrlValidationError(`DNS resolution failed for ${hostname}`);
    }
    for (const ip of ips) {
      this.assertPublicIp(ip);
    }
  }

  protected async resolveHost(hostname: string): Promise<string[]> {
    try {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      return records.map((r) => r.address);
    } catch {
      return [];
    }
  }

  private assertPublicIp(ip: string): void {
    const v = isIP(ip);
    if (v === 4) {
      const [a, b] = ip.split('.').map(Number);
      // 10.0.0.0/8
      if (a === 10) throw new UrlValidationError(`SSRF: private IPv4 ${ip}`);
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) throw new UrlValidationError(`SSRF: private IPv4 ${ip}`);
      // 192.168.0.0/16
      if (a === 192 && b === 168) throw new UrlValidationError(`SSRF: private IPv4 ${ip}`);
      // 127.0.0.0/8 loopback
      if (a === 127) throw new UrlValidationError(`SSRF: loopback IPv4 ${ip}`);
      // 169.254.0.0/16 link-local
      if (a === 169 && b === 254) throw new UrlValidationError(`SSRF: link-local IPv4 ${ip}`);
      // 0.0.0.0/8
      if (a === 0) throw new UrlValidationError(`SSRF: invalid IPv4 ${ip}`);
      return;
    }
    if (v === 6) {
      const lower = ip.toLowerCase();
      if (lower === '::1' || lower === '::') {
        throw new UrlValidationError(`SSRF: loopback IPv6 ${ip}`);
      }
      // fc00::/7 (unique local) → first byte 0xfc or 0xfd
      if (/^f[cd][0-9a-f]{2}:/.test(lower)) {
        throw new UrlValidationError(`SSRF: private IPv6 ${ip}`);
      }
      // fe80::/10 (link-local)
      if (/^fe[89ab][0-9a-f]:/.test(lower)) {
        throw new UrlValidationError(`SSRF: link-local IPv6 ${ip}`);
      }
      return;
    }
    throw new UrlValidationError(`Invalid IP address: ${ip}`);
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
cd apps/crawler && npm test -- url-validator
git add apps/crawler/src/crawler/url-validator.ts apps/crawler/test/unit/url-validator.spec.ts
git commit -m "feat(crawler): add SSRF-safe UrlValidator with DNS rebinding defense"
```

---

## Task 3: CacheService (Redis Wrapper)

**Files:**
- Create: `apps/crawler/src/crawler/cache.service.ts`
- Create: `apps/crawler/test/unit/cache.service.spec.ts`

- [ ] **Step 1: TDD — write failing tests with mocked ioredis**

Create `apps/crawler/test/unit/cache.service.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CacheService } from '../../src/crawler/cache.service';
import { CACHE_TTL } from '@repo/shared';

const fakeRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  quit: vi.fn(),
};

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheService(fakeRedis as any);
  });

  it('hashes URLs deterministically with sha256', () => {
    const a = cache.hashUrl('https://example.com/');
    const b = cache.hashUrl('https://example.com/');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different URLs', () => {
    expect(cache.hashUrl('https://a.com/')).not.toBe(cache.hashUrl('https://b.com/'));
  });

  it('writes crawl results with the configured TTL', async () => {
    await cache.setCrawl('https://example.com/', { foo: 'bar' });
    expect(fakeRedis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^crawl:[a-f0-9]{64}$/),
      CACHE_TTL.CRAWL_SECONDS,
      JSON.stringify({ foo: 'bar' }),
    );
  });

  it('returns parsed crawl result on hit', async () => {
    fakeRedis.get.mockResolvedValueOnce(JSON.stringify({ ok: true }));
    const result = await cache.getCrawl('https://example.com/');
    expect(result).toEqual({ ok: true });
  });

  it('returns null on cache miss', async () => {
    fakeRedis.get.mockResolvedValueOnce(null);
    const result = await cache.getCrawl('https://example.com/');
    expect(result).toBeNull();
  });

  it('writes lighthouse results with 1h TTL', async () => {
    await cache.setLighthouse('https://example.com/', { lcpMs: 1200 });
    expect(fakeRedis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^lighthouse:[a-f0-9]{64}$/),
      CACHE_TTL.LIGHTHOUSE_SECONDS,
      JSON.stringify({ lcpMs: 1200 }),
    );
  });

  it('returns null when stored JSON is corrupted', async () => {
    fakeRedis.get.mockResolvedValueOnce('not-json');
    const result = await cache.getCrawl('https://example.com/');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Implement CacheService**

Create `apps/crawler/src/crawler/cache.service.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Redis } from 'ioredis';
import { CACHE_TTL, REDIS_KEYS } from '@repo/shared';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  hashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }

  async getCrawl<T = unknown>(url: string): Promise<T | null> {
    const key = REDIS_KEYS.crawlCache(this.hashUrl(url));
    return this.safeGet<T>(key);
  }

  async setCrawl(url: string, value: unknown): Promise<void> {
    const key = REDIS_KEYS.crawlCache(this.hashUrl(url));
    await this.redis.setex(key, CACHE_TTL.CRAWL_SECONDS, JSON.stringify(value));
  }

  async getLighthouse<T = unknown>(url: string): Promise<T | null> {
    const key = REDIS_KEYS.lighthouseCache(this.hashUrl(url));
    return this.safeGet<T>(key);
  }

  async setLighthouse(url: string, value: unknown): Promise<void> {
    const key = REDIS_KEYS.lighthouseCache(this.hashUrl(url));
    await this.redis.setex(key, CACHE_TTL.LIGHTHOUSE_SECONDS, JSON.stringify(value));
  }

  private async safeGet<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Corrupted cache entry at ${key}: ${(err as Error).message}`);
      return null;
    }
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
cd apps/crawler && npm test -- cache.service
git add apps/crawler/src/crawler/cache.service.ts apps/crawler/test/unit/cache.service.spec.ts
git commit -m "feat(crawler): add CacheService Redis wrapper for crawl + lighthouse caches"
```

---

## Task 4: CheerioFetcher + SPA Detection

**Files:**
- Create: `apps/crawler/src/crawler/interfaces/fetcher.interface.ts`
- Create: `apps/crawler/src/crawler/cheerio-fetcher.ts`
- Create: `apps/crawler/test/unit/cheerio-fetcher.spec.ts`

- [ ] **Step 1: Define IFetcher contract**

Create `apps/crawler/src/crawler/interfaces/fetcher.interface.ts`:

```ts
export interface FetchResult {
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSizeBytes: number;
  html: string;
  redirectChain: string[];
  contentEncoding: string;
  cacheControl: string;
  isSpa: boolean;
  fetcherType: 'cheerio' | 'playwright';
}

export interface IFetcher {
  fetch(url: string, options?: { userAgent?: string; timeoutMs?: number }): Promise<FetchResult>;
}
```

- [ ] **Step 2: TDD — write failing tests with mocked axios**

Create `apps/crawler/test/unit/cheerio-fetcher.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheerioFetcher } from '../../src/crawler/cheerio-fetcher';

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
```

- [ ] **Step 3: Implement CheerioFetcher**

Create `apps/crawler/src/crawler/cheerio-fetcher.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { FetchResult, IFetcher } from './interfaces/fetcher.interface';

const DEFAULT_USER_AGENT = 'SEOAnalystBot/1.0 (+https://seo-analyst.local)';
const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class CheerioFetcher implements IFetcher {
  private readonly logger = new Logger(CheerioFetcher.name);

  async fetch(
    url: string,
    options: { userAgent?: string; timeoutMs?: number } = {},
  ): Promise<FetchResult> {
    const start = Date.now();
    const response: AxiosResponse<string> = await axios.get(url, {
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true, // we report any status, never throw
      responseType: 'text',
      transformResponse: (v) => v,
      headers: {
        'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    const responseTimeMs = Date.now() - start;

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    const finalUrl =
      (response.request && response.request.res && response.request.res.responseUrl) || url;
    const isSpa = this.detectSpa(html);

    return {
      finalUrl,
      statusCode: response.status,
      responseTimeMs,
      htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
      html,
      redirectChain: finalUrl !== url ? [url, finalUrl] : [],
      contentEncoding: String(response.headers['content-encoding'] ?? ''),
      cacheControl: String(response.headers['cache-control'] ?? ''),
      isSpa,
      fetcherType: 'cheerio',
    };
  }

  detectSpa(html: string): boolean {
    if (!html || html.length === 0) return false;
    const $ = cheerio.load(html);
    const body = $('body');
    const bodyText = body.text().trim();
    const bodyHtml = body.html() ?? '';

    // Heuristic 1: tiny body containing common SPA mount nodes
    const hasSpaMount =
      $('#root').length > 0 ||
      $('#app').length > 0 ||
      $('#__next').length > 0;
    if (hasSpaMount && bodyText.length < 500) return true;

    // Heuristic 2: noscript JS-required warning
    const noscriptText = $('noscript').text().toLowerCase();
    if (
      noscriptText.includes('enable javascript') ||
      noscriptText.includes('javascript is required')
    ) {
      if (bodyText.length < 1500) return true;
    }

    // Heuristic 3: __NEXT_DATA__ marker with minimal visible content
    if (bodyHtml.includes('__NEXT_DATA__') && bodyText.length < 500) return true;

    return false;
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
cd apps/crawler && npm test -- cheerio-fetcher
git add apps/crawler/src/crawler/cheerio-fetcher.ts apps/crawler/src/crawler/interfaces/fetcher.interface.ts apps/crawler/test/unit/cheerio-fetcher.spec.ts
git commit -m "feat(crawler): add CheerioFetcher with SPA detection heuristics"
```

---

## Task 5: PageDataExtractor

**Files:**
- Create: `apps/crawler/src/crawler/interfaces/page-data.interface.ts`
- Create: `apps/crawler/src/crawler/page-data-extractor.ts`
- Create: `apps/crawler/test/unit/page-data-extractor.spec.ts`

- [ ] **Step 1: Define PageData TS type (mirrors proto)**

Create `apps/crawler/src/crawler/interfaces/page-data.interface.ts`:

```ts
import { ImageInfo, LinkInfo } from '@repo/shared';

export interface PageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSizeBytes: number;
  title?: string;
  metaDescription?: string;
  metaRobots?: string;
  canonicalUrl?: string;
  language?: string;
  faviconUrl?: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  h4Tags: string[];
  h5Tags: string[];
  h6Tags: string[];
  images: ImageInfo[];
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
  schemaJsonLd: string[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  isHttps: boolean;
  redirectChain: string[];
  contentEncoding: string;
  cacheControl: string;
  viewportContent?: string;
  textContent: string;
  rawHtml: string;
}
```

- [ ] **Step 2: TDD — write failing tests**

Create `apps/crawler/test/unit/page-data-extractor.spec.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { PageDataExtractor } from '../../src/crawler/page-data-extractor';
import { FetchResult } from '../../src/crawler/interfaces/fetcher.interface';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Sample Page Title</title>
    <meta name="description" content="A sample meta description used for testing.">
    <meta name="robots" content="index,follow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://example.com/sample">
    <link rel="icon" href="/favicon.ico">
    <meta property="og:title" content="OG Sample">
    <meta property="og:image" content="https://example.com/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Sample"}</script>
  </head>
  <body>
    <header>Site header</header>
    <nav>Nav links</nav>
    <main>
      <h1>Main Heading</h1>
      <h2>Section A</h2>
      <h2>Section B</h2>
      <h3>Sub heading</h3>
      <p>Some paragraph text describing the page.</p>
      <img src="/a.webp" alt="Image A">
      <img src="https://cdn.example.com/b.png" alt="">
      <a href="/internal">Internal link</a>
      <a href="https://other.com/x">External link</a>
      <a href="https://example.com/page2">Same-host link</a>
    </main>
    <footer>Footer text</footer>
    <script>console.log('should not appear in textContent')</script>
    <style>.x{color:red}</style>
  </body>
</html>
`;

const baseFetch: FetchResult = {
  finalUrl: 'https://example.com/sample',
  statusCode: 200,
  responseTimeMs: 250,
  htmlSizeBytes: Buffer.byteLength(SAMPLE_HTML, 'utf8'),
  html: SAMPLE_HTML,
  redirectChain: [],
  contentEncoding: 'gzip',
  cacheControl: 'public, max-age=3600',
  isSpa: false,
  fetcherType: 'cheerio',
};

describe('PageDataExtractor', () => {
  let extractor: PageDataExtractor;

  beforeEach(() => {
    extractor = new PageDataExtractor();
  });

  it('extracts title and meta tags', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.title).toBe('Sample Page Title');
    expect(data.metaDescription).toBe('A sample meta description used for testing.');
    expect(data.metaRobots).toBe('index,follow');
    expect(data.viewportContent).toBe('width=device-width, initial-scale=1');
    expect(data.canonicalUrl).toBe('https://example.com/sample');
    expect(data.language).toBe('en');
    expect(data.faviconUrl).toBe('/favicon.ico');
  });

  it('extracts headings h1-h6', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.h1Tags).toEqual(['Main Heading']);
    expect(data.h2Tags).toEqual(['Section A', 'Section B']);
    expect(data.h3Tags).toEqual(['Sub heading']);
    expect(data.h4Tags).toEqual([]);
  });

  it('extracts images with alt text', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.images).toHaveLength(2);
    expect(data.images[0].src).toBe('/a.webp');
    expect(data.images[0].alt).toBe('Image A');
    expect(data.images[0].format).toBe('webp');
    expect(data.images[1].alt).toBe('');
    expect(data.images[1].format).toBe('png');
  });

  it('classifies links as internal vs external', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.internalLinks.length).toBe(2);
    expect(data.externalLinks.length).toBe(1);
    expect(data.internalLinks.find((l) => l.href === '/internal')).toBeDefined();
    expect(data.externalLinks[0].href).toBe('https://other.com/x');
  });

  it('extracts JSON-LD schemas', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.schemaJsonLd).toHaveLength(1);
    expect(JSON.parse(data.schemaJsonLd[0]).name).toBe('Sample');
  });

  it('extracts open graph and twitter card maps', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.openGraph['og:title']).toBe('OG Sample');
    expect(data.openGraph['og:image']).toBe('https://example.com/og.png');
    expect(data.twitterCard['twitter:card']).toBe('summary_large_image');
  });

  it('strips script/style/nav/header/footer from textContent', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.textContent).toContain('Some paragraph text');
    expect(data.textContent).not.toContain('console.log');
    expect(data.textContent).not.toContain('color:red');
    expect(data.textContent).not.toContain('Site header');
    expect(data.textContent).not.toContain('Footer text');
  });

  it('marks isHttps based on final URL', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.isHttps).toBe(true);

    const httpData = extractor.extract('http://example.com/sample', {
      ...baseFetch,
      finalUrl: 'http://example.com/sample',
    });
    expect(httpData.isHttps).toBe(false);
  });

  it('returns empty arrays for missing elements gracefully', () => {
    const minimal: FetchResult = { ...baseFetch, html: '<html><body></body></html>' };
    const data = extractor.extract('https://example.com/', minimal);
    expect(data.h1Tags).toEqual([]);
    expect(data.images).toEqual([]);
    expect(data.internalLinks).toEqual([]);
    expect(data.title).toBeUndefined();
  });
});
```

- [ ] **Step 3: Implement PageDataExtractor**

Create `apps/crawler/src/crawler/page-data-extractor.ts`:

```ts
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ImageInfo, LinkInfo } from '@repo/shared';
import { FetchResult } from './interfaces/fetcher.interface';
import { PageData } from './interfaces/page-data.interface';

@Injectable()
export class PageDataExtractor {
  extract(url: string, fetched: FetchResult): PageData {
    const $ = cheerio.load(fetched.html);
    const finalUrl = fetched.finalUrl || url;
    const finalHost = this.safeHostname(finalUrl);

    const title = $('head > title').first().text().trim() || undefined;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
    const metaRobots = $('meta[name="robots"]').attr('content')?.trim() || undefined;
    const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
    const language = $('html').attr('lang')?.trim() || undefined;
    const viewportContent = $('meta[name="viewport"]').attr('content')?.trim() || undefined;
    const faviconUrl =
      $('link[rel="icon"]').attr('href')?.trim() ||
      $('link[rel="shortcut icon"]').attr('href')?.trim() ||
      undefined;

    const headings = (selector: string): string[] =>
      $(selector)
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 0);

    const images: ImageInfo[] = $('img')
      .map((_, el) => {
        const src = $(el).attr('src') ?? '';
        const alt = $(el).attr('alt');
        return {
          src,
          alt: alt ?? null,
          sizeBytes: 0, // size not fetched here; LighthouseRunner provides perf signals
          format: this.detectFormat(src),
        } satisfies ImageInfo;
      })
      .get()
      .filter((img) => img.src.length > 0);

    const internalLinks: LinkInfo[] = [];
    const externalLinks: LinkInfo[] = [];
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') ?? '').trim();
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
      const anchor = $(el).text().trim();
      const rel = $(el).attr('rel') ?? null;
      const isInternal = this.isInternalLink(href, finalHost);
      const link: LinkInfo = {
        href,
        anchorText: anchor,
        isInternal,
        rel,
        statusCode: 0, // not fetched per-link in this stage
      };
      if (isInternal) internalLinks.push(link);
      else externalLinks.push(link);
    });

    const schemaJsonLd: string[] = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).contents().text().trim())
      .get()
      .filter((s) => s.length > 0);

    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property');
      const content = $(el).attr('content');
      if (prop && content) openGraph[prop] = content;
    });

    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) twitterCard[name] = content;
    });

    // Build text content: clone, strip noise, get body text
    const $clone = cheerio.load(fetched.html);
    $clone('script, style, noscript, nav, header, footer, svg').remove();
    const textContent = $clone('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      finalUrl,
      statusCode: fetched.statusCode,
      responseTimeMs: fetched.responseTimeMs,
      htmlSizeBytes: fetched.htmlSizeBytes,
      title,
      metaDescription,
      metaRobots,
      canonicalUrl,
      language,
      faviconUrl,
      h1Tags: headings('h1'),
      h2Tags: headings('h2'),
      h3Tags: headings('h3'),
      h4Tags: headings('h4'),
      h5Tags: headings('h5'),
      h6Tags: headings('h6'),
      images,
      internalLinks,
      externalLinks,
      schemaJsonLd,
      openGraph,
      twitterCard,
      isHttps: finalUrl.startsWith('https://'),
      redirectChain: fetched.redirectChain,
      contentEncoding: fetched.contentEncoding,
      cacheControl: fetched.cacheControl,
      viewportContent,
      textContent,
      rawHtml: fetched.html,
    };
  }

  private safeHostname(u: string): string {
    try {
      return new URL(u).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private isInternalLink(href: string, baseHost: string): boolean {
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    try {
      const parsed = new URL(href);
      return parsed.hostname.toLowerCase() === baseHost;
    } catch {
      return true; // relative or malformed → treat as internal
    }
  }

  private detectFormat(src: string): string {
    const m = src.toLowerCase().match(/\.(webp|avif|png|jpe?g|gif|svg|bmp)(?:\?|$)/);
    return m ? m[1].replace('jpeg', 'jpg') : 'unknown';
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
cd apps/crawler && npm test -- page-data-extractor
git add apps/crawler/src/crawler/page-data-extractor.ts apps/crawler/src/crawler/interfaces/page-data.interface.ts apps/crawler/test/unit/page-data-extractor.spec.ts
git commit -m "feat(crawler): add PageDataExtractor for full SEO field extraction"
```

---

## Task 6: BrowserPool

**Files:**
- Create: `apps/crawler/src/crawler/browser-pool.ts`
- Create: `apps/crawler/test/unit/browser-pool.spec.ts`

- [ ] **Step 1: TDD — write tests with mocked playwright**

Create `apps/crawler/test/unit/browser-pool.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BrowserPool } from '../../src/crawler/browser-pool';

const fakeContext = { close: vi.fn().mockResolvedValue(undefined) };
const fakeBrowser = {
  newContext: vi.fn().mockResolvedValue(fakeContext),
  close: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
};

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(fakeBrowser),
  },
}));

import { chromium } from 'playwright';

describe('BrowserPool', () => {
  let pool: BrowserPool;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeBrowser.newContext.mockResolvedValue(fakeContext);
    fakeBrowser.isConnected.mockReturnValue(true);
    (chromium.launch as any).mockResolvedValue(fakeBrowser);
    pool = new BrowserPool(2);
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  it('launches a browser on first acquire', async () => {
    const ctx = await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.newContext).toHaveBeenCalledTimes(1);
    expect(ctx).toBe(fakeContext);
  });

  it('reuses an existing browser when available', async () => {
    const a = await pool.acquire();
    await pool.release(a);
    const b = await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(b).toBe(fakeContext);
  });

  it('respects maxSize and creates up to max browsers', async () => {
    await pool.acquire();
    await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledTimes(2);
  });

  it('queues acquire calls when pool is saturated', async () => {
    const a = await pool.acquire();
    const b = await pool.acquire();
    let resolvedThird = false;
    const third = pool.acquire().then((ctx) => {
      resolvedThird = true;
      return ctx;
    });
    // Briefly yield — third must still be pending
    await new Promise((r) => setImmediate(r));
    expect(resolvedThird).toBe(false);

    await pool.release(a);
    const ctx = await third;
    expect(resolvedThird).toBe(true);
    expect(ctx).toBeDefined();

    await pool.release(b);
    await pool.release(ctx);
  });

  it('shutdown closes all browsers', async () => {
    await pool.acquire();
    await pool.acquire();
    await pool.shutdown();
    expect(fakeBrowser.close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement BrowserPool**

Create `apps/crawler/src/crawler/browser-pool.ts`:

```ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Browser, BrowserContext, chromium } from 'playwright';

interface PoolEntry {
  browser: Browser;
  inUse: boolean;
}

@Injectable()
export class BrowserPool implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserPool.name);
  private readonly entries: PoolEntry[] = [];
  private readonly waiters: Array<(entry: PoolEntry) => void> = [];

  constructor(private readonly maxSize: number = 3) {}

  async acquire(): Promise<BrowserContext> {
    const entry = await this.acquireEntry();
    const context = await entry.browser.newContext({
      userAgent: 'SEOAnalystBot/1.0 (+https://seo-analyst.local)',
      ignoreHTTPSErrors: false,
    });
    // Tag context with its owning entry so release() can find it
    (context as unknown as { __poolEntry: PoolEntry }).__poolEntry = entry;
    return context;
  }

  async release(context: BrowserContext): Promise<void> {
    const tagged = context as unknown as { __poolEntry?: PoolEntry };
    try {
      await context.close();
    } catch (err) {
      this.logger.warn(`Failed closing context: ${(err as Error).message}`);
    }
    const entry = tagged.__poolEntry;
    if (!entry) return;
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next(entry); // hand off without flipping inUse
      return;
    }
    entry.inUse = false;
  }

  async shutdown(): Promise<void> {
    this.waiters.length = 0;
    for (const entry of this.entries) {
      try {
        await entry.browser.close();
      } catch (err) {
        this.logger.warn(`Failed closing browser: ${(err as Error).message}`);
      }
    }
    this.entries.length = 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  private async acquireEntry(): Promise<PoolEntry> {
    // Look for an idle entry
    const idle = this.entries.find((e) => !e.inUse && e.browser.isConnected());
    if (idle) {
      idle.inUse = true;
      return idle;
    }

    // Capacity available → spin up a new browser
    if (this.entries.length < this.maxSize) {
      const browser = await chromium.launch({ headless: true });
      const entry: PoolEntry = { browser, inUse: true };
      this.entries.push(entry);
      return entry;
    }

    // Pool saturated → wait for a release
    return new Promise<PoolEntry>((resolve) => {
      this.waiters.push((entry) => {
        entry.inUse = true;
        resolve(entry);
      });
    });
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
cd apps/crawler && npm test -- browser-pool
git add apps/crawler/src/crawler/browser-pool.ts apps/crawler/test/unit/browser-pool.spec.ts
git commit -m "feat(crawler): add BrowserPool with max-3 reuse and saturation queueing"
```

---

## Task 7: PlaywrightFetcher

**Files:**
- Create: `apps/crawler/src/crawler/playwright-fetcher.ts`
- Create: `apps/crawler/test/unit/playwright-fetcher.spec.ts`

- [ ] **Step 1: TDD — write tests with a fake BrowserPool**

Create `apps/crawler/test/unit/playwright-fetcher.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PlaywrightFetcher } from '../../src/crawler/playwright-fetcher';

describe('PlaywrightFetcher', () => {
  let fetcher: PlaywrightFetcher;
  const fakeResponse = {
    status: vi.fn().mockReturnValue(200),
    url: vi.fn().mockReturnValue('https://example.com/final'),
    headers: vi.fn().mockReturnValue({
      'content-encoding': 'br',
      'cache-control': 'no-cache',
    }),
  };
  const fakePage = {
    goto: vi.fn().mockResolvedValue(fakeResponse),
    content: vi.fn().mockResolvedValue('<html><body>Rendered content</body></html>'),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const fakeContext = {
    newPage: vi.fn().mockResolvedValue(fakePage),
  };
  const fakePool = {
    acquire: vi.fn().mockResolvedValue(fakeContext),
    release: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fakePool.acquire.mockResolvedValue(fakeContext);
    fakeContext.newPage.mockResolvedValue(fakePage);
    fakePage.goto.mockResolvedValue(fakeResponse);
    fakePage.content.mockResolvedValue('<html><body>Rendered content body that is long enough to not look like a SPA placeholder for testing.</body></html>');
    fetcher = new PlaywrightFetcher(fakePool as any);
  });

  it('renders a URL and returns the rendered HTML', async () => {
    const result = await fetcher.fetch('https://example.com/');
    expect(fakePool.acquire).toHaveBeenCalled();
    expect(fakePage.goto).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ waitUntil: 'networkidle', timeout: 30_000 }),
    );
    expect(result.statusCode).toBe(200);
    expect(result.finalUrl).toBe('https://example.com/final');
    expect(result.html).toContain('Rendered content');
    expect(result.fetcherType).toBe('playwright');
    expect(result.contentEncoding).toBe('br');
  });

  it('releases the context even if goto throws', async () => {
    fakePage.goto.mockRejectedValueOnce(new Error('navigation timeout'));
    await expect(fetcher.fetch('https://example.com/')).rejects.toThrow('navigation timeout');
    expect(fakePool.release).toHaveBeenCalledWith(fakeContext);
  });

  it('records redirect chain when final URL differs', async () => {
    const result = await fetcher.fetch('https://example.com/');
    expect(result.redirectChain).toEqual(['https://example.com/', 'https://example.com/final']);
  });
});
```

- [ ] **Step 2: Implement PlaywrightFetcher**

Create `apps/crawler/src/crawler/playwright-fetcher.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { FetchResult, IFetcher } from './interfaces/fetcher.interface';

const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class PlaywrightFetcher implements IFetcher {
  constructor(private readonly pool: BrowserPool) {}

  async fetch(
    url: string,
    options: { userAgent?: string; timeoutMs?: number } = {},
  ): Promise<FetchResult> {
    const start = Date.now();
    const context = await this.pool.acquire();
    try {
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      });
      const html = await page.content();
      const responseTimeMs = Date.now() - start;
      const finalUrl = response?.url() ?? url;
      const headers = response?.headers() ?? {};

      await page.close();

      return {
        finalUrl,
        statusCode: response?.status() ?? 0,
        responseTimeMs,
        htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
        html,
        redirectChain: finalUrl !== url ? [url, finalUrl] : [],
        contentEncoding: String(headers['content-encoding'] ?? ''),
        cacheControl: String(headers['cache-control'] ?? ''),
        isSpa: false, // Playwright always renders fully — never flagged
        fetcherType: 'playwright',
      };
    } finally {
      await this.pool.release(context);
    }
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
cd apps/crawler && npm test -- playwright-fetcher
git add apps/crawler/src/crawler/playwright-fetcher.ts apps/crawler/test/unit/playwright-fetcher.spec.ts
git commit -m "feat(crawler): add PlaywrightFetcher with networkidle wait and pool release safety"
```

---

## Task 8: LighthouseRunner

**Files:**
- Create: `apps/crawler/src/crawler/lighthouse-runner.ts`
- Create: `apps/crawler/test/unit/lighthouse-runner.spec.ts`

- [ ] **Step 1: TDD — write tests with mocked lighthouse + chrome-launcher**

Create `apps/crawler/test/unit/lighthouse-runner.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockLaunch = vi.fn();
vi.mock('chrome-launcher', () => ({
  launch: (...args: unknown[]) => mockLaunch(...args),
}));

const mockLighthouse = vi.fn();
vi.mock('lighthouse', () => ({
  default: (...args: unknown[]) => mockLighthouse(...args),
}));

import { LighthouseRunner } from '../../src/crawler/lighthouse-runner';
import { CacheService } from '../../src/crawler/cache.service';

describe('LighthouseRunner', () => {
  let runner: LighthouseRunner;
  const fakeChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) };
  const cacheGet = vi.fn();
  const cacheSet = vi.fn();
  const cache = { getLighthouse: cacheGet, setLighthouse: cacheSet } as unknown as CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunch.mockResolvedValue(fakeChrome);
    cacheGet.mockResolvedValue(null);
    runner = new LighthouseRunner(cache);
  });

  it('returns cached result when present and skips lighthouse call', async () => {
    cacheGet.mockResolvedValueOnce({
      lcpMs: 1200,
      inpMs: 100,
      cls: 0.05,
      performanceScore: 95,
      accessibilityScore: 90,
      bestPracticesScore: 88,
      seoScore: 92,
    });

    const result = await runner.run('https://example.com/');
    expect(result.cwv.lcpMs).toBe(1200);
    expect(result.cached).toBe(true);
    expect(mockLighthouse).not.toHaveBeenCalled();
    expect(mockLaunch).not.toHaveBeenCalled();
  });

  it('runs lighthouse on cache miss and writes result to cache', async () => {
    mockLighthouse.mockResolvedValueOnce({
      lhr: {
        audits: {
          'largest-contentful-paint': { numericValue: 2100 },
          'interaction-to-next-paint': { numericValue: 180 },
          'cumulative-layout-shift': { numericValue: 0.08 },
        },
        categories: {
          performance: { score: 0.87 },
          accessibility: { score: 0.92 },
          'best-practices': { score: 0.95 },
          seo: { score: 0.9 },
        },
      },
    });

    const result = await runner.run('https://example.com/');

    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ chromeFlags: expect.arrayContaining(['--headless']) }),
    );
    expect(mockLighthouse).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ port: 9222, output: 'json' }),
      expect.objectContaining({ extends: 'lighthouse:default' }),
    );
    expect(result.cwv.lcpMs).toBe(2100);
    expect(result.cwv.inpMs).toBe(180);
    expect(result.cwv.cls).toBeCloseTo(0.08);
    expect(result.cwv.performanceScore).toBe(87);
    expect(result.cwv.accessibilityScore).toBe(92);
    expect(result.cwv.bestPracticesScore).toBe(95);
    expect(result.cwv.seoScore).toBe(90);
    expect(result.cached).toBe(false);
    expect(cacheSet).toHaveBeenCalledWith('https://example.com/', expect.objectContaining({ lcpMs: 2100 }));
    expect(fakeChrome.kill).toHaveBeenCalled();
  });

  it('kills chrome even when lighthouse throws', async () => {
    mockLighthouse.mockRejectedValueOnce(new Error('lh boom'));
    await expect(runner.run('https://example.com/')).rejects.toThrow('lh boom');
    expect(fakeChrome.kill).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement LighthouseRunner**

Create `apps/crawler/src/crawler/lighthouse-runner.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { CoreWebVitals } from '@repo/shared';
import { CacheService } from './cache.service';

export interface LighthouseRunResult {
  cwv: CoreWebVitals;
  cached: boolean;
  durationMs: number;
}

@Injectable()
export class LighthouseRunner {
  private readonly logger = new Logger(LighthouseRunner.name);

  constructor(private readonly cache: CacheService) {}

  async run(url: string): Promise<LighthouseRunResult> {
    const cachedHit = await this.cache.getLighthouse<CoreWebVitals>(url);
    if (cachedHit) {
      return { cwv: cachedHit, cached: true, durationMs: 0 };
    }

    const start = Date.now();
    const { launch } = await import('chrome-launcher');
    const chrome = await launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    try {
      const lighthouseModule = await import('lighthouse');
      const lighthouse = (lighthouseModule as unknown as { default: Function }).default;
      const runnerResult = await lighthouse(
        url,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        { extends: 'lighthouse:default' },
      );

      const lhr = (runnerResult as { lhr: any }).lhr;
      const cwv: CoreWebVitals = {
        lcpMs: Number(lhr.audits['largest-contentful-paint']?.numericValue ?? 0),
        inpMs: Number(
          lhr.audits['interaction-to-next-paint']?.numericValue ??
            lhr.audits['interactive']?.numericValue ??
            0,
        ),
        cls: Number(lhr.audits['cumulative-layout-shift']?.numericValue ?? 0),
        performanceScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
        accessibilityScore: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
        bestPracticesScore: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
        seoScore: Math.round((lhr.categories.seo?.score ?? 0) * 100),
      };

      await this.cache.setLighthouse(url, cwv);
      return { cwv, cached: false, durationMs: Date.now() - start };
    } finally {
      try {
        await chrome.kill();
      } catch (err) {
        this.logger.warn(`Failed killing chrome: ${(err as Error).message}`);
      }
    }
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
cd apps/crawler && npm test -- lighthouse-runner
git add apps/crawler/src/crawler/lighthouse-runner.ts apps/crawler/test/unit/lighthouse-runner.spec.ts
git commit -m "feat(crawler): add LighthouseRunner with CWV extraction and 1h Redis cache"
```

---

## Task 9: CrawlerOrchestrator

**Files:**
- Create: `apps/crawler/src/crawler/interfaces/crawl-result.interface.ts`
- Create: `apps/crawler/src/crawler/crawler.orchestrator.ts`
- Create: `apps/crawler/test/unit/crawler.orchestrator.spec.ts`

- [ ] **Step 1: Define CrawlResult shape**

Create `apps/crawler/src/crawler/interfaces/crawl-result.interface.ts`:

```ts
import { CoreWebVitals } from '@repo/shared';
import { PageData } from './page-data.interface';

export interface CrawlMetadata {
  crawlerType: 'cheerio' | 'playwright';
  isSpa: boolean;
  crawlDurationMs: number;
  lighthouseDurationMs: number;
  lighthouseCached: boolean;
}

export interface CrawlResult {
  pageData: PageData;
  cwvMetrics: CoreWebVitals;
  metadata: CrawlMetadata;
}

export interface CrawlOptions {
  forcePlaywright?: boolean;
  includeLighthouse?: boolean;
  userAgent?: string;
  timeoutMs?: number;
}
```

- [ ] **Step 2: TDD — write orchestrator tests**

Create `apps/crawler/test/unit/crawler.orchestrator.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CrawlerOrchestrator } from '../../src/crawler/crawler.orchestrator';

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
```

- [ ] **Step 3: Implement CrawlerOrchestrator**

Create `apps/crawler/src/crawler/crawler.orchestrator.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { CoreWebVitals } from '@repo/shared';
import { CacheService } from './cache.service';
import { CheerioFetcher } from './cheerio-fetcher';
import { LighthouseRunner } from './lighthouse-runner';
import { PageDataExtractor } from './page-data-extractor';
import { PlaywrightFetcher } from './playwright-fetcher';
import { UrlValidator } from './url-validator';
import { CrawlOptions, CrawlResult } from './interfaces/crawl-result.interface';
import { FetchResult } from './interfaces/fetcher.interface';

const ZERO_CWV: CoreWebVitals = {
  lcpMs: 0,
  inpMs: 0,
  cls: 0,
  performanceScore: 0,
  accessibilityScore: 0,
  bestPracticesScore: 0,
  seoScore: 0,
};

@Injectable()
export class CrawlerOrchestrator {
  private readonly logger = new Logger(CrawlerOrchestrator.name);

  constructor(
    private readonly validator: UrlValidator,
    private readonly cache: CacheService,
    private readonly cheerio: CheerioFetcher,
    private readonly playwright: PlaywrightFetcher,
    private readonly lighthouse: LighthouseRunner,
    private readonly extractor: PageDataExtractor,
  ) {}

  async crawl(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const startedAt = Date.now();
    await this.validator.validate(url);

    // 1. Cache check
    const cached = await this.cache.getCrawl<CrawlResult>(url);
    if (cached) {
      this.logger.log(`crawl cache HIT for ${url}`);
      return cached;
    }

    // 2. Fetch — Cheerio first unless forced
    let fetched: FetchResult;
    if (options.forcePlaywright) {
      fetched = await this.playwright.fetch(url, options);
    } else {
      fetched = await this.cheerio.fetch(url, options);
      if (fetched.isSpa) {
        this.logger.log(`SPA detected at ${url}, falling back to Playwright`);
        fetched = await this.playwright.fetch(url, options);
        fetched.isSpa = true;
      }
    }

    // 3. Lighthouse (default on)
    const includeLh = options.includeLighthouse !== false;
    let cwv: CoreWebVitals = ZERO_CWV;
    let lhDurationMs = 0;
    let lhCached = false;
    if (includeLh) {
      try {
        const lh = await this.lighthouse.run(url);
        cwv = lh.cwv;
        lhDurationMs = lh.durationMs;
        lhCached = lh.cached;
      } catch (err) {
        this.logger.warn(`Lighthouse failed for ${url}: ${(err as Error).message}`);
      }
    }

    // 4. Extract PageData
    const pageData = this.extractor.extract(url, fetched);

    // 5. Build result and cache
    const result: CrawlResult = {
      pageData,
      cwvMetrics: cwv,
      metadata: {
        crawlerType: fetched.fetcherType,
        isSpa: fetched.isSpa,
        crawlDurationMs: Date.now() - startedAt,
        lighthouseDurationMs: lhDurationMs,
        lighthouseCached: lhCached,
      },
    };

    await this.cache.setCrawl(url, result);
    return result;
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
cd apps/crawler && npm test -- crawler.orchestrator
git add apps/crawler/src/crawler/crawler.orchestrator.ts apps/crawler/src/crawler/interfaces/crawl-result.interface.ts apps/crawler/test/unit/crawler.orchestrator.spec.ts
git commit -m "feat(crawler): add CrawlerOrchestrator with cache+cheerio+spa-fallback+lighthouse pipeline"
```

---

## Task 10: gRPC Controller (CrawlUrl + HealthCheck)

**Files:**
- Create: `apps/crawler/src/crawler/crawler.controller.ts`

- [ ] **Step 1: Implement the gRPC controller**

Create `apps/crawler/src/crawler/crawler.controller.ts`:

```ts
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CrawlerOrchestrator } from './crawler.orchestrator';

interface CrawlRequestProto {
  url: string;
  audit_id: string;
  options?: {
    timeout_ms?: number;
    force_playwright?: boolean;
    include_lighthouse?: boolean;
    user_agent?: string;
  };
}

@Controller()
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);
  private readonly bootedAt = Date.now();

  constructor(private readonly orchestrator: CrawlerOrchestrator) {}

  @GrpcMethod('CrawlerService', 'CrawlUrl')
  async crawlUrl(request: CrawlRequestProto) {
    this.logger.log(`gRPC CrawlUrl audit=${request.audit_id} url=${request.url}`);
    const result = await this.orchestrator.crawl(request.url, {
      forcePlaywright: request.options?.force_playwright,
      includeLighthouse: request.options?.include_lighthouse,
      userAgent: request.options?.user_agent,
      timeoutMs: request.options?.timeout_ms,
    });

    return {
      audit_id: request.audit_id,
      page_data: this.toProtoPageData(result.pageData),
      cwv_metrics: {
        lcp_ms: result.cwvMetrics.lcpMs,
        inp_ms: result.cwvMetrics.inpMs,
        cls: result.cwvMetrics.cls,
        performance_score: result.cwvMetrics.performanceScore,
        accessibility_score: result.cwvMetrics.accessibilityScore,
        best_practices_score: result.cwvMetrics.bestPracticesScore,
        seo_score: result.cwvMetrics.seoScore,
      },
      metadata: {
        crawler_type: result.metadata.crawlerType,
        is_spa: result.metadata.isSpa,
        crawl_duration_ms: result.metadata.crawlDurationMs,
        lighthouse_duration_ms: result.metadata.lighthouseDurationMs,
        lighthouse_cached: result.metadata.lighthouseCached,
      },
    };
  }

  @GrpcMethod('CrawlerService', 'HealthCheck')
  healthCheck() {
    return {
      healthy: true,
      version: process.env.npm_package_version ?? '0.0.1',
      uptime_seconds: Math.floor((Date.now() - this.bootedAt) / 1000),
    };
  }

  private toProtoPageData(pd: import('./interfaces/page-data.interface').PageData) {
    return {
      url: pd.url,
      final_url: pd.finalUrl,
      status_code: pd.statusCode,
      response_time_ms: pd.responseTimeMs,
      html_size_bytes: pd.htmlSizeBytes,
      title: pd.title,
      meta_description: pd.metaDescription,
      meta_robots: pd.metaRobots,
      canonical_url: pd.canonicalUrl,
      language: pd.language,
      favicon_url: pd.faviconUrl,
      h1_tags: pd.h1Tags,
      h2_tags: pd.h2Tags,
      h3_tags: pd.h3Tags,
      h4_tags: pd.h4Tags,
      h5_tags: pd.h5Tags,
      h6_tags: pd.h6Tags,
      images: pd.images.map((i) => ({
        src: i.src,
        alt: i.alt ?? undefined,
        size_bytes: i.sizeBytes,
        format: i.format,
      })),
      internal_links: pd.internalLinks.map((l) => ({
        href: l.href,
        anchor_text: l.anchorText,
        is_internal: true,
        rel: l.rel ?? undefined,
        status_code: l.statusCode,
      })),
      external_links: pd.externalLinks.map((l) => ({
        href: l.href,
        anchor_text: l.anchorText,
        is_internal: false,
        rel: l.rel ?? undefined,
        status_code: l.statusCode,
      })),
      schema_json_ld: pd.schemaJsonLd,
      open_graph: pd.openGraph,
      twitter_card: pd.twitterCard,
      is_https: pd.isHttps,
      redirect_chain: pd.redirectChain,
      content_encoding: pd.contentEncoding,
      cache_control: pd.cacheControl,
      viewport_content: pd.viewportContent,
      text_content: pd.textContent,
      raw_html: pd.rawHtml,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/crawler/src/crawler/crawler.controller.ts
git commit -m "feat(crawler): add gRPC CrawlerController exposing CrawlUrl + HealthCheck"
```

---

## Task 11: EventPublisher (Redis Pub/Sub)

**Files:**
- Create: `apps/crawler/src/crawler/event-publisher.ts`

- [ ] **Step 1: Implement EventPublisher**

Create `apps/crawler/src/crawler/event-publisher.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AuditStatus } from '@repo/shared';
import { REDIS_CLIENT } from './cache.service';
import { CrawlResult } from './interfaces/crawl-result.interface';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publishCrawlDone(auditId: string, result: CrawlResult): Promise<void> {
    const payload = {
      auditId,
      pageData: result.pageData,
      cwvMetrics: result.cwvMetrics,
      metadata: result.metadata,
      textContent: result.pageData.textContent,
    };
    await this.redis.publish('crawl.done', JSON.stringify(payload));
    this.logger.log(`published crawl.done audit=${auditId}`);
  }

  async publishCrawlFailed(auditId: string, error: Error): Promise<void> {
    await this.redis.publish(
      'crawl.failed',
      JSON.stringify({
        auditId,
        status: AuditStatus.FAILED,
        error: error.message,
        name: error.name,
      }),
    );
    this.logger.warn(`published crawl.failed audit=${auditId} err=${error.message}`);
  }

  async publishProgress(
    auditId: string,
    progress: number,
    stage: string,
    status: AuditStatus = AuditStatus.CRAWLING,
    message?: string,
  ): Promise<void> {
    await this.redis.publish(
      'audit.progress',
      JSON.stringify({ auditId, status, progress, stage, message }),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/crawler/src/crawler/event-publisher.ts
git commit -m "feat(crawler): add EventPublisher for crawl.done/failed and audit.progress"
```

---

## Task 12: BullMQ Worker (crawl.start consumer)

**Files:**
- Create: `apps/crawler/src/crawler/crawler.worker.ts`
- Create: `apps/crawler/src/crawler/crawler.module.ts`

- [ ] **Step 1: Create the worker**

Create `apps/crawler/src/crawler/crawler.worker.ts`:

```ts
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditStatus, BULLMQ_QUEUES } from '@repo/shared';
import { CrawlerOrchestrator } from './crawler.orchestrator';
import { EventPublisher } from './event-publisher';

interface CrawlJobData {
  auditId: string;
  url: string;
  targetKeyword?: string;
  options?: {
    forcePlaywright?: boolean;
    includeLighthouse?: boolean;
    userAgent?: string;
    timeoutMs?: number;
  };
}

@Processor(BULLMQ_QUEUES.CRAWL_START)
export class CrawlerWorker extends WorkerHost {
  private readonly logger = new Logger(CrawlerWorker.name);

  constructor(
    private readonly orchestrator: CrawlerOrchestrator,
    private readonly publisher: EventPublisher,
    @InjectQueue(BULLMQ_QUEUES.ANALYZE_START) private readonly analyzeQueue: Queue,
    @InjectQueue(BULLMQ_QUEUES.KEYWORD_START) private readonly keywordQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<CrawlJobData>): Promise<void> {
    const { auditId, url, targetKeyword, options } = job.data;
    this.logger.log(`processing crawl.start job=${job.id} audit=${auditId} url=${url}`);

    try {
      await this.publisher.publishProgress(auditId, 10, 'crawl-start', AuditStatus.CRAWLING, 'Crawl started');

      const result = await this.orchestrator.crawl(url, options ?? {});

      await this.publisher.publishProgress(
        auditId,
        33,
        'crawl-done',
        AuditStatus.CRAWLING,
        `Fetched via ${result.metadata.crawlerType} in ${result.metadata.crawlDurationMs}ms`,
      );
      await this.publisher.publishCrawlDone(auditId, result);

      // Choreography: enqueue both downstream steps in parallel.
      // Report Service is responsible for the "wait for both" Redis counter.
      await Promise.all([
        this.analyzeQueue.add(
          'analyze',
          { auditId, pageData: result.pageData, targetKeyword },
          { removeOnComplete: true, removeOnFail: false },
        ),
        this.keywordQueue.add(
          'keyword',
          {
            auditId,
            textContent: result.pageData.textContent,
            title: result.pageData.title,
            metaDescription: result.pageData.metaDescription,
            h1Tags: result.pageData.h1Tags,
            targetKeyword,
          },
          { removeOnComplete: true, removeOnFail: false },
        ),
      ]);

      this.logger.log(`enqueued analyze.start + keyword.start for audit=${auditId}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`crawl failed audit=${auditId}: ${error.message}`, error.stack);
      await this.publisher.publishCrawlFailed(auditId, error);
      throw error; // let BullMQ mark the job failed
    }
  }
}
```

- [ ] **Step 2: Create CrawlerModule wiring everything**

Create `apps/crawler/src/crawler/crawler.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { BULLMQ_QUEUES } from '@repo/shared';
import { CacheService, REDIS_CLIENT } from './cache.service';
import { CheerioFetcher } from './cheerio-fetcher';
import { PlaywrightFetcher } from './playwright-fetcher';
import { BrowserPool } from './browser-pool';
import { LighthouseRunner } from './lighthouse-runner';
import { PageDataExtractor } from './page-data-extractor';
import { UrlValidator } from './url-validator';
import { CrawlerOrchestrator } from './crawler.orchestrator';
import { CrawlerController } from './crawler.controller';
import { CrawlerWorker } from './crawler.worker';
import { EventPublisher } from './event-publisher';

const redisFactory = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis =>
    new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    }),
};

const browserPoolFactory = {
  provide: BrowserPool,
  useFactory: () => new BrowserPool(Number(process.env.BROWSER_POOL_SIZE ?? 3)),
};

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    BullModule.registerQueue(
      { name: BULLMQ_QUEUES.CRAWL_START },
      { name: BULLMQ_QUEUES.ANALYZE_START },
      { name: BULLMQ_QUEUES.KEYWORD_START },
    ),
  ],
  controllers: [CrawlerController],
  providers: [
    redisFactory,
    browserPoolFactory,
    CacheService,
    UrlValidator,
    CheerioFetcher,
    PlaywrightFetcher,
    LighthouseRunner,
    PageDataExtractor,
    CrawlerOrchestrator,
    EventPublisher,
    CrawlerWorker,
  ],
  exports: [CrawlerOrchestrator],
})
export class CrawlerModule {}
```

- [ ] **Step 3: Wire CrawlerModule into AppModule**

Modify `apps/crawler/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlerModule } from './crawler/crawler.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CrawlerModule],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/crawler/src/crawler/crawler.worker.ts apps/crawler/src/crawler/crawler.module.ts apps/crawler/src/app.module.ts
git commit -m "feat(crawler): add BullMQ worker, CrawlerModule wiring, downstream queue choreography"
```

---

## Task 13: Hybrid main.ts Bootstrap (HTTP lifecycle + gRPC + Workers)

**Files:**
- Modify: `apps/crawler/src/main.ts`

- [ ] **Step 1: Rewrite main.ts to mirror Plan 4's hybrid pattern**

Modify `apps/crawler/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Use a standalone application so BullMQ workers (providers) initialise
  // alongside the gRPC microservice transport.
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['crawler.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/crawler/v1/crawler.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50052}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });

  await app.startAllMicroservices();
  await app.init();

  console.log(`Crawler gRPC service running on port ${process.env.GRPC_PORT || 50052}`);
  console.log(`Crawler BullMQ worker listening on queue "crawl.start"`);
}
bootstrap();
```

- [ ] **Step 2: Commit**

```bash
git add apps/crawler/src/main.ts
git commit -m "feat(crawler): hybrid main.ts bootstrap (NestFactory.create + gRPC + workers)"
```

---

## Task 14: E2E Integration Test (CrawlUrl gRPC Flow)

**Files:**
- Create: `apps/crawler/test/integration/crawl-url.e2e-spec.ts`

- [ ] **Step 1: Write integration test that hits a real public URL**

Create `apps/crawler/test/integration/crawl-url.e2e-spec.ts`:

```ts
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CrawlerModule } from '../../src/crawler/crawler.module';
import { CrawlerController } from '../../src/crawler/crawler.controller';
import { CacheService, REDIS_CLIENT } from '../../src/crawler/cache.service';
import { LighthouseRunner } from '../../src/crawler/lighthouse-runner';
import { BrowserPool } from '../../src/crawler/browser-pool';

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
const fakeLighthouse = {
  run: vi.fn().mockResolvedValue({
    cwv: {
      lcpMs: 1500,
      inpMs: 100,
      cls: 0.05,
      performanceScore: 90,
      accessibilityScore: 90,
      bestPracticesScore: 90,
      seoScore: 90,
    },
    cached: false,
    durationMs: 1234,
  }),
};

describe('CrawlUrl E2E', () => {
  let moduleRef: TestingModule;
  let controller: CrawlerController;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CrawlerModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(fakeRedis)
      .overrideProvider(LighthouseRunner)
      .useValue(fakeLighthouse)
      .compile();

    await moduleRef.init();
    controller = moduleRef.get(CrawlerController);
  }, 60_000);

  afterAll(async () => {
    const pool = moduleRef.get(BrowserPool);
    await pool.shutdown();
    await moduleRef.close();
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
    const response = await controller.crawlUrl({
      audit_id: '00000000-0000-0000-0000-000000000002',
      url: 'https://example.com/',
      options: { include_lighthouse: true },
    });
    expect(response.page_data.status_code).toBe(200);
    // Cache hit means the orchestrator returned early — Lighthouse not invoked again
    expect(fakeLighthouse.run).not.toHaveBeenCalled();
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
```

- [ ] **Step 2: Run the full suite**

```bash
cd apps/crawler && npm test
```

Expected: All unit suites (url-validator, cache.service, cheerio-fetcher, page-data-extractor, browser-pool, playwright-fetcher, lighthouse-runner, crawler.orchestrator) plus the integration suite pass. 0 failures.

- [ ] **Step 3: Commit**

```bash
git add apps/crawler/test/integration/crawl-url.e2e-spec.ts
git commit -m "test(crawler): add CrawlUrl E2E covering live fetch, cache hit, SSRF block, health"
```

---

## Verification Checklist

After completing all 14 tasks, verify:

- [ ] `cd apps/crawler && npm test` — all unit + integration suites pass, 0 failures
- [ ] `cd apps/crawler && npm run check-types` — no TypeScript errors
- [ ] `cd apps/crawler && npm run lint` — no lint errors
- [ ] `UrlValidator` blocks all of: localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, ::1, fc00::/7, fe80::/10
- [ ] `UrlValidator` re-checks resolved IPs (DNS rebinding defense — multi-IP test passes)
- [ ] `CacheService` uses sha256 keys, `crawl:{hash}` TTL = `CACHE_TTL.CRAWL_SECONDS` (1800), `lighthouse:{hash}` TTL = `CACHE_TTL.LIGHTHOUSE_SECONDS` (3600)
- [ ] `CheerioFetcher.detectSpa` returns `true` for empty `#root`/`#app`/`__NEXT_DATA__` pages and `false` for static HTML
- [ ] `PageDataExtractor` populates every field on the `PageData` interface and strips script/style/nav/header/footer from `textContent`
- [ ] `BrowserPool` enforces `maxSize`, reuses idle browsers, queues acquire on saturation, closes all on shutdown
- [ ] `PlaywrightFetcher` always releases the context (try/finally), uses `waitUntil: 'networkidle'` and 30 s timeout
- [ ] `LighthouseRunner` returns cached CWV without launching Chrome on cache hit, kills Chrome in `finally` even on errors
- [ ] `CrawlerOrchestrator` validates → cache check → cheerio → SPA fallback → lighthouse → extract → cache, exactly in that order
- [ ] `CrawlerController` exposes `CrawlUrl` and `HealthCheck` via `@GrpcMethod('CrawlerService', ...)` and converts the TS `PageData` shape to proto field naming (`final_url`, `meta_description`, etc.)
- [ ] `CrawlerWorker` is a `@Processor(BULLMQ_QUEUES.CRAWL_START)` that enqueues `analyze.start` + `keyword.start` after `crawl.done` and publishes `crawl.failed` on errors
- [ ] `EventPublisher` publishes to Redis channels `crawl.done`, `crawl.failed`, `audit.progress`
- [ ] `main.ts` boots via `NestFactory.create(AppModule)` + `connectMicroservice` + `startAllMicroservices()` + `init()` so both gRPC and BullMQ workers run in the same process
- [ ] Running `docker compose up -d redis` and `cd apps/crawler && npm run dev` starts the service without errors
- [ ] Manual gRPC smoke test (grpcurl) against `CrawlerService/CrawlUrl` with a sample URL returns a populated `PageData` + `CoreWebVitals`

---

## What Comes Next

This plan produces a **fully functional Crawler microservice**. Downstream plans depend on it as follows:

| Next Plan | What it consumes from this plan |
|-----------|---------------------------------|
| Plan 4: SEO Analyzer | Receives the `PageData` produced here via BullMQ `analyze.start` (enqueued by `CrawlerWorker`) |
| Plan 5: Keyword Analyzer | Receives `textContent` + `title` + `metaDescription` + `h1Tags` via BullMQ `keyword.start` (enqueued by `CrawlerWorker`) |
| Plan 2: Gateway Service | Optionally calls Crawler gRPC `CrawlUrl` directly for synchronous previews; usually enqueues `crawl.start` jobs that this worker consumes |
| Plan 6: Report Service | Subscribes to Redis Pub/Sub `crawl.done`, `analyze.done`, `keyword.done` and runs the "wait for both" Redis-counter aggregation pattern that this plan deliberately leaves out |
| Plan 7: Integration | Wires the full pipeline (`crawl.start` → `crawl.done` → `analyze.start` + `keyword.start` → `report.start`) and runs end-to-end smoke tests against real services |

**Known follow-ups** (out of scope for this plan, to be handled later):
- HEAD-request enrichment of `ImageInfo.sizeBytes` and `LinkInfo.statusCode` — currently both are `0` for cheerio-extracted pages. A future task can fan out parallel HEAD requests with a per-host concurrency cap.
- Robots.txt + crawl-delay compliance — fetch and honor `/robots.txt` per origin before requesting the page.
- Per-host rate limiting — ioredis-based token bucket keyed on origin to be a polite crawler.
- Lighthouse via reused Playwright Chromium — currently `chrome-launcher` spawns a separate Chrome instance; sharing the pool's browser would cut ~1 s per audit.
- Prometheus metrics: cheerio-vs-playwright ratio, cache hit rate, average lighthouse duration, SPA detection accuracy.
- Distributed lock per audit ID so two workers cannot crawl the same URL simultaneously (currently the Redis cache de-duplicates after one finishes, but in-flight collisions are possible).
