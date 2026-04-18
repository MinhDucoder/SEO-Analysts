# 22 — Job Pipeline & Choreography

> **Mục tiêu:** Hiểu cách 5 service phối hợp thực hiện 1 audit — qua BullMQ queues (async jobs) + Redis pub/sub (events) + gRPC (sync calls).
>
> **Lưu ý:** Không có service điều phối trung tâm. Các service tự lắng event và tự quyết định bước tiếp theo — **choreography pattern**.

---

## 1. Tổng quan 3 cơ chế giao tiếp

| Cơ chế | Mục đích | Guarantee | Latency |
|---|---|---|---|
| **BullMQ** (Redis-backed queue) | Async job với retry, dedup, backoff | At-least-once (có retry) | ms–s (depends on worker concurrency) |
| **Redis pub/sub** | Fire-and-forget event choreography | At-most-once (không persist) | <1ms |
| **gRPC** | Sync request/response | Exactly-once (nếu thành công), fail-fast | 10–100ms |

**Khi nào dùng gì?**
- **Cần retry + durable** → BullMQ.
- **Signal event "đã xong"** → Redis pub/sub.
- **Cần kết quả trả về ngay** → gRPC.

---

## 2. BullMQ Queues — 9 queue

Tên queue: [@repo/shared/BULLMQ_QUEUES](../../packages/shared/src/index.ts).

| Queue | Producer | Consumer | Payload | Options |
|---|---|---|---|---|
| `crawl.start` | gateway, F2 TickWorker | crawler | `{ auditId, url, options: { targetKeyword? } }` | attempts: 3, backoff exp 5s, jobId `crawl-{auditId}` |
| `site-crawl.start` | gateway, F2 TickWorker | crawler | `{ auditId, rootUrl, maxUrls?, targetKeyword? }` | attempts: 2, backoff exp 5s, jobId `site-crawl-{auditId}` |
| `site-crawl.url-audit` (F1) | crawler (fan-out) | crawler | `{ auditId, url, rootUrl, targetKeyword? }` | attempts 2, backoff exp 5s |
| `site-crawl.aggregate` (F1) | crawler (when counter complete) | crawler | `{ auditId, rootUrl }` | attempts 2, backoff exp 5s |
| `analyze.start` | crawler | seo-analyzer | `{ auditId, pageData, targetKeyword? }` | removeOnComplete: true |
| `keyword.start` | crawler | keyword-analyzer | `{ auditId, url, textContent, title, h1Text, metaDescription, targetKeyword? }` | removeOnComplete: true, concurrency 4 |
| `report.start` | report (WaitForBothService) | report | `{ auditId }` | — |
| `scheduled-audit.tick` (F2) | BullMQ Job Scheduler (cron) | gateway `ScheduledAuditTickWorker` | `{ scheduleId, userId, url, mode, maxUrls?, targetKeyword? }` | scheduler key `sched:<userId>:<scheduleId>` |
| `alert.send` (F2, reserved) | gateway `RegressionDetectorService` | (alerter worker — chưa implement SMTP/webhook) | `{ alertId, type, message, userId }` | — |

**JobID dedup:** `crawl.start` và `site-crawl.start` set `jobId = 'crawl-{auditId}'` → BullMQ tự chặn duplicate. Nếu user nhấn "Audit" 2 lần trong 1 giây, job thứ hai bị skip.

**Job Scheduler (F2):** `scheduled-audit.tick` dùng BullMQ v5's `upsertJobScheduler(key, { pattern: cron }, jobData)` thay vì legacy repeatable jobs — idempotent theo key, survive Redis restart qua reconciler boot-time ở `ScheduledAuditsService.onModuleInit`.

**`removeOnComplete/Fail`:** giữ history job để debug. Gateway `crawl.start` giữ 100 completed + 500 failed; các queue khác ít quan trọng thì `removeOnComplete: true`.

---

## 3. Redis Pub/Sub Channels

Danh sách đầy đủ xem [21-api-contracts.md §7](21-api-contracts.md). Tóm tắt flow:

