# 02 — Crawler Service

> **Vai trò:** Người đi chợ — tải HTML, đo hiệu năng, trích xuất dữ liệu trang để các service khác phân tích.
>
> **Port:** 50052 (gRPC, nội bộ — không expose public).
>
> **Database:** Không có. State hoàn toàn nằm trong Redis (cache + queue + counter).

---

## 1. Mục đích & Trách nhiệm

1. **Single-URL audit** — fetch 1 URL, thử Cheerio trước, fallback Playwright nếu là SPA; đồng thời chạy Lighthouse mobile+desktop (F5).
2. **Site-wide audit (F1)** — discover toàn bộ URL qua robots.txt → sitemap chain → fan-out N job audit từng URL → gom kết quả summary (avg/median/worst-10).
3. **Broken-link audit (F4, opt-in)** — `LinkChecker` HEAD/GET fallback cho từng `<a href>`, redirect chain ≤5, concurrency 10 global + 2 per-host. Ghi `statusCode` ngược lại vào `LinkInfo` cho analyzer rule `broken_links`.
4. **SSRF guard** — chặn mọi request tới internal IP trước khi đụng mạng (double check ngoài gateway).
5. **Cache** — SHA-256 URL hash làm key; `crawl:*` 30 phút, `lighthouse:{mobile|desktop}:*` 1 giờ → tránh crawl lại trong cửa sổ ngắn.
6. **Orchestrate downstream** — publish `crawl.done` + enqueue `analyze.start` + `keyword.start` cho single-mode; publish `page-audit.done` + `site-crawl.done` cho F1.
7. **Progress signalling** — publish `audit.progress` để gateway đẩy realtime (stage: `crawling`, `site-crawl-discovery`, `site-crawl-fanout`, `site-crawl-audit`, `site-crawl-done`).

**Triết lý:** stateless, CPU/memory-bound nặng (Playwright + Chrome Lighthouse). Scale ngang dễ dàng bằng cách thêm instance — Redis queue tự phân phối job.

---

## 2. Kiến trúc module (DI map)

```
apps/crawler/src/
├── main.ts                           # Bootstrap: connectMicroservice(gRPC) + BullMQ workers
├── app.module.ts                     # Root
└── crawler/
    ├── crawler.module.ts             # DI wiring, registerQueue x4
    ├── controllers/                  # Entry points
    │   ├── crawler.controller.ts     # gRPC sync: CrawlUrl, HealthCheck
    │   ├── crawler.worker.ts         # BullMQ: crawl.start → analyze + keyword
    │   ├── site-crawl-start.worker.ts   # BullMQ: site-crawl.start → discover + fan-out
    │   ├── url-audit.worker.ts       # BullMQ: site-crawl.url-audit → crawl + gRPC analyze
    │   └── site-crawl-aggregate.worker.ts # BullMQ: site-crawl.aggregate → summarize
    ├── services/
    │   ├── crawler.orchestrator.ts   # Pipeline: validate → cache → fetch → LH → extract → cache
    │   ├── lighthouse-runner.ts      # chrome-launcher + google lighthouse
    │   ├── page-data-extractor.ts    # Cheerio → PageData struct
    │   ├── event-publisher.ts        # Redis pub/sub publisher
    │   ├── site-crawl-counter.service.ts  # Redis INCR fan-in counter
    │   └── page-audit-result-store.service.ts # Redis list cho F1 results
    ├── infra/
    │   ├── fetchers/
    │   │   ├── cheerio-fetcher.ts    # axios + Cheerio + detectSpa heuristic
    │   │   ├── playwright-fetcher.ts # headless Chromium networkidle
    │   │   ├── polite-fetcher.ts     # wrapper tôn trọng robots.txt delay
    │   │   ├── link-checker.ts       # F4: HEAD/GET fallback, redirect chain, concurrency
    │   │   └── browser-pool.ts       # Playwright context pool, max 3
    │   ├── grpc/
    │   │   ├── analyzer-grpc-client.ts # Gọi AnalyzePage cho F1
    │   │   └── grpc-client.factory.ts
    │   └── sitemap/
    │       ├── sitemap-discovery.ts  # robots.txt → sitemap chain parser
    │       └── undici-sitemap-http-client.ts
    ├── domain/                       # Pure, testable
    │   ├── page-data.interface.ts
    │   ├── crawl-result.interface.ts
    │   ├── fetcher.interface.ts
    │   ├── url-validator.ts          # SSRF (DNS rebind aware)
    │   └── url-canonicalizer.ts      # URL dedup cho sitemap
    └── persistence/
        └── cache.service.ts          # Redis cache wrapper
```

