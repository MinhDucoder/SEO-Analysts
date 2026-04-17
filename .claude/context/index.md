# Context Index

> Danh mục tất cả context files để nhanh chóng tìm đúng thông tin.

## Files trong context/

| File | Mô tả | Khi nào đọc |
|------|--------|-------------|
| `architecture.md` | Kiến trúc tổng quan hệ thống | Task liên quan cấu trúc, thêm feature mới |
| `tech-stack.md` | Chi tiết tech stack + versions | Debug dependency, upgrade, config |
| `data-flow.md` | Luồng dữ liệu chính trong app | Debug data issues, thêm API mới |

## Quick Reference

### Project: SEO Analysis Platform (Đồ Án)
- **Type**: Full-stack SEO audit tool
- **Monorepo**: Turborepo (pnpm workspaces)
- **Node.js**: 20
- **Architecture**: 5 NestJS microservices with DDD per service; gRPC + BullMQ + Redis pub/sub
- **DB boundary**: 3 separate Postgres (no cross-service DB reads)

### Services

| Service | Purpose | Ports | Stack |
|---|---|---|---|
| `gateway` | Public HTTP+WS API, auth, orchestrator | 3000 HTTP, 50051 gRPC | NestJS + Prisma + Socket.IO |
| `crawler` | Fetch HTML + Lighthouse CWV | 50052 gRPC | Playwright + Cheerio |
| `seo-analyzer` | 20 SEO rules → scores | 50053 gRPC | NestJS + Prisma |
| `keyword-analyzer` | TF + placement + density | 50054 gRPC | NestJS (stateless) |
| `report` | Aggregate + PDF + compare | 3004 HTTP, 50055 gRPC | NestJS + Prisma + Playwright |

### Shared Packages

| Package | Purpose |
|---|---|
| `@repo/shared` | Constants (`BULLMQ_QUEUES`, `REDIS_KEYS`, `JWT_CONFIG`, `RATE_LIMIT`), enums (`AuditStatus`, `CheckStatus`, `UserRole`), interfaces (`PageData`, `CoreWebVitals`, `ImageInfo`) |
| `@repo/proto` | gRPC .proto + compiled .d.ts for all service contracts |
| `@repo/ui` | Shared UI components (shadcn/ui) — consumed by future `apps/web` |
| `@repo/typescript-config` | Base tsconfig variants (nestjs, nextjs) |
| `@repo/eslint-config` | Shared ESLint configs |

### Databases (3 × Postgres, per-service boundary)

| DB | Service | Key tables |
|---|---|---|
| `seo_gateway` | gateway | User, Audit, RefreshToken |
| `seo_analyzer` | seo-analyzer | SeoRule, RuleResult |
| `seo_report` | report | Report, ShareLink |

Prisma clients generated into `apps/<service>/src/infra/prisma/generated/` (committed to git).

### Redis usage

- **BullMQ queues**: `crawl.start`, `analyze.start`, `keyword.start`, `report.start`
- **Pub/sub channels**: `audit.progress`, `audit.completed`, `audit.failed`, `crawl.done`, `crawl.failed`, `analyze.done`, `keyword.done`, `report.done`
- **Cache**: `crawl:<hash>`, `lighthouse:<hash>` (crawler, 1h TTL)
- **Counters/state**: `audit:<id>:progress`, `audit:<id>:stage`, rate-limiter buckets, verification tokens
- All Redis usage protected by `REDIS_PASSWORD` (see `.env.docker.example`)

### Key Paths

| Path | Description |
|---|---|
| `apps/<service>/src/controllers/` | NestJS controllers (HTTP + gRPC handlers) |
| `apps/<service>/src/services/` | Application services (use cases) |
| `apps/<service>/src/domain/` | Domain entities, value objects, domain services |
| `apps/<service>/src/persistence/` | Repository implementations (Prisma) |
| `apps/<service>/src/infra/` | gRPC clients, BullMQ, Redis, external integrations |
| `apps/<service>/prisma/` | Per-service schema + migrations |
| `packages/proto/<domain>/*.proto` | gRPC contracts (analyzer, crawler, keyword, report, common) |
| `packages/shared/src/` | Cross-service constants + types |

### Entry Points (per service)

| Service | File | Notes |
|---|---|---|
| gateway | `apps/gateway/src/main.ts` | Express HTTP + gRPC client bootstrap + Socket.IO |
| crawler | `apps/crawler/src/main.ts` | gRPC-only microservice bootstrap |
| seo-analyzer | `apps/seo-analyzer/src/main.ts` | gRPC-only |
| keyword-analyzer | `apps/keyword-analyzer/src/main.ts` | gRPC-only |
| report | `apps/report/src/main.ts` | Express HTTP + gRPC |

### Running locally

- `npm run docker:up` — full stack via docker-compose (uses `.env.docker`)
- `npm run dev:<service>` — single service watch mode (requires docker:up)
- `npm run e2e:smoke` — pipeline smoke test
- `npm run test --filter=<service>` — unit tests per service

### Authoritative service docs

- `apps/CLAUDE.md` — cross-service map + data flow + architecture rules
- `apps/<service>/CLAUDE.md` — per-service DDD layout + conventions

### Architecture rules (cross-service)

1. Service boundary = Postgres DB boundary. No service reads another's DB.
2. Inter-service: gRPC (sync req/resp) + BullMQ (async fan-out) + Redis pub/sub (choreography).
3. Only gateway is publicly exposed. All others backend-only.
4. Each service owns its Prisma schema; migrations run via `docker-entrypoint.sh`.
5. Proto changes follow the proto-breaking change protocol (see `WORKFLOW-SEO-ANALYSTS.md`).
