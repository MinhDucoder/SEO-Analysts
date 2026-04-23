# Services — Cross-service Map

Monorepo chứa 5 NestJS microservices + 1 Next.js web consumer. Mỗi service áp dụng DDD structure: `controllers/` + `services/` + `domain/` + `persistence/` + `infra/`. Chi tiết riêng trong `apps/<service>/CLAUDE.md`.

## Services

| Service | Purpose | Tech | Ports |
|---|---|---|---|
| **gateway** | REST+WS public API, auth, orchestrator | NestJS + Prisma + Socket.IO | `3000` (HTTP), `50051` (gRPC) |
| **crawler** | Fetch HTML + Lighthouse CWV | Playwright + Cheerio | `50052` (gRPC only) |
| **seo-analyzer** | 20 SEO rules → scores | NestJS + Prisma | `50053` (gRPC only) |
| **keyword-analyzer** | TF + placement + density | NestJS, stateless | `50054` (gRPC only) |
| **report** | Aggregate + PDF + compare | NestJS + Prisma + Playwright | `3004` (HTTP), `50055` (gRPC) |
| **web** | Next.js app — auth UI, playground (3b), api-keys (3b) | Next 15 + React 19 + Tailwind 3 + shadcn/ui + TanStack Query | `3001` (HTTP) |

## Data flow for one audit (happy path)

```
User ──HTTP──▶ gateway  (POST /audits)
                 │
                 ├─▶ BullMQ[crawl.start] ──▶ crawler.worker
                 │                             │
                 │                             ├─▶ Playwright/Cheerio fetch
                 │                             ├─▶ Lighthouse
                 │                             ├─▶ Redis.publish('audit.progress')
                 │                             │
                 │                             ├─▶ BullMQ[analyze.start] ──▶ seo-analyzer.worker
                 │                             │                               ├─▶ run 20 rules
                 │                             │                               ├─▶ Prisma.RuleResult.createMany
                 │                             │                               └─▶ Redis.publish('analyze.done')
                 │                             │
                 │                             └─▶ BullMQ[keyword.start] ──▶ keyword-analyzer.worker
                 │                                                             ├─▶ tokenize + TF + density
                 │                                                             └─▶ Redis.publish('keyword.done')
                 │
                 │ (Report listens for BOTH analyze.done + keyword.done)
                 │
                 │   report.analyze-done.listener ──▶ WaitForBothService (counter 1/2)
                 │   report.keyword-done.listener ──▶ WaitForBothService (counter 2/2)
                 │                                        │
                 │                                        └─▶ BullMQ[report.start] ──▶ report.worker
                 │                                                                       ├─▶ aggregate score
                 │                                                                       ├─▶ Prisma.Report.create
                 │                                                                       └─▶ Redis.publish('report.done')
                 │
                 └◀── WebSocket audit:progress / audit:completed
                      (gateway/progress-subscriber.service subscribes to Redis channels)
```

## Shared packages

| Package | Purpose |
|---|---|
| `@repo/shared` | Constants: `BULLMQ_QUEUES`, `REDIS_KEYS`, `JWT_CONFIG`, `RATE_LIMIT`; enums: `AuditStatus`, `CheckStatus`, `UserRole`, `IssueCategory`, `Classification`; interfaces: `PageData`, `CoreWebVitals`, `ImageInfo`, `LinkInfo`; util `classify()` |
| `@repo/proto` | Proto definitions + compiled .d.ts for all gRPC interfaces |
| `@repo/typescript-config` | Base tsconfig.json variants (nestjs, nextjs) |
| `@repo/eslint-config` | Shared ESLint configs — note: `nestjs.js` ignores `dist/ coverage/ generated/` |

## Databases

3 separate Postgres databases (per-service schema boundary):

| DB | Service | Key tables |
|---|---|---|
| `seo_gateway` | gateway | User, Audit, RefreshToken |
| `seo_analyzer` | seo-analyzer | SeoRule, RuleResult |
| `seo_report` | report | Report, ShareLink |

All Prisma clients generated into `apps/<service>/src/infra/prisma/generated/` (tracked in git, regenerated via `prisma generate`).

## Redis usage

- **BullMQ queues**: `crawl.start`, `analyze.start`, `keyword.start`, `report.start`
- **Pub/Sub channels**: `audit.progress`, `audit.completed`, `audit.failed`, `crawl.done`, `crawl.failed`, `analyze.done`, `keyword.done`, `report.done`
- **Cache**: `crawl:<hash>`, `lighthouse:<hash>` (crawler) — 1h TTL
- **Counters/state**: `audit:<id>:progress`, `audit:<id>:stage`, `REDIS_KEYS.auditCompletedSteps(id)`, verification/reset tokens, rate-limiter buckets

All Redis usage protected by `REDIS_PASSWORD` (see `.env.docker.example`).

## Running locally

- `npm run docker:up` (uses `.env.docker`) — full stack via docker-compose
- `npm run dev:<service>` — single service in watch mode (requires DB+Redis up)
- `npm run e2e:smoke` — end-to-end pipeline smoke test

## Architecture rules (cross-service)

1. Service boundary = Postgres DB boundary. No service reaches another's DB.
2. Inter-service communication:
   - **gRPC** for synchronous request/response (gateway → analyzer/report/crawler)
   - **BullMQ** for async jobs (fan-out pipeline)
   - **Redis pub/sub** for progress events + choreography signals
3. Gateway is the only service with public HTTP exposure + auth. All others are backend-only.
4. Each service owns its Prisma schema; migrations run at container start via `docker-entrypoint.sh`.