**Lưu ý kiến trúc:**
- Cùng một `CrawlerOrchestrator` phục vụ cả gRPC sync (`CrawlUrl`) lẫn BullMQ worker — không duplicate logic.
- `BrowserPool` lazy-grow (tối đa 3 context) để tránh tốn RAM khi idle; mỗi context ~200–300 MB.
- Mọi thứ trong `domain/` không import service bên ngoài, dễ unit-test.

---

## 3. Luồng xử lý — Single URL (mode=single)

```
BullMQ crawl.start { auditId, url, options: { targetKeyword? } }
            │
            ▼
CrawlerWorker.process(job)
            │
            ├─ CrawlerOrchestrator.crawl(url, { includeLighthouse: true })
            │    │
            │    ├─ UrlValidator.validate(url)
            │    │    ├─ scheme http/https
            │    │    ├─ hostname literal block (localhost, 127.0.0.1, ...)
            │    │    ├─ IP literal → assertPublicIp
            │    │    └─ DNS resolve → assertPublicIp cho MỖI IP
            │    │
            │    ├─ CacheService.getCrawl(url)     # Redis crawl:<sha256> TTL 30m
            │    │    └─ hit → return cached CrawlResult
            │    │
            │    ├─ CheerioFetcher.fetch(url)       # axios + gzip, ~500ms
            │    │    └─ detectSpa(html):
            │    │        3 heuristic:
            │    │         1. #root/#app/#__next + body text < 500 chars
            │    │         2. <noscript>"enable javascript" + body < 1500
            │    │         3. __NEXT_DATA__ marker + body < 500
            │    │
            │    ├─ IF spa: PlaywrightFetcher.fetch(url)  # ~3-5s, networkidle
            │    │    └─ BrowserPool.acquire() → context.newPage() → close()
            │    │
            │    ├─ LighthouseRunner.runBoth(url)
            │    │    ├─ CacheService.getLighthouse(url, mobile)
            │    │    ├─ CacheService.getLighthouse(url, desktop)
            │    │    ├─ miss → chrome-launcher.launch({ headless, no-sandbox })
            │    │    ├─ lighthouse(url, { onlyCategories: performance|a11y|bp|seo })
            │    │    ├─ extract: lcpMs, inpMs, cls, performanceScore, a11y, bp, seo
            │    │    └─ CacheService.setLighthouse TTL 1h
            │    │
            │    ├─ PageDataExtractor.extract(url, fetched) → PageData
            │    │    (30+ fields — xem §7)
            │    │
            │    └─ CacheService.setCrawl(url, result) TTL 30m
            │
            ├─ EventPublisher.publishCrawlDone:
            │    Redis PUBLISH crawl.done {
            │      auditId, pageData, cwvMetrics, cwvMetricsDesktop,
            │      metadata, textContent (cho keyword dùng)
            │    }
            │
            ├─ EventPublisher.publishProgress: audit.progress { progress: 40, stage: 'crawling' }
            │
            └─ Enqueue SONG SONG 2 queue:
                 ├─ analyze.start  { auditId, pageData, targetKeyword? }
                 └─ keyword.start  { auditId, url, textContent, title, h1Text, metaDescription, targetKeyword? }
```

**Failure path** (crawler.worker.ts line ~88):
- Bất kỳ lỗi nào (fetch timeout, SSRF, Lighthouse crash) → `EventPublisher.publishCrawlFailed({ auditId, error, name })` → Report service nhận signal → update Audit.status=FAILED.