```
crawler publish  audit.progress     → gateway emit WebSocket
crawler publish  crawl.done         → report cache CWV
crawler publish  page-audit.done    → gateway PageAuditSubscriber INSERT PageAudit (F1)
crawler publish  site-crawl.done    → gateway SiteCrawlSubscriber UPDATE Audit totals +
                                         RegressionDetectorService compare lastScore (F2)
seo-analyzer publish analyze.done   → report WaitForBoth counter
keyword publish keyword.done        → report WaitForBoth counter
report publish  report.done         → gateway fallback handler +
                                         RegressionDetectorService compare lastScore (F2)
report publish  audit.completed     → gateway primary completion
crawler/report publish audit.failed → gateway mark FAILED
```

---

## 4. gRPC Sync Calls

Dùng gRPC khi cần response:

| Client | Server | RPC | Khi nào |
|---|---|---|---|
| gateway | analyzer | `ListRules`, `UpdateRuleWeight` | Admin panel |
| gateway | report | `GetReport`, `CompareReports`, `CreateShareLink`, `RevokeShareLink`, `GetSharedReport` | Audit detail, compare, share |
| gateway | crawler/analyzer/report | `HealthCheck` | `/health` endpoint |
| crawler (F1) | analyzer | `AnalyzePage` | Per-URL site audit scoring — sync hơn là qua BullMQ `analyze.start` để tránh flood queue khi site có 500 URL |

---

## 5. Luồng 1 — Single URL audit (mode=single)

```
┌──────┐          ┌─────────┐         ┌─────────┐            ┌──────────┐          ┌────────┐          ┌────────┐
│Client│          │ gateway │         │ crawler │            │analyzer  │          │keyword │          │ report │
└──┬───┘          └────┬────┘         └────┬────┘            └────┬─────┘          └───┬────┘          └───┬────┘
   │POST /audits       │                   │                      │                    │                   │
   ├─────────────────>│                    │                      │                    │                   │
   │                   │ Prisma INSERT    │                      │                    │                   │
   │                   │ BullMQ enq       │                      │                    │                   │
   │                   │ crawl.start      │                      │                    │                   │
   │<─ 201 {auditId} ──┤                   │                      │                    │                   │
   │                   │                   │                      │                    │                   │
   │WS /ws connect     │                   │                      │                    │                   │
   ├─────audit:subscribe {auditId}────────>│                      │                    │                   │
   │                   │                   │                      │                    │                   │
   │                   │                   │◀─ consume crawl.start│                    │                   │
   │                   │                   │ UrlValidator.validate│                    │                   │
   │                   │                   │ Cheerio.fetch        │                    │                   │
   │                   │                   │ detectSpa → Playwright (if needed)       │                   │
   │                   │                   │ Lighthouse mobile+desktop                 │                   │
   │                   │                   │ extract PageData                          │                   │
   │                   │                   │                      │                    │                   │
   │                   │<── Redis PUB audit.progress {40, 'crawling'} ──               │                   │
   │<─ WS audit:progress───┤                │                      │                    │                   │
   │                   │                   │                      │                    │                   │
   │                   │                   │── Redis PUB crawl.done ────────────────────────────────────>│
   │                   │                   │                      │                    │     (CrawlDoneListener cache CWV)│
   │                   │                   │                      │                    │                   │
   │                   │                   │─ BullMQ enq analyze.start ─>│            │                   │
   │                   │                   │─ BullMQ enq keyword.start ──────────────>│                   │
   │                   │                   │                      │                    │                   │
   │                   │                   │                      │consume analyze.start                   │
   │                   │                   │                      │run 22 rules        │                   │
   │                   │                   │                      │INSERT RuleResult   │                   │
   │                   │                   │                      │cache audit:{id}:analyze_result         │
   │                   │                   │                      │Redis PUB analyze.done ──────────────>│
   │                   │                   │                      │                    │       (counter=1)│
   │                   │                   │                      │                    │consume keyword.start
   │                   │                   │                      │                    │tokenize + density │
   │                   │                   │                      │                    │cache ...keyword_result
   │                   │                   │                      │                    │Redis PUB keyword.done ──>│
   │                   │                   │                      │                    │          (counter=2→trigger)
   │                   │                   │                      │                    │                   │
   │                   │                   │                      │                    │                   │consume report.start
   │                   │                   │                      │                    │                   │read 3 cache
   │                   │                   │                      │                    │                   │aggregate 0.7/0.3
   │                   │                   │                      │                    │                   │INSERT Report + ReportKeyword[] + ReportCwv
   │                   │<── Redis PUB audit.progress {85, 'reporting'} ───────────────────────────────────│
   │<─ WS audit:progress {85}│            │                      │                    │                   │
   │                   │                   │                      │                    │                   │
   │                   │<── Redis PUB report.done + audit.completed ───────────────────────────────────────│
   │                   │UPDATE Audit status=COMPLETED             │                    │                   │
   │<─ WS audit:completed {finalScore}│    │                      │                    │                   │
   │                   │                   │                      │                    │                   │
   │GET /audits/:id    │                   │                      │                    │                   │
   ├─────────────────>│                    │                      │                    │                   │
   │                   │gRPC GetReport ─────────────────────────────────────────────────────────────────>│
   │                   │<─ GetReportResponse ───────────────────────────────────────────────────────────│
   │<─ 200 full report─┤                   │                      │                    │                   │
```

