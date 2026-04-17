# @seo/gateway — API Gateway (REST + WebSocket + gRPC Client)

Mọi HTTP traffic từ frontend đi qua đây. Authenticate (JWT + Google OAuth). Dispatch jobs vào BullMQ (`crawl.start`), proxy-call các service khác qua gRPC, stream progress tới client qua Socket.IO (`/ws` namespace).

## Architecture (DDD)

```
src/
├── main.ts, app.module.ts
├── infra/
│   ├── prisma/       # + generated/ (Prisma client)
│   ├── redis/        # redis.service, rate-limiter.service
│   ├── grpc/         # 3 clients (crawler, analyzer, report) + factory + module
│   └── websocket/    # audit.gateway (Socket.IO), progress-subscriber (Redis sub)
├── common/           # service-wide: decorators, filters, guards, interfaces, middleware, utils
├── auth/
│   ├── auth.module.ts
│   ├── controllers/  # auth.controller
│   ├── services/     # auth, token, password, verification
│   ├── strategies/   # jwt.strategy, google.strategy
│   ├── guards/       # jwt-auth, roles, google-auth
│   └── dto/
├── audits/
│   ├── audits.module.ts
│   ├── controllers/  # audits.controller (REST)
│   ├── services/     # audits.service, audit-queue.producer
│   └── dto/
├── users/            # controllers/ + services/ + dto/
├── admin/            # controllers/ + services/ + dto/ (admin-only: user mgmt, rule weights, stats)
├── shared/           # controllers/shared.controller (public /shared/audits/:token)
└── health/           # controllers/health.controller (pings all services)
```

## Public API (REST /api/v1)

| Prefix | Feature | Auth |
|---|---|---|
| `/auth` | register, login, refresh, logout, verify-email, forgot/reset, Google OAuth | Mixed (`@Public()` on start) |
| `/audits` | create, list, detail, status, delete, export (PDF), share, compare | JWT required |
| `/users` | profile update, change password | JWT |
| `/admin` | user mgmt, rule weights, stats | JWT + `@Roles(ADMIN)` |
| `/shared/audits/:token` | public share viewer | Public |
| `/health` | liveness + downstream health | Public |

### WebSocket `/ws` namespace
- Auth: JWT in `handshake.auth.token` or Authorization header
- Messages: `audit:subscribe` (join room `audit:<id>`), `audit:unsubscribe`
- Emits: `audit:progress`, `audit:completed`, `audit:failed`
- Source of emits: `ProgressSubscriberService` subscribes to Redis (`audit.progress`, `audit.completed`, `audit.failed`, `report.done`)

## Downstream (outgoing gRPC)

| Client | Target | Used by |
|---|---|---|
| `CrawlerGrpcClient` | crawler:50052 | Health check only (jobs go via BullMQ) |
| `AnalyzerGrpcClient` | seo-analyzer:50053 | Admin rule mgmt |
| `ReportGrpcClient` | report:50055 | Audits controller (get, share, PDF, compare) |

Job dispatch: `AuditQueueProducer` enqueues `crawl.start` → crawler fan-outs to analyze + keyword → report runs after both done.

## Database (Prisma, `GATEWAY_DATABASE_URL`)

Tables: `User`, `Audit`, `RefreshToken`. Generated client at `src/infra/prisma/generated/`.

## Authentication

- Password: bcrypt cost=12 (`PasswordService`)
- JWT access token: short-lived (`JWT_ACCESS_SECRET`), issued by `TokenService`
- JWT refresh token: random 48-byte, stored hashed (`refresh_tokens` table), 30d TTL, rotated on use
- HTTP-only refresh cookie scoped to `/api/v1/auth`
- Google OAuth: optional — `GoogleStrategy` only registered when `GOOGLE_CLIENT_ID` env set
- Rate limits via Redis: `AuditQueueProducer` (audit per hour), login per 15min, register per hour (see `@repo/shared RATE_LIMIT`)

## Testing

- Unit: auth, password, token, url-validator, rate-limiter, audits services
- Integration: `test/integration/{auth,audits}.e2e-spec.ts` — Supertest + Prisma (uses real in-memory-ish DB)
- Current: 36 tests / 8 files

## Entrypoint

- Dockerfile → `docker-entrypoint.sh` → `prisma migrate deploy` → seed (default admin) → `node dist/main.js`
- Config env: `GATEWAY_DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (optional), `FRONTEND_URL`, `PORT` (3000), `GRPC_PORT` (50051)