---

## 4. Luồng xử lý — Site audit (F1, mode=site)

F1 dùng pattern **fan-out/fan-in** qua 3 queue.

```
                           site-crawl.start
                                   │
                                   ▼
              SiteCrawlStartWorker.process({ auditId, rootUrl, maxUrls? })
                                   │
                                   ├─ SitemapDiscovery.discoverAllUrls(rootUrl, cap)
                                   │    ├─ Fetch robots.txt → extract Sitemap: directives
                                   │    ├─ Recurse sitemap index (max depth 2)
                                   │    ├─ Parse sitemap.xml → collect <loc> URLs
                                   │    ├─ UrlCanonicalizer: lowercase scheme + host, strip fragment, sort params
                                   │    └─ Dedup, áp dụng cap (500 default / 5000 hard cap)
                                   │
                                   ├─ SiteCrawlCounter.setExpected(auditId, N)
                                   │    → Redis SETEX site-crawl:{id}:expected N, TTL 1h
                                   │
                                   ├─ Publish audit.progress { progress: 20, stage: 'crawling' }
                                   │
                                   └─ Enqueue N job vào queue site-crawl.url-audit
                                       Payload mỗi job: { auditId, url, rootUrl, targetKeyword? }

                                                     │  (N parallel workers)
                                                     ▼
         ┌────────────────────────────────────────────────────────────┐
         │             UrlAuditWorker.process(job)  × N                │
         │                                                              │
         │   ├─ CrawlerOrchestrator.crawl(url, { includeLighthouse: false })
         │   │   (skip Lighthouse ở scale — đắt quá)
         │   │
         │   ├─ AnalyzerGrpcClient.analyzePage(auditId, pageData, targetKeyword)
         │   │   → SYNC gRPC call (không enqueue queue → tiết kiệm 1 hop)
         │   │   Response: { overallScore, ruleResults[], categoryScores[] }
         │   │
         │   ├─ Build PageAuditResult { url, score, issues[], fetchedAt, error? }
         │   │
         │   ├─ PageAuditResultStore.append(auditId, result)
         │   │   → Redis LPUSH site-crawl:{id}:results JSON, TTL 1h
         │   │
         │   ├─ Publish page-audit.done { auditId, result }
         │   │   (Gateway subscribe → INSERT PageAudit row)
         │   │
         │   ├─ SiteCrawlCounter.markDone(auditId)
         │   │   → INCR site-crawl:{id}:done, fetch { done, expected, complete }
         │   │
         │   ├─ Publish audit.progress { progress: 20 + floor(done/expected * 70) }
         │   │   (Map [0, expected] → [20%, 90%])
         │   │
         │   └─ IF complete: enqueue site-crawl.aggregate { auditId, rootUrl }
         │
         │   Ghi chú: per-URL failure KHÔNG rethrow — trả result score 0 + error.
         │   Mục đích: 1 URL chết không làm stall cả audit.
         └────────────────────────────────────────────────────────────┘
                                                     │  (last worker only)
                                                     ▼
              SiteCrawlAggregateWorker.process({ auditId, rootUrl })
                                   │
                                   ├─ PageAuditResultStore.readAll(auditId) → PageAuditResult[]
                                   │
                                   ├─ summarize(rootUrl, results):
                                   │    totalUrls  = length
                                   │    failedUrls = count(error)
                                   │    auditedUrls = total − failed
                                   │    avgScore   = sum/total
                                   │    medianScore
                                   │    worstPages = top-10 lowest, { url, score, issueCount, error? }
                                   │
                                   ├─ Publish site-crawl.done { auditId, summary }
                                   │   (Gateway cập nhật Audit.discoveredUrlsCount/auditedUrlsCount)
                                   │
                                   ├─ Publish audit.progress { progress: 100 }
                                   │
                                   └─ Cleanup: DEL site-crawl:{id}:{expected,done,results}
```