**Tổng thời gian:**
- ~2s — gateway → crawler fetch + extract (Cheerio).
- ~5-20s — Lighthouse (phần lớn thời gian).
- ~1s — analyze + keyword song song.
- ~0.5s — report aggregate + persist.

**Happy path tổng:** 8–25s.

---

## 6. Luồng 2 — Site audit (mode=site, F1)

```
POST /audits {mode: 'site', rootUrl, maxUrls: 100}
  │
  ▼
gateway INSERT Audit + BullMQ enq site-crawl.start
  │
  ▼
crawler.SiteCrawlStartWorker:
  ├─ SitemapDiscovery.discoverAllUrls(rootUrl, 100)
  │   ├─ Fetch robots.txt
  │   ├─ Parse Sitemap: directives
  │   ├─ Recurse sitemap index (max depth 2)
  │   └─ Dedup, cap 100 URLs
  │
  ├─ SiteCrawlCounter.setExpected(auditId, 100) → Redis SET expected=100
  ├─ publish audit.progress {20, 'crawling'}
  │
  └─ Enq 100 jobs vào site-crawl.url-audit
        ├─ job1: {auditId, url1, rootUrl, targetKeyword}
        ├─ job2: {auditId, url2, ...}
        ...
        └─ job100: ...

   ┌───────────────────────────────────────┐
   │       100 parallel UrlAuditWorker     │
   │                                        │
   │   (mỗi worker chạy):                  │
   │   ├─ crawler.orchestrator.crawl(url,  │
   │   │    {includeLighthouse: false})    │
   │   ├─ AnalyzerGrpcClient.analyzePage( │
   │   │    auditId, pageData, keyword)    │
   │   ├─ PageAuditResultStore.append(    │
   │   │    auditId, {url, score, issues})│
   │   ├─ publish page-audit.done → gateway│
   │   │         INSERT PageAudit row     │
   │   ├─ SiteCrawlCounter.markDone()     │
   │   │    → Redis INCR done             │
   │   ├─ publish audit.progress {        │
   │   │    20 + floor(done/100 × 70)     │
   │   │ }                                 │
   │   └─ IF done == 100: enq aggregate   │
   └───────────────────────────────────────┘
                        │
                        ▼
crawler.SiteCrawlAggregateWorker (1 lần duy nhất):
  ├─ PageAuditResultStore.readAll(auditId) → 100 results
  ├─ Compute: totalUrls, auditedUrls, avgScore, medianScore, worstPages[10]
  ├─ publish site-crawl.done {summary} → gateway UPDATE Audit totals
  ├─ publish audit.progress {100, 'completed'}
  └─ DEL site-crawl:{id}:* (cleanup)

NOTE: Site audit KHÔNG chạy keyword analyzer cho mỗi URL (chỉ cho trang chính, qua flow 1).
      Site audit KHÔNG blend CWV vào final score (vì skip Lighthouse per URL).
      "finalScore" của site audit = avgScore từ aggregate.
```

