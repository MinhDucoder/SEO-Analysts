---
phase: 2
feature_slug: web-bootstrap
tier: large
impact: scaffold-only
status: approved
date: 2026-04-18
---

# Phase 2 — Feature-to-Code Mapping

## Pages to create / modify

| Page | Path | Status | Notes |
|---|---|---|---|
| Placeholder landing | [apps/web/src/app/page.tsx](../../../apps/web/src/app/page.tsx) | NEW (root layout + page) | Renders Manrope wordmark "SEO Analyst" + "Đang xây dựng" subtitle. Real landing arrives in slug 9 `public-pages`. |
| Root layout | [apps/web/src/app/layout.tsx](../../../apps/web/src/app/layout.tsx) | NEW | `<html lang="vi">`, fonts (Manrope+Inter via next/font), metadata, wrap providers. Reused by every future slug. |
| Providers wrapper | [apps/web/src/app/providers.tsx](../../../apps/web/src/app/providers.tsx) | NEW (`'use client'`) | QueryClientProvider (staleTime 60s) + Sonner Toaster. |
| Global error boundary | [apps/web/src/app/error.tsx](../../../apps/web/src/app/error.tsx) | NEW (`'use client'`) | Generic error UI + reset button. |

(All other 17 pages from [docs/design/31-page-specs.md](../../../docs/design/31-page-specs.md) are deferred to slugs 2-9.)

## Components to create / reuse

### CREATE — shadcn primitives in `apps/web/src/components/ui/`

| Component | File | Reused from | Notes |
|---|---|---|---|
| Button | `button.tsx` | shadcn (copy) | CVA variants: primary, secondary, ghost, destructive, outline; sizes sm/md/lg/icon. Aligns with [32-design-system.md §7.1](../../../docs/design/32-design-system.md). |
| Input | `input.tsx` | shadcn (copy) | forwardRef; left/right icon slot; error state border. [32 §7.2](../../../docs/design/32-design-system.md). |
| Label | `label.tsx` | shadcn (copy + Radix) | Radix Label primitive. |
| Card | `card.tsx` | shadcn (copy) | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter; variants default/elevated/outline/dark/hero. [32 §7.3](../../../docs/design/32-design-system.md). |
| Badge | `badge.tsx` | shadcn (copy) | CVA variants: primary, success, warning, error, neutral; sizes sm/md/lg. [32 §7.4](../../../docs/design/32-design-system.md). |
| Dialog | `dialog.tsx` | shadcn (copy + Radix) | Radix Dialog wrapped. [32 §7.6](../../../docs/design/32-design-system.md). |
| DropdownMenu | `dropdown-menu.tsx` | shadcn (copy + Radix) | Radix DropdownMenu wrapped. |
| Separator | `separator.tsx` | shadcn (copy + Radix) | Radix Separator. |
| Skeleton | `skeleton.tsx` | shadcn (copy) | bg-muted animate-pulse rounded. |
| Tabs | `tabs.tsx` | shadcn (copy + Radix) | Radix Tabs. |
| Sonner Toaster | `sonner.tsx` | sonner lib wrapper | Theme-aware Toaster wrapper. [32 §7.7](../../../docs/design/32-design-system.md). |

### REUSE — existing in monorepo

| Module | Path | Notes |
|---|---|---|
| `@repo/shared` | [packages/shared/src/index.ts](../../../packages/shared/src/index.ts) | Re-export `JWT_CONFIG`, `RATE_LIMIT`, `AuditStatus`, `AuditProgressEvent`, `CoreWebVitals` from FE `lib/api/types.ts`. |
| `@repo/typescript-config/nextjs.json` | [packages/typescript-config/nextjs.json](../../../packages/typescript-config/nextjs.json) | Extend in `apps/web/tsconfig.json`. |
| `@repo/eslint-config/*` | [packages/eslint-config/](../../../packages/eslint-config/) | Extend in `apps/web/.eslintrc.cjs`. |

### NOT REUSED (intentional)

| Module | Reason |
|---|---|
| `@repo/ui` ([packages/ui/src/](../../../packages/ui/src/)) | Existing 3 components (Button/Card/Code) are minimal turborepo template; web uses local shadcn primitives at `apps/web/src/components/ui/` to avoid disturbing other future apps and to align with [32 §7](../../../docs/design/32-design-system.md). May refactor to `@repo/ui` in future if a 2nd FE app appears. |