**Đặc điểm F1:**
- gRPC sync cho per-URL analyze (thay vì BullMQ fan-out thêm 1 layer) — giảm độ trễ, đỡ boilerplate choreography.
- Keyword analysis **không chạy cho mọi URL** trong site-audit (chỉ cho mode single). Giả định: keyword quan trọng ở trang landing, không phải mọi sub-page.
- Redis key có TTL 1h — tự cleanup nếu aggregate worker crash giữa chừng.

---

## 5. Chiến lược fetch: Cheerio vs Playwright

### 5.1 Khi nào chọn gì

| Tình huống | Fetcher | Thời gian |
|---|---|---|
| Trang HTML render server (WordPress, blog static) | Cheerio | ~300–800 ms |
| SPA React/Vue/Next.js (body rỗng khi raw fetch) | Fallback Playwright | ~3–5 s |
| `options.forcePlaywright = true` | Playwright luôn | — |

### 5.2 SPA detection heuristic

Code: [cheerio-fetcher.ts → detectSpa()](../../apps/crawler/src/crawler/infra/fetchers/cheerio-fetcher.ts).

3 dấu hiệu, **chỉ cần 1** trong 3 match → coi là SPA:

1. **Mount node + body rỗng:** HTML có `#root`, `#app`, hoặc `#__next` **VÀ** `bodyText.length < 500`.
2. **Noscript cảnh báo:** `<noscript>` chứa `"enable javascript"` hoặc `"javascript is required"` **VÀ** `bodyText.length < 1500`.
3. **Next.js marker:** body HTML có `__NEXT_DATA__` **VÀ** `bodyText.length < 500`.

**Tại sao không phân tích hoàn toàn thông qua Playwright?**
- ~80% website đích (Wordpress, static site) là render server → dùng Cheerio rẻ hơn 10×.
- Playwright cần launch Chromium (~1.5 GB RAM) + chờ `networkidle` (có thể 5s+).
- Với 5000 URL audit, khác biệt là hàng giờ.

---

## 6. Lighthouse — Core Web Vitals

### 6.1 Cấu hình

Code: [lighthouse-runner.ts](../../apps/crawler/src/crawler/services/lighthouse-runner.ts).

```typescript
const chrome = await launch({
  chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
});

await lighthouse(url, {
  port: chrome.port,
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  settings: formFactor === 'DESKTOP' ? { preset: 'desktop' } : undefined,
});
```

### 6.2 Metric lấy được

| Field | Nguồn Lighthouse audit |
|---|---|
| `lcpMs` | `largest-contentful-paint.numericValue` |
| `inpMs` | `interaction-to-next-paint.numericValue` (fallback `interactive`) |
| `cls` | `cumulative-layout-shift.numericValue` |
| `performanceScore` | `categories.performance.score × 100` |
| `accessibilityScore` | `categories.accessibility.score × 100` |
| `bestPracticesScore` | `categories['best-practices'].score × 100` |
| `seoScore` | `categories.seo.score × 100` |

### 6.3 Concurrency

- **Mặc định:** chạy tuần tự mobile → desktop. Peak RAM ~600 MB.
- **Parallel mode:** set env `LIGHTHOUSE_PARALLEL=true` → chạy song song. Yêu cầu ≥ 1.5 GB RAM.
- Chrome process **luôn** kill trong `finally` block để tránh zombie.

### 6.4 Cache

- Key: `lighthouse:{formFactor}:{urlHash}` (formFactor = `mobile` | `desktop`).
- TTL: 3600s (1h) — trên cùng 1 URL, audit liên tục trong 1h sẽ trả cache, không re-run.
- Cache miss vẫn trả `{ cwv, cached: false, durationMs }` để log thời gian.

### 6.5 Non-fatal

Lighthouse fail (Chrome không launch được, timeout, OOM...) **không abort crawl**. Orchestrator set `cwvMetrics = zeros + fail flag`, log warning, tiếp tục pipeline. Analyzer sẽ thấy CWV 0 và đặt performance score thấp — nhưng audit vẫn completed.

---

