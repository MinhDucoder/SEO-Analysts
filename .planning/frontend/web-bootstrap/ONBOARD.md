---
phase: 1
feature_slug: web-bootstrap
tier: large
status: approved
date: 2026-04-18
source: Agent:Explore subagent (read-only scan)
---

# 1. FE folder structure + routing convention

**Status:** `apps/web/` **DOES NOT EXIST**. It must be created as a brand-new workspace per the `web-bootstrap` slug.

**Expected structure from `package.json` (line:37-40):** The root workspace glob pattern is `"workspaces": ["apps/*", "packages/*"]`, so any app directory under `apps/web/` will be automatically included in the monorepo.

**Next.js 14 TypeScript config:** Use `@repo/typescript-config/nextjs.json` ([packages/typescript-config/nextjs.json:1-12](../../../packages/typescript-config/nextjs.json)). It extends the base config and includes Next.js plugin for type checking.

**Routing convention:** Gateway runs on port `3000` ([apps/gateway/src/main.ts](../../../apps/gateway/src/main.ts)); web FE should default to `3001` per standard Next.js local dev. The gateway's `FRONTEND_URL` env defaults to `'http://localhost:3001'` ([apps/gateway/src/auth/controllers/auth.controller.ts:148](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L148)).

**API prefix:** Gateway uses `/api/v1` global prefix ([apps/gateway/src/main.ts:13](../../../apps/gateway/src/main.ts#L13)). All FE client calls should target `http://localhost:3000/api/v1` (or configurable backend URL).

---

# 2. Component design pattern

**Components in `@repo/ui`:** Three stateless React components, all with `"use client"` or RSC-compatible exports:

| Component | File | Props Shape | Client/RSC |
|---|---|---|---|
| `Button` | [packages/ui/src/button.tsx:1-20](../../../packages/ui/src/button.tsx#L1-L20) | `{ children: ReactNode; className?: string; appName: string }` | Use Client |
| `Card` | [packages/ui/src/card.tsx:1-27](../../../packages/ui/src/card.tsx#L1-L27) | `{ className?: string; title: string; children: ReactNode; href: string }` | RSC (no "use client") |
| `Code` | [packages/ui/src/code.tsx:1-11](../../../packages/ui/src/code.tsx#L1-L11) | `{ children: ReactNode; className?: string }` | RSC |

**Export pattern:** Barrel via `package.json#exports` ([packages/ui/package.json:5-6](../../../packages/ui/package.json#L5-L6)): `"./*": "./src/*.tsx"` — direct file mapping, no `index.ts` file.

**No styling foundation yet:** No `tailwind.config.ts`, `globals.css`, or design tokens defined. Web workspace must bootstrap these.

---

# 3. Styling approach

**What exists:** Nothing. No Tailwind config, no global CSS, no token system in the repo.

**What doesn't exist:**
- `tailwind.config.ts` or `tailwind.config.js`
- `globals.css` or any CSS reset
- `tokens.css` or design token definitions
- `packages/ui/src/*.css`

**Recommendation context:** `@repo/ui` components have optional `className` props (e.g., Button line:14, Card line:9, Code line:9), suggesting they expect parent/consumer to apply styling. Web workspace should:
1. Add `tailwind.config.ts` to `apps/web/`
2. Import from `@repo/ui` and layer Tailwind classes via consumer
3. Or pre-wrap components with base styles if shared design tokens needed

---

# 4. API client pattern

**No existing FE HTTP client code in monorepo.** Gateway is the only REST/WS API (runs on port 3000).

**Key `@repo/shared` HTTP types to consume ([packages/shared/src/index.ts:1-184](../../../packages/shared/src/index.ts)):**

| Type | Location | Use Case |
|---|---|---|
| `JWT_CONFIG` | lines:124-127 | Access token TTL: `'15m'`, refresh: `7` days |
| `RATE_LIMIT` | lines:117-122 | Frontend auth rate-limits: `LOGIN_ATTEMPTS_PER_15MIN: 10` |
| `AuditStatus` enum | lines:3-10 | Audit state: `pending`, `crawling`, `analyzing`, `reporting`, `completed`, `failed` |
| `CoreWebVitals` interface | lines:58-66 | Lighthouse metrics from audit response |
| `AuditProgressEvent` interface | lines:91-97 | WebSocket progress payload |

**Frontend client must support:**
- `POST /auth/register`, `/auth/login`, `/auth/refresh` (cookie + body tokens)
- `POST /audits`, `GET /audits`, `GET /audits/:id`, `GET /audits/:id/status`
- `WebSocket /ws` with namespace, JWT auth in handshake, rooms `audit:<id>`

---

# 5. State management

**None exists on FE side.** Gateway handles all state via Prisma (User, Audit, RefreshToken tables — [apps/gateway/CLAUDE.md](../../../apps/gateway/CLAUDE.md)).

**Backend session/auth patterns relevant to FE:**

| Pattern | Detail | File Reference |
|---|---|---|
| **Refresh token** | HTTP-only cookie named `refresh_token`, scoped to `/api/v1/auth`, 30d TTL | [apps/gateway/src/auth/controllers/auth.controller.ts:35-49](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L35-L49) |
| **Access token** | Short-lived JWT (15m), returned in response body `{ accessToken, user }` | [apps/gateway/src/auth/controllers/auth.controller.ts:73](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L73), line:124 (`JWT_CONFIG`) |
| **JWT payload shape** | `{ sub: userId, iat, exp }` verified at socket connection ([apps/gateway/src/infra/websocket/audit.gateway.ts:46-48](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L46-L48)) | `apps/gateway/src/common/interfaces/jwt-payload.interface` (used line:46) |
| **Google OAuth callback** | Redirects to `FRONTEND_URL/auth/oauth-success?token=<accessToken>` | [apps/gateway/src/auth/controllers/auth.controller.ts:148-149](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L148-L149) |

**No session DB state; stateless JWT.** FE must store access token in memory/closure, refresh token auto-managed by browser cookies.

---

# 6. Realtime pattern

**Single WebSocket gateway (`@WebSocketGateway`):** [apps/gateway/src/infra/websocket/audit.gateway.ts:21-93](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L21-L93)

| Handler | Payload | Direction | Room Pattern |
|---|---|---|---|
| `@SubscribeMessage('audit:subscribe')` | `{ auditId: string }` | Client→Server | `audit:<auditId>` (line:67) |
| `@SubscribeMessage('audit:unsubscribe')` | `{ auditId: string }` | Client→Server | `audit:<auditId>` (line:78) |
| `emitProgress(auditId, data)` | `AuditProgressEvent` (from `@repo/shared`) | Server→Client | Room `audit:<auditId>` (line:83) |
| `emitCompleted(auditId, data)` | `{ auditId, finalScore?, ... }` | Server→Client | Room `audit:<auditId>` (line:87) |
| `emitFailed(auditId, data)` | `{ auditId, error?, message? }` | Server→Client | Room `audit:<auditId>` (line:91) |

**Event source:** `ProgressSubscriberService` ([apps/gateway/src/infra/websocket/progress-subscriber.service.ts:26-31](../../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts#L26-L31)) subscribes to Redis channels:
- `audit.progress` → calls `emitProgress()`
- `audit.completed` → calls `emitCompleted()`
- `audit.failed` → calls `emitFailed()`
- `report.done` → idempotent trigger for `audit:completed`

**Namespace:** `/ws` (line:23, `@WebSocketGateway`)

**Auth:** JWT in `handshake.auth.token` or `Authorization` header, verified at connection (line:46-48), user ID stored in socket (line:49).

---

# 7. Available gateway HTTP endpoints

**Routes organized by feature module; all under `/api/v1` prefix:**

### Auth (`/auth`)
| Method | Path | DTO In | Response | Auth | File |
|---|---|---|---|---|---|
| POST | `/auth/register` | `RegisterDto` | `{ user, accessToken }` | Public | [auth.controller.ts:60-64](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L60-L64) |
| POST | `/auth/login` | `LoginDto` | `{ user, accessToken }` + cookie | Public | line:68-74 |
| POST | `/auth/refresh` | (from cookie) | `{ accessToken }` + cookie | Public | line:78-87 |
| POST | `/auth/logout` | — | `{ message }` | JWT | line:92-99 |
| GET | `/auth/me` | — | `AuthenticatedUser` | JWT | line:104-107 |
| POST | `/auth/verify-email` | `VerifyEmailDto` | `{ message }` | Public | line:112-115 |
| POST | `/auth/forgot-password` | `ForgotPasswordDto` | `{ message }` | Public | line:119-123 |
| POST | `/auth/reset-password` | `ResetPasswordDto` | `{ message }` | Public | line:127-131 |
| GET | `/auth/google` | — | Redirect | Public | line:136-139 |
| GET | `/auth/google/callback` | — | Redirect to FE + token | Public | line:143-150 |

### Audits (`/audits`)
| Method | Path | DTO In | Response | Auth |
|---|---|---|---|---|
| POST | `/audits` | `CreateAuditDto` | `{ id, status, ... }` | JWT |
| GET | `/audits` | `ListAuditsQuery` | `{ audits: [] }` | JWT |
| GET | `/audits/compare` | `CompareAuditsQuery` | `{ scoreDelta, ruleDelta[] }` | JWT |
| GET | `/audits/:id` | — | `GetReportResponse` (proto) | JWT |
| GET | `/audits/:id/status` | — | `{ status, progress }` | JWT |
| DELETE | `/audits/:id` | — | 204 No Content | JWT |
| GET | `/audits/:id/export` | — | Redirect to PDF URL | JWT |
| POST | `/audits/:id/share` | — | `{ shareToken, shareUrl }` | JWT |
| DELETE | `/audits/:id/share` | — | 204 No Content | JWT |

([apps/gateway/src/audits/controllers/audits.controller.ts](../../../apps/gateway/src/audits/controllers/audits.controller.ts))

### Users (`/users`)
| Method | Path | DTO In | Response | Auth |
|---|---|---|---|---|
| PATCH | `/users/profile` | `UpdateProfileDto` | `{ id, fullName, ... }` | JWT |
| PATCH | `/users/password` | `ChangePasswordDto` | `{ message }` | JWT |

([apps/gateway/src/users/controllers/users.controller.ts](../../../apps/gateway/src/users/controllers/users.controller.ts))

### Admin (`/admin`) — Roles(ADMIN) + JWT
| Method | Path | DTO In | Response | File |
|---|---|---|---|---|
| GET | `/admin/users` | `ListUsersQuery` | `{ users: [] }` | [admin.controller.ts:26-29](../../../apps/gateway/src/admin/controllers/admin.controller.ts#L26-L29) |
| PATCH | `/admin/users/:id` | `UpdateUserDto` | `{ id, ... }` | line:31-38 |
| GET | `/admin/rules` | — | `{ rules: SeoRule[] }` | line:40-43 |
| PUT | `/admin/rules` | `UpdateRulesDto` | `{ rules: [] }` | line:45-48 |
| GET | `/admin/stats` | Query: `period` | `{ ... }` | line:50-54 |

### Scheduled Audits (`/scheduled-audits`) — JWT
| Method | Path | DTO In | Response | File |
|---|---|---|---|---|
| POST | `/scheduled-audits` | `CreateScheduledAuditDto` | `{ id, ... }` | [scheduled-audits.controller.ts:27-32](../../../apps/gateway/src/scheduled-audits/controllers/scheduled-audits.controller.ts#L27-L32) |
| GET | `/scheduled-audits` | — | `{ audits: [] }` | line:34-37 |
| GET | `/scheduled-audits/:id` | — | `{ id, ... }` | line:39-42 |
| PATCH | `/scheduled-audits/:id/pause` | — | `{ paused: true }` | line:44-48 |
| PATCH | `/scheduled-audits/:id/resume` | — | `{ paused: false }` | line:50-54 |
| DELETE | `/scheduled-audits/:id` | — | 204 No Content | line:56-60 |

### Shared (public share viewer) (`/shared`) — Public
| Method | Path | DTO In | Response | File |
|---|---|---|---|---|
| GET | `/shared/audits/:token` | — | `GetReportResponse` | [shared.controller.ts:17-28](../../../apps/gateway/src/shared/controllers/shared.controller.ts#L17-L28) |

### Health (`/health`) — Public
| Method | Path | Response | File |
|---|---|---|---|
| GET | `/health` | `{ status, version, uptime, services: {...} }` | [health.controller.ts:29-50](../../../apps/gateway/src/health/controllers/health.controller.ts#L29-L50) |

---

# 8. Available gateway WS events

**Namespace:** `/ws` ([audit.gateway.ts:21-23](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L21-L23))

| Event Name | Direction | Payload Type | Payload Shape | Room | Source |
|---|---|---|---|---|---|
| `audit:subscribe` | Client→Server | `{ auditId: string }` | User requests to join room | `audit:<auditId>` (joined) | [audit.gateway.ts:61-70](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L61-L70) |
| `audit:unsubscribe` | Client→Server | `{ auditId: string }` | User requests to leave room | `audit:<auditId>` (left) | line:72-80 |
| `audit:progress` | Server→Client | `AuditProgressEvent` | `{ auditId, status, progress, stage, message? }` | `audit:<auditId>` | [progress-subscriber.service.ts:54](../../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts#L54) → `emitProgress()` line:83 |
| `audit:completed` | Server→Client | `ProgressPayload` | `{ auditId, finalScore?, ... }` | `audit:<auditId>` | [progress-subscriber.service.ts:68](../../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts#L68) → `emitCompleted()` line:87 |
| `audit:failed` | Server→Client | `ProgressPayload` | `{ auditId, error?, message? }` | `audit:<auditId>` | [progress-subscriber.service.ts:80](../../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts#L80) → `emitFailed()` line:91 |

**Authentication:** JWT in `handshake.auth.token` or `Authorization: Bearer <token>` header, verified at connection time ([audit.gateway.ts:40-55](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L40-L55)). Unauthenticated connections are immediately disconnected.

---

# 9. Available proto RPCs

**All proto files in `packages/proto/src/`; only gRPC service definitions.**

### common.v1 ([common.proto](../../../packages/proto/common/v1/common.proto))
**No service.** Shared enums and messages:
- `AuditStatus` enum (lines:4-12)
- `CheckStatus` enum (lines:14-19)
- `IssueCategory` enum (lines:21-29)
- `CoreWebVitals` message (lines:31-39)
- `ImageInfo` message (lines:41-46)
- `LinkInfo` message (lines:48-54)

### crawler.v1 ([crawler.proto](../../../packages/proto/crawler/v1/crawler.proto))
Service: `CrawlerService`

| RPC | Request | Response | Streaming |
|---|---|---|---|
| `CrawlUrl` | `CrawlRequest` | `CrawlResponse` | Unary |
| `HealthCheck` | `HealthCheckRequest` | `HealthCheckResponse` | Unary |

### analyzer.v1 ([analyzer.proto](../../../packages/proto/analyzer/v1/analyzer.proto))
Service: `SeoAnalyzerService`

| RPC | Request | Response | Streaming |
|---|---|---|---|
| `AnalyzePage` | `AnalyzeRequest` | `AnalyzeResponse` | Unary |
| `ListRules` | `ListRulesRequest` | `ListRulesResponse` | Unary |
| `UpdateRuleWeight` | `UpdateRuleWeightRequest` | `UpdateRuleWeightResponse` | Unary |
| `GetRulesByCategory` | `GetRulesByCategoryRequest` | `ListRulesResponse` | Unary |
| `HealthCheck` | `HealthCheckRequest` | `HealthCheckResponse` | Unary |

### keyword.v1 ([keyword.proto](../../../packages/proto/keyword/v1/keyword.proto))
Service: `KeywordAnalyzerService`

| RPC | Request | Response | Streaming |
|---|---|---|---|
| `AnalyzeKeywords` | `KeywordRequest` | `KeywordResponse` | Unary |
| `HealthCheck` | `HealthCheckRequest` | `HealthCheckResponse` | Unary |

### report.v1 ([report.proto](../../../packages/proto/report/v1/report.proto))
Service: `ReportService`

| RPC | Request | Response | Streaming |
|---|---|---|---|
| `GenerateReport` | `GenerateReportRequest` | `GenerateReportResponse` | Unary |
| `GetReport` | `GetReportRequest` | `GetReportResponse` | Unary |
| `CompareReports` | `CompareRequest` | `CompareResponse` | Unary |
| `CreateShareLink` | `CreateShareLinkRequest` | `CreateShareLinkResponse` | Unary |
| `GetSharedReport` | `GetSharedReportRequest` | `GetReportResponse` | Unary |
| `RevokeShareLink` | `RevokeShareLinkRequest` | `RevokeShareLinkResponse` | Unary |
| `GeneratePdf` | `GeneratePdfRequest` | `GeneratePdfResponse` | Unary |
| `HealthCheck` | `HealthCheckRequest` | `HealthCheckResponse` | Unary |

---

# 10. Naming conventions

**File naming:** kebab-case for all files

| Pattern | Examples |
|---|---|
| **Service/Controller/Guard** | `auth.service.ts`, `admin.controller.ts`, `jwt-auth.guard.ts` |
| **DTO** | `register.dto.ts`, `login.dto.ts`, `update-rules.dto.ts`, `list-users.query.ts` |
| **Module** | `auth.module.ts`, `admin.module.ts`, `websocket.module.ts` |
| **gRPC Client** | `crawler.client.ts`, `analyzer.client.ts`, `report.client.ts` |
| **Component** | `button.tsx`, `card.tsx`, `code.tsx` |

**Test files:** `.spec.ts` for unit, `.e2e-spec.ts` for integration ([apps/gateway/test/](../../../apps/gateway/test)).

**Folder grouping:** Feature-first (by domain: `auth/`, `audits/`, `users/`, `admin/`, `scheduled-audits/`, `shared/`, `health/`), then type-second within each feature:

```
<feature>/
  ├── <feature>.module.ts
  ├── controllers/
  ├── services/
  ├── dto/
  ├── guards/      # auth-specific
  └── strategies/  # auth-specific
```

**Barrel exports:** No universal `index.ts` barrel files. Each feature/package exports selectively via direct imports (`@repo/shared` has single `src/index.ts`; `@repo/ui` uses `package.json#exports`).

**Enum/Type naming:**
- Enums: PascalCase + descriptive (`AuditStatus`, `CheckStatus`, `UserRole`)
- DTO classes: PascalCase + `Dto` suffix
- Query/Param classes: PascalCase + `Query` suffix
- Interfaces: PascalCase, optional `I` prefix (`AuthenticatedUser`, `JwtPayload`)
