# Tier 1 — Session Context (resume point)

> Snapshot để session tiếp theo pick up không phải đọc lại conversation. Date: 2026-04-17.

## Trạng thái tổng quan

- **Branch**: `main`, ahead **43 commits** của `origin/main` — chưa `git push`
- **Workflow đang dùng**: `.claude/workflow/WORKFLOW-LARGE.md` (auto-decide mode)
- **Commit convention**: KHÔNG `Co-Authored-By: Claude` — CLAUDE.md rule 1a
- **Test-first**: TDD RED → GREEN per primitive, full gates pass trước commit
- **Auto-decide**: tự quyết scope, không hỏi lại user

## Tier 1 roadmap — trạng thái feature

| F# | Feature | Status | Commits |
|---|---|---|---|
| F3 | Flesch-Kincaid Readability | ✅ DONE | `6342621` + `9834858` |
| F5 | Dual Lighthouse (mobile+desktop) | ✅ DONE | `87529d3` + `6605b66` + `ce79b44` + `658feda` |
| F1 | Site-wide Crawl | 🚧 IN PROGRESS (primitives + 2 workers done) | `deb0dab` → `28f892b` (8 commits) |
| F4 | Broken Links | ⏳ NOT STARTED | — |
| F2 | Scheduled Audits | ⏳ NOT STARTED | — |

## F1 — cấu trúc đã có

```
apps/crawler/src/crawler/
├── domain/
│   └── url-canonicalizer.ts         ✅  canonicalizeUrl/dedupeUrls/sameRegistrableDomain
├── infra/
│   ├── fetchers/
│   │   └── polite-fetcher.ts        ✅  global + per-host concurrency + 429/5xx backoff
│   └── sitemap/
│       ├── sitemap-discovery.ts     ✅  robots.txt → sitemap chain → canonical URL list
│       └── undici-sitemap-http-client.ts  ✅  PoliteFetcher → SitemapHttpClient adapter
├── services/
│   ├── site-crawl-counter.service.ts  ✅  Redis INCR fan-in (setExpected/markDone/cleanup)
│   └── (existing) crawler.orchestrator.ts, lighthouse-runner.ts, event-publisher.ts
└── controllers/
    ├── site-crawl-start.worker.ts   ✅  BullMQ[site-crawl.start] — discovery + fan-out
    ├── url-audit.worker.ts          ⏳ NEXT — per-URL crawl + analyze + save PageAudit
    └── site-crawl-aggregate.worker.ts ⏳ NEXT — fan-in → final Report
```

### Module đã register

- 3 queue mới: `SITE_CRAWL_START`, `SITE_CRAWL_URL_AUDIT`, `SITE_CRAWL_AGGREGATE`
- Providers: `PoliteFetcher`, `SitemapDiscovery`, `UndiciSitemapHttpClient`, `SiteCrawlCounter`, `SiteCrawlStartWorker`
- `PoliteFetcher` dùng `globalThis.fetch` (Node 18+ built-in)

### Gateway DB (Prisma) đã migrate

```prisma
enum AuditMode { single  site }
model Audit {
  // ... existing
  mode                  AuditMode   @default(single)
  discoveredUrlsCount   Int?
  auditedUrlsCount      Int?
  pageAudits            PageAudit[]
}
model PageAudit {
  id        String   @id
  auditId   String
  url       String
  score     Int
  issues    Json
  fetchedAt DateTime
}
```

Migration: `20260417170000_add_audit_mode_page_audits/migration.sql` (đã tạo, chưa deploy — an toàn NULLABLE defaults)

### Shared constants đã có

```typescript
// @repo/shared
export enum AuditMode { SINGLE = 'single', SITE = 'site' }
export enum FormFactor { MOBILE = 'mobile', DESKTOP = 'desktop' }
export const BULLMQ_QUEUES = {
  // ... existing
  SITE_CRAWL_START: 'site-crawl.start',
  SITE_CRAWL_URL_AUDIT: 'site-crawl.url-audit',
  SITE_CRAWL_AGGREGATE: 'site-crawl.aggregate',
}
export const SITE_CRAWL_LIMITS = {
  MAX_URLS_PER_SITEMAP: 50_000,
  MAX_SITEMAP_BYTES: 50 * 1024 * 1024,
  MAX_SITEMAP_INDEX_DEPTH: 2,
  DEFAULT_MAX_URLS_PER_AUDIT: 500,
  HARD_CAP_MAX_URLS_PER_AUDIT: 5000,
}
```

## F1 pipeline — flow đã hoạt động vs chưa