## 7. PageData — Dữ liệu trích xuất

File: [page-data-extractor.ts](../../apps/crawler/src/crawler/services/page-data-extractor.ts). Interface: [page-data.interface.ts](../../apps/crawler/src/crawler/domain/page-data.interface.ts).

| Nhóm | Field | Nguồn |
|---|---|---|
| **URL** | `url`, `finalUrl`, `statusCode`, `responseTimeMs`, `htmlSizeBytes`, `redirectChain` | HTTP layer |
| **Meta** | `title`, `metaDescription`, `metaRobots`, `canonicalUrl`, `language`, `faviconUrl`, `viewportContent` | `<head>` tags |
| **Headings** | `h1Tags` ... `h6Tags` | Text content mỗi `<h1>`–`<h6>` |
| **Images** | `images[]` = `{ src, alt, sizeBytes, format }` | `<img>` tags |
| **Links** | `internalLinks[]`, `externalLinks[]` = `{ href, anchorText, isInternal, rel, statusCode }` | `<a>` tags, filter theo hostname |
| **Structured data** | `schemaJsonLd[]`, `openGraph`, `twitterCard` | `<script type="application/ld+json">`, `<meta property="og:*">`, `<meta name="twitter:*">` |
| **Technical** | `isHttps`, `contentEncoding`, `cacheControl` | URL scheme + HTTP headers |
| **Content** | `textContent`, `rawHtml` | Body text (strip scripts/styles/nav/footer) + full HTML |

**Phân biệt internal vs external link:** so sánh hostname với `finalUrl.hostname`. Relative URL tính là internal.

---

## 8. gRPC exposed RPCs

Proto: `packages/proto/crawler/v1/crawler.proto`.

| RPC | Request | Response | Mục đích |
|---|---|---|---|
| `CrawlUrl` | `{ url, audit_id, options: { timeout_ms?, force_playwright?, include_lighthouse?, user_agent? } }` | `{ audit_id, page_data, cwv_metrics, metadata }` | Sync crawl khi cần (debugging, tool admin) |
| `HealthCheck` | `{}` | `{ healthy, version, uptime_seconds }` | Liveness probe |

**Ghi chú:** Crawler KHÔNG consume gRPC job như một server thuần. RPC `CrawlUrl` chỉ là entry point đồng bộ cho các trường hợp admin hoặc test; production flow đi qua BullMQ.

---

## 9. gRPC client ra ngoài

`AnalyzerGrpcClient` ([analyzer-grpc-client.ts](../../apps/crawler/src/crawler/infra/grpc/analyzer-grpc-client.ts)):

| Method | Mục đích | Dùng ở đâu |
|---|---|---|
| `analyzePage(auditId, pageData, targetKeyword?)` | Sync call tới seo-analyzer cho từng URL F1 | `UrlAuditWorker.runSubAudit` |
| `isHealthy()` | Optional health check | — |

**Quyết định thiết kế:** F1 dùng gRPC sync thay vì enqueue queue. Lý do:
- Per-URL result phải gắn với `auditId` cụ thể → nếu queue hoá thì phải wait cả analyze.done fire cho mọi URL → phức tạp choreography.
- gRPC sync với timeout ngắn đơn giản hơn, debug dễ, latency thấp hơn (~50 ms so với BullMQ ~200 ms).

---

## 10. BullMQ producer (do crawler push)

### `analyze.start`
- Job name: `analyze`
- Payload: `{ auditId, pageData, targetKeyword? }`
- Options: `removeOnComplete: true, removeOnFail: false`

### `keyword.start`
- Job name: `keyword`
- Payload: `{ auditId, url, textContent, title, h1Text, metaDescription, targetKeyword? }`
- Options: như trên

### `site-crawl.url-audit`
- Job name: `url-audit`
- Payload: `{ auditId, url, rootUrl, targetKeyword? }`
- Enqueue từ `SiteCrawlStartWorker`; fan-out N job từ sitemap