**Fan-out/fan-in** = pattern chìa khoá:
- **Fan-out:** 1 discover → N workers chạy song song.
- **Fan-in:** counter atomic (INCR) → last worker trigger aggregate.

**Concurrency limit:** BullMQ mặc định không limit worker per queue. Muốn throttle → set `concurrency` trong processor decorator hoặc worker option.

---

## 7. Fan-in pattern (WaitForBothService)

**Vấn đề:** Report cần đợi **cả** analyze.done + keyword.done trước khi chạy. 2 event này xảy ra song song, thứ tự không xác định.

**Giải pháp:** Redis atomic INCR + check count.

```typescript
async maybeTrigger(auditId: string) {
  const count = await redis.incr(`audit:${auditId}:completed_steps`);

  if (count === 2) {
    await reportQueue.add('report.start', { auditId });
    await redis.expire(`audit:${auditId}:completed_steps`, 600);  // cleanup
  }
}
```

**Tính chất:**
- **Idempotent** — nếu 1 event publish 2 lần (BullMQ retry), count lên 3 → không trigger lần nữa.
- **Atomic** — Redis INCR atomic, không race condition.
- **Self-cleanup** — TTL 600s sau khi trigger.

**Tại sao không dùng `Promise.all` trong 1 service?** Vì analyze + keyword chạy ở 2 service khác nhau, không share memory. Buộc phải signal qua Redis.

---

## 7b. Luồng 3 — Scheduled audit + regression alert (F2)

```
User POST /scheduled-audits {url, cron: "0 9 * * MON"}
  │
  ▼
gateway.ScheduledAuditsService.create:
  ├─ validateUrlSafety(url)
  ├─ INSERT ScheduledAudit row (isActive=true)
  └─ ScheduledAuditScheduler.upsert(key=`sched:<userId>:<scheduleId>`, pattern: cron)
        → BullMQ v5 upsertJobScheduler registers cron in Redis

   (... later, Monday 09:00 UTC ...)

BullMQ Job Scheduler fires → enqueue job on scheduled-audit.tick queue
  │
  ▼
gateway.ScheduledAuditTickWorker:
  ├─ prisma.scheduledAudit.findUnique(scheduleId)
  │   └─ nếu missing hoặc isActive=false → skip (survive DB/Redis drift)
  ├─ prisma.audit.create({ userId, url, mode, status: PENDING })
  ├─ redis.set(`audit:<newAuditId>:schedule`, scheduleId, EX=24h)
  ├─ prisma.scheduledAudit.update({ lastRunAt: now })
  └─ AuditQueueProducer.enqueueCrawlStart OR enqueueSiteCrawlStart
        → bình thường như user audit
           │
           ▼
        (pipeline crawl → analyze → keyword → report chạy như Luồng 1)
           │
           ▼
        report publish report.done / site-crawl.done
           │
           ▼
gateway.RegressionDetectorService (listen report.done + site-crawl.done):
  ├─ redis.get(`audit:<auditId>:schedule`) → nếu null, bỏ qua (audit on-demand)
  ├─ prisma.scheduledAudit.findUnique(scheduleId) → snapshot lastScore
  ├─ prisma.scheduledAudit.update({ lastScore: round(newScore) })
  │
  ├─ IF newScore === 0:
  │     → emit AuditAlert(type: site_down, message: "Site returned zero score")
  │
  └─ IF lastScore != null AND (lastScore - newScore) >= SCORE_DROP_THRESHOLD (10):
        → emit AuditAlert(type: score_drop, deltaScore: diff,
                          message: "SEO score dropped N points (from X to Y)")
```

**Pause/Resume:** `PATCH /scheduled-audits/:id/pause` set `isActive=false` + `removeJobScheduler(key)` → cron không fire. Resume ngược lại.

**Boot reconcile:** `ScheduledAuditsService.onModuleInit` query `isActive=true` và re-upsert tất cả — nếu Redis flush hoặc container restart, cron state khôi phục từ Postgres.

---

## 8. Error handling

### 8.1 BullMQ retry

```typescript
await queue.add('crawl.start', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});
```

