# @seo/report — Report Aggregation & PDF Service

Tổng hợp kết quả từ Analyzer + Keyword + CWV (từ Crawler) → 1 report duy nhất. Xuất PDF (Playwright + Handlebars). So sánh 2 audit cùng domain. Share link public.

## Architecture (DDD)

```
src/report/
├── report.module.ts
├── controllers/
│   ├── report.grpc.controller.ts   # gRPC API
│   ├── report.http.controller.ts   # /audits/:id/export (PDF download)
│   ├── report.worker.ts            # BullMQ report.start processor
│   ├── analyze-done.listener.ts    # Redis sub: analyze.done
│   └── keyword-done.listener.ts    # Redis sub: keyword.done
├── services/
│   ├── report.service.ts           # main use cases
│   ├── report.aggregator.ts        # per-rule + CWV → overall score
│   ├── report.comparator.ts        # audit-vs-audit delta
│   ├── wait-for-both.service.ts    # 2/2 counter before enqueueing report.start
│   └── share-link.service.ts       # public share token issue + revoke
├── persistence/
│   └── report.repository.ts        # Prisma transactional writer
└── domain/                         # analyze-result, keyword-result, report-payload interfaces

src/infra/
├── prisma/   # + generated/
├── redis/
└── pdf/      # browser-pool, pdf.generator, templates/ (handlebars + css)
```

## Public API

| Channel | Method / Queue | Purpose |
|---|---|---|
| gRPC `:50055` | `ReportService.GetReport` / `GetSharedReport` / `CompareReports` / `GeneratePdf` / `CreateShareLink` / `RevokeShareLink` | Called by Gateway |
| HTTP `:3004` | `GET /audits/:id/export` | Streams PDF buffer |
| HTTP `:3004` | `GET /health` | Liveness |
| BullMQ `report.start` | Job processor | Enqueued by `WaitForBothService` once analyze+keyword both done |
| Redis sub | `analyze.done`, `keyword.done` | Listeners mark per-audit step counter → trigger report.start |
| Redis pub | `report.done`, `audit.completed` | Gateway WS picks these up |

Proto: `packages/proto/report/v1/report.proto`

## Aggregation logic (ReportAggregator)

- `overallScore = 0.7 × analyzer_weighted_score + 0.3 × cwv_score`
- Category scores: weighted avg per `IssueCategory`
- Critical issues: rules với `status=FAIL && weight >= 7`
- Classification via `@repo/shared classify()`

## Dependencies

- **Postgres** (Prisma) — `Report`, `ShareLink` tables
- **Redis** — BullMQ + pub/sub + `REDIS_KEYS.auditCompletedSteps(auditId)` counter
- **Playwright** — PDF rendering (same image as crawler)
- **Handlebars** — HTML templates in `src/infra/pdf/templates/` (report.hbs + report.css)

## Testing

- Unit: aggregator, comparator, repository, service, share-link, wait-for-both, pdf.generator (7 files)
- Integration: `test/integration/report-pipeline.e2e-spec.ts` — stub pipeline end-to-end
- Fixtures: `test/fixtures/{analyze-result,keyword-result,cwv}.fixture.ts`
- Current: 26 tests / 8 files

## Entrypoint

- Dockerfile: Playwright base + `docker-entrypoint.sh` → migrate → node
- Config env: `REPORT_DATABASE_URL`, `REDIS_URL`, `HTTP_PORT` (3004), `GRPC_PORT` (50055)
- Memory budget: 1.5 GB (PDF rendering)