### `site-crawl.aggregate`
- Job name: `aggregate`
- Payload: `{ auditId, rootUrl }`
- Enqueue chỉ khi counter complete

---

## 11. Redis pub/sub & keys

### Channel publish

| Channel | Payload | Consumer |
|---|---|---|
| `crawl.done` | `{ auditId, pageData, cwvMetrics, cwvMetricsDesktop, metadata, textContent }` | Report (`CrawlDoneListener` cache CWV) |
| `crawl.failed` | `{ auditId, status: FAILED, error, name }` | Report + Gateway |
| `page-audit.done` | `{ auditId, result: PageAuditResult }` | Gateway (INSERT `PageAudit` row) |
| `site-crawl.done` | `{ auditId, summary: SiteCrawlSummary }` | Gateway (UPDATE Audit totals) |
| `audit.progress` | `{ auditId, status, progress, stage, message? }` | Gateway → WebSocket clients |

### Redis key TTL

| Key pattern | TTL | Mục đích |
|---|---|---|
| `crawl:<sha256(url)>` | 1800s | Cache full CrawlResult |
| `lighthouse:mobile:<sha256(url)>` | 3600s | Cache CWV mobile |
| `lighthouse:desktop:<sha256(url)>` | 3600s | Cache CWV desktop |
| `site-crawl:<auditId>:expected` | 3600s | Total URL cần audit |
| `site-crawl:<auditId>:done` | 3600s | Số URL đã xong |
| `site-crawl:<auditId>:results` | 3600s | List `PageAuditResult` JSON |

Cache miss trả corrupt JSON → log warning, treat as miss (không throw) — tránh cache xấu làm chết pipeline.

---

## 12. SSRF — URL Validator

File: [domain/url-validator.ts](../../apps/crawler/src/crawler/domain/url-validator.ts).