```
┌────────────────────────────────────────────────────────────────┐
│ DONE ✅                                                         │
├────────────────────────────────────────────────────────────────┤
│ BullMQ[site-crawl.start]                                       │
│  └─▶ SiteCrawlStartWorker                                      │
│       ├─ SitemapDiscovery(rootUrl, cap)                        │
│       ├─ SiteCrawlCounter.setExpected(id, N)                   │
│       ├─ publishProgress(10%, 'site-crawl-discovery')          │
│       ├─ publishProgress(20%, 'site-crawl-fanout')             │
│       └─ fan-out N × urlAuditQueue.add(site-crawl.url-audit)   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ NOT IMPLEMENTED ⏳ — next session                              │
├────────────────────────────────────────────────────────────────┤
│ BullMQ[site-crawl.url-audit]                                   │
│  └─▶ UrlAuditWorker                                            │
│       ├─ CrawlerOrchestrator.crawl(url) (reuse existing)       │
│       ├─ gRPC call: AnalyzerGrpcClient.analyzePage(pageData)   │
│       ├─ persist PageAudit { auditId, url, score, issues }     │
│       │    ← cần PageAuditRepository ở đâu? See Design calls   │
│       ├─ publishProgress(per-URL tick)                         │
│       └─ SiteCrawlCounter.markDone(id) → if complete:          │
│            aggregateQueue.add(site-crawl.aggregate, { id })    │
│                                                                │
│ BullMQ[site-crawl.aggregate]                                   │
│  └─▶ SiteCrawlAggregateWorker                                  │
│       ├─ read all PageAudit rows for audit                     │
│       ├─ compute: avg score, median, top 10 worst pages        │
│       ├─ save single Audit.seoScore = avg                      │
│       ├─ publishProgress(100%, 'site-crawl-done')              │
│       ├─ publish 'report.done'                                 │
│       └─ counter.cleanup(id)                                   │
│                                                                │
│ Gateway (audits.controller.ts / audits.service.ts)             │
│  └─ POST /audits { url, mode: 'site', maxUrls? }               │
│      ├─ validate mode enum                                     │
│      ├─ create Audit row with mode=site                        │
│      └─ BullMQ enqueue site-crawl.start (NOT crawl.start)      │
│                                                                │
│ PageAuditRepository (gateway)                                  │
│  └─ createMany / findManyByAuditId                             │
└────────────────────────────────────────────────────────────────┘
```

## Design calls cần quyết session sau

### 1. UrlAuditWorker persists PageAudit qua đâu?

Crawler service KHÔNG có quyền ghi `seo_gateway` DB (boundary rule). Hai option:

**Option A (recommend)**: Crawler publish `page-audit.done` event qua Redis pub/sub; gateway subscribe + write row. Clean boundary, nhưng thêm 1 listener nữa.

**Option B**: Crawler gọi gateway gRPC `SavePageAudit` — cần thêm method vào gateway proto (breaking-change protocol).

**Quyết định**: **A**. Tái dùng pattern `crawl.done` listener hiện có ở `report` service.

### 2. UrlAuditWorker có full-pipeline không?

Trong single-mode, `crawler` chỉ chạy crawl + Lighthouse, fan-out vào `analyze.start` + `keyword.start`, wait → `report.start`.

Cho per-URL trong site-mode, có cần analyze + keyword + report từng URL không?

**Quyết định**: **Chỉ crawl + analyze, skip keyword + report per-URL**. Keyword ít giá trị khi scale (tốn CPU, trùng lặp cross-page), report per-URL vô nghĩa (bản tổng mới có ý nghĩa). Aggregate worker mới generate final Report.

Nghĩa là `UrlAuditWorker` gọi:
```
CrawlerOrchestrator.crawl(url) → pageData
  → AnalyzerGrpcClient.analyzePage(pageData) → score + rule results (SYNC gRPC)
  → publish 'page-audit.done' { auditId, url, score, issues }
  → SiteCrawlCounter.markDone(...)
```

Không dùng BullMQ `analyze.start` queue vì quá nặng cho 500 URL parallel (sẽ flood queue). Gọi gRPC sync đơn giản hơn.

### 3. Lighthouse cho per-URL site crawl?

Chạy Lighthouse cho 500 URLs = 500 × 10s = ~1h 20min audit. Quá chậm.

**Quyết định**: `includeLighthouse: false` trong `CrawlerOrchestrator.crawl()` mặc định cho site-mode. User có option `withLighthouse=true` nếu cần (bonus).

### 4. SiteCrawlAggregateWorker — data model cho Report?

Current `Report` table 1-1 với `Audit`. Cho site-mode:

**Quyết định**: Giữ `Report` 1-1, field `analysisSnapshot` (JSON) chứa summary của N pages (avg, median, top worst). Không cần table mới. `PageAudit` table là detail view.

## Test summary

| Service | Tests | New in session |
|---|---|---|
| crawler | 131 | +13 (counter 7, start-worker 6) |
| seo-analyzer | 92 | +11 (readability, từ sub-phase 1) |
| report | 29 | +4 (dual CWV persistence) |
| gateway | 36 | 0 |
| keyword-analyzer | 15 | 0 |
| **Total** | **303** | **+28** |

## Next session — đề xuất thứ tự

Workflow-LARGE, auto-decide, TDD mỗi primitive:

1. **UrlAuditWorker + test** (~250 LOC)
   - call `CrawlerOrchestrator.crawl(url, { includeLighthouse: false })`
   - call `AnalyzerGrpcClient.analyzePage()` 
   - publish `page-audit.done` event
   - `SiteCrawlCounter.markDone()` → if complete → enqueue aggregate
   - 8-10 test cases

2. **SiteCrawlAggregateWorker + test** (~200 LOC)
   - gRPC call to gateway: `GetPageAudits(auditId)` (cần thêm method) HOẶC query Redis snapshot
   - **Simpler**: collect page-audit results trong Redis list as they arrive, read list in aggregate worker, no gRPC
   - compute avg/median/worst
   - publish `report.done` + counter.cleanup

3. **Gateway PageAudit listener** (~100 LOC)
   - subscribe to `page-audit.done`
   - persist PageAudit row via Prisma
   - update `Audit.auditedUrlsCount++` atomically

4. **Gateway POST /audits mode=site** (~80 LOC)
   - update DTO: `mode?: 'single' | 'site'`, `maxUrls?: number`
   - update `AuditsService`: when mode=site, enqueue `site-crawl.start` instead of `crawl.start`
   - update existing `audits.e2e-spec.ts` tests

5. **E2E smoke** — site mode happy path (manual for now, e2e:smoke script)

## Artifacts

| File | Purpose |
|---|---|
| `docs/TIER1-BRAINSTORM.md` | Nghiên cứu 5 features, 20+ nguồn uy tín |
| `docs/TIER1-ARCHITECTURE.md` | Arch lock-in cho cả 5 sub-phase |
| `docs/TIER1-SUBPHASE1-PLAN.md` | Plan F3+F5 |
| `docs/TIER1-SESSION-CONTEXT.md` | **File này** — resume point |

## Branch + commits ahead of origin/main (43)

```
28f892b feat(crawler): add SiteCrawlStartWorker (F1 BullMQ fan-out)
b4aa66d feat(crawler): add SiteCrawlCounter fan-in primitive (F1)
78d5685 feat(gateway): Prisma schema for site-wide audits (F1)
1ef149b feat(crawler): add UndiciSitemapHttpClient adapter (F1 primitives)
3db869d feat(crawler): add PoliteFetcher (F1 primitives)
3e10911 feat(crawler): add SitemapDiscovery (F1 primitives)
bab84c0 feat(crawler): add URL canonicalizer (F1 primitives)
deb0dab chore(shared): add AuditMode + site-crawl queues + site-crawl limits
658feda feat(report): persist desktop CWV + subscribe to crawl.done (F5 part 2)
ce79b44 chore(shared): add auditCrawlResult Redis key
6605b66 feat(crawler): dual mobile+desktop Lighthouse (F5)
87529d3 chore(shared): add FormFactor enum + per-formFactor Lighthouse cache key
9834858 feat(seo-analyzer): add Flesch-Kincaid readability rule (F3)
6342621 chore(shared): add CONTENT issue category for Tier 1
6acd927 docs(tier1): add brainstorm + architecture lock-in + sub-phase 1 plan
(+ 28 trước đó từ các session trước: docs, refactor DDD, workflow, v.v.)
```

## Constraints phải nhớ

1. **Commit**: không `Co-Authored-By: Claude`, không `Generated with Claude Code`.
2. **Service boundary**: crawler KHÔNG được ghi `seo_gateway` DB — qua events/gRPC.
3. **Proto**: không đổi `packages/proto/**` trong F1. Nếu bắt buộc → proto-breaking protocol (PR 1 additive → PR 2 cleanup).
4. **Prisma migration**: NULLABLE mọi cột mới → zero-downtime safe.
5. **Test-first**: luôn TDD RED → GREEN. Primitives phải có ≥6 test cases.
6. **Read-before-edit hook**: phải Read file trước khi Edit (trừ new file Write).
7. **Lint**: monorepo accept warnings (any), block errors only.