- Attempt 1 fail → retry sau 5s.
- Attempt 2 fail → retry sau 10s.
- Attempt 3 fail → move to `failed` list.

### 8.2 Fail propagation

Khi worker throw:
- BullMQ `@OnWorkerEvent('failed')` trigger.
- Worker publish `audit.failed { auditId, error }`.
- Gateway handler UPDATE `Audit.status=failed, errorMessage`.
- Gateway emit WS `audit:failed {error}`.

**Trừ crawler F1 per-URL worker:** lỗi 1 URL **không** fail cả audit — trả result score 0 + log error. Vì site audit vẫn hữu ích dù 1–2 URL chết.

### 8.3 Partial completion

Nếu analyze.done đến nhưng keyword.done không bao giờ đến (vd keyword-analyzer crash):
- WaitForBoth counter stuck ở 1.
- Counter TTL (sau khi được incr) → 1h auto expire.
- Audit stuck ở status=ANALYZING.

**Giải pháp** (chưa implement): cron job kiểm Audit `status != COMPLETED/FAILED && createdAt < 5min ago` → set `status=failed, errorMessage='Pipeline stalled'`.

---

## 9. Scaling considerations

### 9.1 Horizontal scale per service

| Service | Scale strategy | Bottleneck |
|---|---|---|
| gateway | Stateless, scale N instance behind LB | DB connection pool |
| crawler | Scale N instance, BullMQ auto-distribute | RAM (Chromium ~200MB × N) |
| seo-analyzer | Scale freely | DB RuleResult insert |
| keyword-analyzer | Scale freely, concurrency 4 per instance | CPU (pure compute) |
| report | Scale N (shared DB + PDF pool) | Chromium RAM |

### 9.2 BullMQ distribution

1 queue → N worker instance tự grab job. Không có master-worker. Redis BRPOP đảm bảo 1 job chỉ được 1 worker xử lý.

### 9.3 Redis single point of failure

Redis down → toàn bộ pipeline chết:
- Queue không consume job.
- Pub/sub không deliver.
- Cache miss → worker chậm lại (nhưng vẫn chạy).

**Giải pháp prod:**
- Redis Sentinel / Cluster.
- Upstash có tự động replication.

### 9.4 gRPC retries

Gateway gRPC client mặc định không retry. Nếu analyzer/report tạm thời unhealthy:
- Request lỗi → user thấy 500.
- Nên thêm `@grpc/grpc-js` retry policy cho idempotent calls (ListRules, GetReport).

---

## 10. Observability

### 10.1 Progress tracking

**Realtime:** WebSocket `audit:progress`.

**Polling fallback:** `GET /audits/:id/status` → gateway đọc Redis cache `audit:{id}:progress` + `audit:{id}:stage`.

**Stage progression:**
```
pending → crawling (20–40) → analyzing (66) → reporting (85) → completed (100)
               ↑                 ↑                 ↑
               ↑               analyzer          report.start
            crawler           publish            worker
         publish progress    analyze.done
```

### 10.2 Logs

- NestJS default Logger (JSON format in prod).
- `x-request-id` middleware gắn ID duy nhất mỗi HTTP request → trace xuyên log.
- BullMQ worker events: `completed`, `failed`, `progress` — log tất cả.

### 10.3 Metrics (đề xuất)

Chưa implement nhưng có thể:
- Prometheus export: BullMQ queue depth, job duration histogram, Redis hit/miss ratio.
- Grafana dashboard: audit completion time P50/P95/P99 per service.

---

## 11. Kiểm thử pipeline

File: [scripts/smoke-test.sh](../../scripts/seed-test-data.sh) (tên hơi khác).

Flow smoke test:
1. Tạo user `POST /auth/register`.
2. Verify email (đọc token từ response dev mode).
3. Login → lấy accessToken.
4. Tạo audit `POST /audits { url: "https://example.com" }`.
5. Poll `GET /audits/:id/status` mỗi 2s cho đến khi `status=completed` hoặc timeout 60s.
6. GET `/audits/:id` → assert `seoScore > 0`.
7. GET `/audits/:id/export` → assert 302 + PDF bytes.