**4 lớp check** (đã mô tả trong [01-gateway.md §8.3](01-gateway.md#83-ssrf-url-validator) vì cả 2 service dùng cùng pattern).

**Khác biệt ở crawler:** chạy bên trong network Docker → các dịch vụ nội bộ (postgres, redis, service khác) có hostname như `gateway-db`, `redis`... chưa bị block. Validator dựa vào DNS resolve thực tế → nếu resolve ra 172.x (Docker network) thì reject. Đây là lý do **network compose phải tách** `backend` (service-to-service) và `data` (DB/Redis) — crawler không join `data` network để không resolve được DB tên nội bộ.

---

## 13. Khởi động

File: [apps/crawler/src/main.ts](../../apps/crawler/src/main.ts).

```typescript
const app = await NestFactory.create(AppModule);

app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: ['crawler.v1'],
    protoPath: [join(PROTO_ROOT, 'crawler/v1/crawler.proto')],
    url: `0.0.0.0:${process.env.GRPC_PORT || 50052}`,
    loader: { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [PROTO_ROOT] },
  },
});

await app.startAllMicroservices();
await app.init();   // Để BullMQ worker + provider khởi tạo
```

**Tại sao `create + connectMicroservice` thay vì `createMicroservice`?** Vì crawler cần cả gRPC server lẫn BullMQ worker (worker là provider NestJS thông thường, không phải microservice transport). Pattern `create + connectMicroservice + init` cho phép cả 2 cùng chạy.

**Env vars quan trọng:**
- `GRPC_PORT` (default 50052)
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`
- `ANALYZER_GRPC_URL` (default `localhost:50053`)
- `BROWSER_POOL_SIZE` (default 3)
- `LIGHTHOUSE_PARALLEL` (default false)

---

## 14. File tham chiếu quan trọng

| File | Mục đích |
|---|---|
| [src/main.ts](../../apps/crawler/src/main.ts) | Bootstrap gRPC + BullMQ |
| [src/crawler/crawler.module.ts](../../apps/crawler/src/crawler/crawler.module.ts) | DI + queue register |
| [controllers/crawler.worker.ts](../../apps/crawler/src/crawler/controllers/crawler.worker.ts) | BullMQ: crawl.start (đơn URL) |
| [controllers/site-crawl-start.worker.ts](../../apps/crawler/src/crawler/controllers/site-crawl-start.worker.ts) | Fan-out site audit |
| [controllers/url-audit.worker.ts](../../apps/crawler/src/crawler/controllers/url-audit.worker.ts) | Per-URL audit + gRPC analyze |
| [controllers/site-crawl-aggregate.worker.ts](../../apps/crawler/src/crawler/controllers/site-crawl-aggregate.worker.ts) | Fan-in summary |
| [controllers/crawler.controller.ts](../../apps/crawler/src/crawler/controllers/crawler.controller.ts) | gRPC CrawlUrl RPC |
| [services/crawler.orchestrator.ts](../../apps/crawler/src/crawler/services/crawler.orchestrator.ts) | Pipeline chính |
| [services/lighthouse-runner.ts](../../apps/crawler/src/crawler/services/lighthouse-runner.ts) | Google Lighthouse wrapper |
| [services/page-data-extractor.ts](../../apps/crawler/src/crawler/services/page-data-extractor.ts) | HTML → PageData |
| [services/event-publisher.ts](../../apps/crawler/src/crawler/services/event-publisher.ts) | Redis pub/sub |
| [services/site-crawl-counter.service.ts](../../apps/crawler/src/crawler/services/site-crawl-counter.service.ts) | INCR counter |
| [services/page-audit-result-store.service.ts](../../apps/crawler/src/crawler/services/page-audit-result-store.service.ts) | Redis list results |
| [infra/fetchers/cheerio-fetcher.ts](../../apps/crawler/src/crawler/infra/fetchers/cheerio-fetcher.ts) | Static HTTP + SPA detect |
| [infra/fetchers/playwright-fetcher.ts](../../apps/crawler/src/crawler/infra/fetchers/playwright-fetcher.ts) | Browser-based fetch |
| [infra/fetchers/browser-pool.ts](../../apps/crawler/src/crawler/infra/fetchers/browser-pool.ts) | Context pool |
| [infra/grpc/analyzer-grpc-client.ts](../../apps/crawler/src/crawler/infra/grpc/analyzer-grpc-client.ts) | Gọi seo-analyzer |
| [infra/sitemap/sitemap-discovery.ts](../../apps/crawler/src/crawler/infra/sitemap/sitemap-discovery.ts) | robots + sitemap parser |
| [domain/url-validator.ts](../../apps/crawler/src/crawler/domain/url-validator.ts) | SSRF guard |
| [domain/url-canonicalizer.ts](../../apps/crawler/src/crawler/domain/url-canonicalizer.ts) | URL dedup |
| [persistence/cache.service.ts](../../apps/crawler/src/crawler/persistence/cache.service.ts) | Redis cache |

---

## 15. Điểm nâng cấp khả dĩ

- **Playwright pooling qua cluster:** hiện mỗi instance crawler tự quản pool. Horizontal scale → có thể dùng browserless.io hoặc Redis-backed pool.
- **Robots.txt + crawl-delay:** `SitemapDiscovery` dùng `PoliteFetcher` nhưng per-URL audit không respect User-agent rules trong robots.txt. Cần bổ sung `robotsParser` check trước mỗi URL.
- **Adaptive SPA detection:** hiện 3 heuristic tĩnh. Có thể train classifier nhỏ trên body size + DOM structure.
- **Lighthouse scoring drift:** Lighthouse 12 vs 11 có weight khác → kết quả so sánh cross-time có thể lệch. Cần lock version qua Docker image.
- **Screenshot:** hiện chưa capture screenshot trang. Report PDF thiếu hình minh hoạ. Có thể thêm `page.screenshot({ fullPage: false, clip: viewport })` khi dùng Playwright.

---

## 16. Đi tiếp

- Xem analyze chạy gì trên PageData → [03-seo-analyzer.md](03-seo-analyzer.md)
- Xem report dùng CWV thế nào → [05-report.md](05-report.md)
- Tra queue + event → [22-job-pipeline.md](22-job-pipeline.md)
