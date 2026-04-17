# @seo/keyword-analyzer — Keyword Analysis Service

Phân tích tần suất từ khóa (tokenize → TF → density → placement → verdict) cho một trang đã được crawler xử lý.

## Architecture (DDD)

```
src/keyword/
├── keyword.module.ts
├── controllers/    # keyword.controller (gRPC) + keyword.worker (BullMQ)
├── services/       # keyword-analyzer.service, event.publisher
├── domain/         # tokenizer, stopwords, term-frequency, density-calculator,
│                   #   placement-checker, target-verdict, language-detector
└── dto/            # keyword-request.dto, keyword-response.dto
```

## Public API

| Channel | Method / Queue | Purpose |
|---|---|---|
| gRPC `:50054` | `KeywordAnalyzerService.AnalyzeKeywords` | Sync analyze (used by tests / on-demand) |
| gRPC `:50054` | `KeywordAnalyzerService.HealthCheck` | Liveness |
| BullMQ `keyword.start` | Job processor | Main async pipeline step — consumed by `KeywordWorker` |
| Redis pub | `keyword.done` | Published via `EventPublisher` when analysis finishes |
| Redis cache | `keyword:result:<auditId>` | Result cached for downstream Report service |

Proto: `packages/proto/keyword/v1/keyword.proto`

## Dependencies

- **Redis** (ioredis) — BullMQ queue + pub/sub + result cache
- **@repo/shared** — `BULLMQ_QUEUES.KEYWORD_START`, `REDIS_KEYS`
- No database (stateless service)

## Testing

- Unit: `test/unit/*.spec.ts` — 7 domain modules isolated (tokenizer, density, verdict, etc.)
- E2E: `test/e2e/keyword.e2e-spec.ts` — gRPC roundtrip over localhost socket
- Run: `npx turbo run test --filter=@seo/keyword-analyzer`
- Current: 47 tests / 8 files

## Entrypoint

- Dev: `npm run dev` (from apps/keyword-analyzer) — nest build + watch
- Prod: `node dist/main.js` (Docker CMD in `apps/keyword-analyzer/Dockerfile`)
- Config env: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `GRPC_PORT` (default 50054)