Mục đích: catch regression end-to-end khi refactor pipeline.

---

## 12. File tham chiếu

| File | Mục đích |
|---|---|
| [packages/shared/src/index.ts](../../packages/shared/src/index.ts) | `BULLMQ_QUEUES` + `REDIS_KEYS` |
| [apps/gateway/src/audits/services/audit-queue.producer.ts](../../apps/gateway/src/audits/services/audit-queue.producer.ts) | Enqueue crawl.start / site-crawl.start |
| [apps/gateway/src/infra/websocket/progress-subscriber.service.ts](../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts) | Gateway subscribe 4 channel |
| [apps/crawler/src/crawler/controllers/crawler.worker.ts](../../apps/crawler/src/crawler/controllers/crawler.worker.ts) | Main crawl + fan-out |
| [apps/crawler/src/crawler/controllers/site-crawl-start.worker.ts](../../apps/crawler/src/crawler/controllers/site-crawl-start.worker.ts) | Discover + fan-out site audit |
| [apps/crawler/src/crawler/controllers/url-audit.worker.ts](../../apps/crawler/src/crawler/controllers/url-audit.worker.ts) | Per-URL F1 audit |
| [apps/crawler/src/crawler/controllers/site-crawl-aggregate.worker.ts](../../apps/crawler/src/crawler/controllers/site-crawl-aggregate.worker.ts) | Fan-in aggregate |
| [apps/crawler/src/crawler/services/site-crawl-counter.service.ts](../../apps/crawler/src/crawler/services/site-crawl-counter.service.ts) | INCR counter |
| [apps/crawler/src/crawler/services/event-publisher.ts](../../apps/crawler/src/crawler/services/event-publisher.ts) | Redis publish helpers (crawl.done / page-audit.done / site-crawl.done) |
| [apps/crawler/src/crawler/infra/fetchers/link-checker.ts](../../apps/crawler/src/crawler/infra/fetchers/link-checker.ts) | F4 LinkChecker primitive (HEAD/GET fallback, redirect chain, concurrency) |
| [apps/gateway/src/scheduled-audits/services/scheduled-audit-scheduler.service.ts](../../apps/gateway/src/scheduled-audits/services/scheduled-audit-scheduler.service.ts) | F2 BullMQ Job Scheduler wrapper |
| [apps/gateway/src/scheduled-audits/controllers/scheduled-audit-tick.worker.ts](../../apps/gateway/src/scheduled-audits/controllers/scheduled-audit-tick.worker.ts) | F2 TickWorker — cron fire → new Audit |
| [apps/gateway/src/scheduled-audits/services/regression-detector.service.ts](../../apps/gateway/src/scheduled-audits/services/regression-detector.service.ts) | F2 regression detector |
| [apps/gateway/src/audits/services/page-audit-subscriber.service.ts](../../apps/gateway/src/audits/services/page-audit-subscriber.service.ts) | F1 page-audit.done subscriber |
| [apps/gateway/src/audits/services/site-crawl-subscriber.service.ts](../../apps/gateway/src/audits/services/site-crawl-subscriber.service.ts) | F1 site-crawl.done finalizer |
| [apps/report/src/report/services/wait-for-both.service.ts](../../apps/report/src/report/services/wait-for-both.service.ts) | 2-step fan-in |
| [apps/report/src/report/controllers/{analyze,keyword,crawl}-done.listener.ts](../../apps/report/src/report/controllers/) | Redis subscribers |
| [apps/report/src/report/controllers/report.worker.ts](../../apps/report/src/report/controllers/report.worker.ts) | Final aggregate worker |
| [scripts/seed-test-data.sh](../../scripts/seed-test-data.sh) | Smoke test pipeline |

---

## 13. Đi tiếp

Phần backend coverage đã đủ. Đi tới thiết kế giao diện:
- [30-frontend-architecture.md](30-frontend-architecture.md) — Next.js app structure.
- [31-page-specs.md](31-page-specs.md) — từng page consume các queue + event trên như thế nào.
- [33-realtime-ux.md](33-realtime-ux.md) — Socket.IO client + optimistic UI.