## API endpoints

**This slug consumes ZERO API endpoints.** It only ships **stub HTTP client** (`src/lib/api/client.ts`) ready for slug 2 to wire with real endpoints. Verification table below confirms gateway has every endpoint future slugs will need:

| Endpoint | Status | Will be used by slug |
|---|---|---|
| POST `/auth/register`, `/login`, `/refresh`, `/logout`, `/me`, `/verify-email`, `/forgot-password`, `/reset-password`, GET `/auth/google`, `/auth/google/callback` | EXISTS ([auth.controller.ts](../../../apps/gateway/src/auth/controllers/auth.controller.ts)) | slug 2 `auth-flow` |
| POST `/audits`, GET `/audits`, GET `/audits/:id`, GET `/audits/:id/status`, DELETE `/audits/:id`, GET `/audits/:id/export`, POST `/audits/:id/share`, DELETE `/audits/:id/share` | EXISTS ([audits.controller.ts](../../../apps/gateway/src/audits/controllers/audits.controller.ts)) | slugs 4, 5 |
| GET `/audits/compare` | EXISTS | slug 6 `audits-compare` |
| PATCH `/users/profile`, PATCH `/users/password` | EXISTS ([users.controller.ts](../../../apps/gateway/src/users/controllers/users.controller.ts)) | slug 8 `settings-pages` |
| GET `/admin/users`, PATCH `/admin/users/:id`, GET `/admin/rules`, PUT `/admin/rules`, GET `/admin/stats` | EXISTS ([admin.controller.ts](../../../apps/gateway/src/admin/controllers/admin.controller.ts)) | slug 7 `admin-panel` |
| POST/GET/PATCH/DELETE `/scheduled-audits/*` | EXISTS ([scheduled-audits.controller.ts](../../../apps/gateway/src/scheduled-audits/controllers/scheduled-audits.controller.ts)) | (deferred — not in MVP scope) |
| GET `/shared/audits/:token` | EXISTS ([shared.controller.ts](../../../apps/gateway/src/shared/controllers/shared.controller.ts)) | slug 9 `public-pages` |
| GET `/health` | EXISTS ([health.controller.ts](../../../apps/gateway/src/health/controllers/health.controller.ts)) | (optional — slug 7 admin stats) |

→ **NO MISSING backend endpoint.** No backend work blocks `web-bootstrap`.

## WebSocket events

**This slug consumes ZERO WS events.** Only ships **stub `getSocket()` singleton** (`src/lib/ws/client.ts`) ready for slug 5 to wire `useAuditRealtime`. All required events confirmed:

| Event | Direction | Status | Will be used by slug |
|---|---|---|---|
| `audit:subscribe` | C→S | EXISTS ([audit.gateway.ts:61-70](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L61-L70)) | slug 5 |
| `audit:unsubscribe` | C→S | EXISTS ([audit.gateway.ts:72-80](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L72-L80)) | slug 5 |
| `audit:progress` | S→C | EXISTS ([audit.gateway.ts:83](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L83)) | slug 5 |
| `audit:completed` | S→C | EXISTS ([audit.gateway.ts:87](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L87)) | slugs 3, 4, 5 (global toast in slug 3) |
| `audit:failed` | S→C | EXISTS ([audit.gateway.ts:91](../../../apps/gateway/src/infra/websocket/audit.gateway.ts#L91)) | slug 5 |

→ **NO MISSING WS event.**

## Proto impact

**none** — `web-bootstrap` does not touch `packages/proto/src/**` and does not introduce new RPC consumers. Future slugs (5 audits-detail) consume `report.v1.GetReport` indirectly via gateway HTTP `/audits/:id`, but no proto changes are required for that.

## Tier escalation decision

| Trigger | Match? | Decision |
|---|---|---|
| Phase 2 finds `MISSING` API/WS | ❌ | — |
| Phase 2 finds `new-rpc-needed` | ❌ | — |
| Phase 2 touches authentication or multi-tenant boundary | ⚠️ partial — only stub auth STORE shape, no real auth wiring | Stays Large (already Large from Phase 0). |

→ **Tier remains: large**
→ **Impact remains: scaffold-only**
→ **No HALT triggered.** Proceed to Phase 3 (Implementation Plan).
