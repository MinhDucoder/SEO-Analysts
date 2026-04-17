# @seo/crawler — Web Crawler Service

Fetch URL (Cheerio HTTP → Playwright fallback cho SPA) + chạy Lighthouse lấy Core Web Vitals + extract PageData. Orchestrates toàn bộ pipeline downstream qua BullMQ.

## Architecture (DDD)

```
src/crawler/
├── crawler.module.ts
├── controllers/        # crawler.controller (gRPC), crawler.worker (BullMQ)
├── services/           # crawler.orchestrator, page-data-extractor,
│                       #   lighthouse-runner, event-publisher
├── infra/fetchers/     # browser-pool, cheerio-fetcher, playwright-fetcher
├── persistence/        # cache.service (Redis cache for crawl+lighthouse results)
└── domain/             # url-validator + interfaces (fetcher, crawl-result, page-data)
```

## Public API

| Channel | Method / Queue | Purpose |
|---|---|---|
| gRPC `:50052` | `CrawlerService.CrawlUrl` | Sync crawl (on-demand / testing) |
| gRPC `:50052` | `CrawlerService.HealthCheck` | Liveness |
| BullMQ `crawl.start` | Job processor (CrawlerWorker) | **Main pipeline entry** — consumed from Gateway |
| BullMQ → `analyze.start` | Producer | Fan-out to SEO Analyzer after crawl |
| BullMQ → `keyword.start` | Producer | Fan-out to Keyword Analyzer after crawl |
| Redis pub | `audit.progress`, `crawl.done`, `crawl.failed` | Progress events → Gateway WebSocket |
| Redis cache | `crawl:<hash>`, `lighthouse:<hash>` | 1h TTL, skip re-fetch |

Proto: `packages/proto/crawler/v1/crawler.proto`

## Dependencies

- **Redis** — BullMQ + cache + pub/sub
- **Playwright** (chromium) — SPA rendering (pool size via `BROWSER_POOL_SIZE`)
- **Lighthouse** — Performance/SEO audit (uses `chrome-launcher`)
- **Axios + Cheerio** — HTTP fetch cho static HTML
- No database (stateless)

## Flow (inside `CrawlerOrchestrator.crawl`)

1. URL validation (SSRF/blocklist) via `UrlValidator`
2. Cache lookup (Redis)
3. Cheerio fetch → SPA detection → Playwright fallback nếu SPA
4. Lighthouse (optional) → Core Web Vitals
5. `PageDataExtractor` → build structured PageData
6. Cache + return

## Testing

- Unit: `test/unit/*.spec.ts` (8 files: pool, cache, fetchers, extractor, lighthouse, orchestrator, validator)
- Integration: `test/integration/crawl-url.e2e-spec.ts` — full gRPC controller with mocked fetchers
- Current: 62 tests / 9 files

## Entrypoint

- Dockerfile uses `mcr.microsoft.com/playwright:v1.50.0-noble` (Debian, chromium pre-installed)
- Config env: `REDIS_URL`, `GRPC_PORT` (default 50052), `BROWSER_POOL_SIZE`
- Memory budget: 1.5 GB (see docker-compose.yml)
