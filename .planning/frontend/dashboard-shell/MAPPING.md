---
phase: 2
feature_slug: dashboard-shell
tier: large
impact: layout-shell
status: approved
---

# Phase 2 — Feature-to-Code Mapping

## Summary

All required backend surface **EXISTS**. Zero MISSING endpoints, zero proto
changes, zero WS consumption. Tier stays **Large**; no escalation.

## Pages

| Route | Path (new file) | Type | Purpose | Source user story |
|---|---|---|---|---|
| `(app)` layout | `apps/web/src/app/(app)/layout.tsx` | RSC wrapper → client shell | Wrap every authenticated route with AuthGuard + DashboardShell (sidebar + header + main) | All (baseline scaffold) |
| `/dashboard` | `apps/web/src/app/(app)/dashboard/page.tsx` | Client | Dashboard widgets composition | "Landing sau login", "Real stats khi có audits", "Empty state" |
| `/dashboard` loading | `apps/web/src/app/(app)/dashboard/loading.tsx` | RSC | Shell-level skeleton while page mounts | "loading" state per AC |

**No modifications to existing `(auth)` pages** — dashboard shell is additive.

## Components

### New — layout primitives

| Component | Path | Type | Reuses |
|---|---|---|---|
| `<DashboardShell>` | `apps/web/src/components/layout/dashboard-shell.tsx` | client | `<Sidebar>, <Header>, <MobileNav>`, `useAuth` (slug 2) |
| `<Sidebar>` | `apps/web/src/components/layout/sidebar.tsx` | client | `<SidebarLink>, <Wordmark>, <UserMenuCard>`, `SIDEBAR_NAV` const |
| `<SidebarLink>` | `apps/web/src/components/layout/sidebar-link.tsx` | client | lucide-react icon, `next/navigation usePathname` |
| `<MobileNav>` | `apps/web/src/components/layout/mobile-nav.tsx` | client | `@/components/ui/dialog` (Radix), same nav list |
| `<Header>` | `apps/web/src/components/layout/header.tsx` | client | `@/components/ui/button`, lucide icons, `PAGE_TITLE_MAP` |
| `<UserMenuCard>` | `apps/web/src/components/layout/user-menu-card.tsx` | client | `@/components/ui/dropdown-menu`, `useAuth`, `useLogout` (slug 2) |
| `<Wordmark>` | `apps/web/src/components/layout/wordmark.tsx` | RSC-safe | `APP_NAME`, `APP_TAGLINE` constants |
| `SIDEBAR_NAV` const | `apps/web/src/lib/constants.ts` (modified) | - | `ROUTES` (slug 1) |
| `PAGE_TITLE_MAP` const | `apps/web/src/lib/constants.ts` (modified) | - | - |

### New — dashboard widgets

| Component | Path | Type | Purpose |
|---|---|---|---|
| `<ScoreGaugeHero>` | `apps/web/src/components/dashboard/score-gauge-hero.tsx` | client | Big circular SVG 0-100 + delta badge |
| `<StatCard>` | `apps/web/src/components/dashboard/stat-card.tsx` | client | Single metric card (icon/label/value/delta) |
| `<StatsGrid>` | `apps/web/src/components/dashboard/stats-grid.tsx` | client | 2×2 grid of 4 StatCards, computed from hook |
| `<RecentAuditsCard>` | `apps/web/src/components/dashboard/recent-audits-card.tsx` | client | Top-5 audit list + footer "Xem tất cả" |
| `<AuditRow>` | `apps/web/src/components/dashboard/audit-row.tsx` | client | Single row (URL/domain/score badge/status/fromNow) |
| `<ScoreTrendChart>` | `apps/web/src/components/dashboard/score-trend-chart.tsx` | client | Recharts LineChart 30d |
| `<DashboardEmpty>` | `apps/web/src/components/dashboard/dashboard-empty.tsx` | client | Empty state (0 audits) |

### New — common utilities

| Component | Path | Reuse elsewhere |
|---|---|---|
| `<ScoreBadge>` | `apps/web/src/components/common/score-badge.tsx` | Slug 4 (list row) + slug 5 (detail) |
| `<StatusBadge>` | `apps/web/src/components/common/status-badge.tsx` | Slug 4 (list row) + slug 5 (timeline) |
| `<EmptyState>` | `apps/web/src/components/common/empty-state.tsx` | Generic: icon + title + body + CTA slot |

### Reused (no changes)

- `@/components/ui/{button,card,dialog,dropdown-menu,skeleton,badge}.tsx` (slug 1).
- `@/components/auth/auth-bootstrap.tsx` (slug 2, already wired in providers).
- `@/lib/auth/guard.tsx` → `<AuthGuard>` (slug 2).
- `@/lib/auth/hooks.ts` → `useAuth, useLogout, useAuthBootstrap, useMeQuery` (slug 2).
- `@/lib/auth/store.ts` → `useAuthStore` (slug 2).
- `@/lib/utils/cn.ts` → `cn()` class merger (slug 1).

## API endpoints

| Method | Endpoint | Status | Location | Notes |
|---|---|---|---|---|
| GET | `/audits?limit=30` | **EXISTS** | [apps/gateway/src/audits/controllers/audits.controller.ts:48](../../../apps/gateway/src/audits/controllers/audits.controller.ts#L48) | Slug 3 uses `limit`; slug 4 will add full filter set |
| POST | `/auth/logout` | EXISTS (slug 2) | [apps/gateway/src/auth/controllers/auth.controller.ts](../../../apps/gateway/src/auth/controllers/auth.controller.ts) | Consumed by `<UserMenuCard>` via `useLogout` |
| GET | `/auth/me` | EXISTS (slug 2) | same | Consumed by `useMeQuery` inside `<UserMenuCard>` + `<Header>` |
| POST | `/auth/refresh` | EXISTS (slug 2) | same | Auto-invoked by ky interceptor on 401 |

**Critical shape correction** (from ONBOARD §7): Gateway `GET /audits` returns `seoScore` (not `score`). Update `AuditListItem` interface accordingly:

```ts
// apps/web/src/lib/api/types.ts (modified)
export interface AuditListItem {
  id: string;
  url: string;
  domain: string;
  status: AuditStatus;
  seoScore: number | null;
  targetKeyword: string | null;
  crawlerType: string | null;
  crawlDurationMs: number | null;
  createdAt: string;      // ISO string from JSON
  completedAt: string | null;
}

export interface Paginated<T> { /* unchanged slug 2 */ }
```

No MISSING endpoints.

## WebSocket events

**None consumed in slug 3.** All existing infra (`@/lib/ws/client.ts`) stays
dormant; slug 5 will wire `audit:progress/completed/failed`.

## Proto impact

**None.** Slug 3 doesn't call gRPC; gateway handles all HTTP→gRPC translation.

## New dependencies

| Package | Version | Reason | Bundle impact |
|---|---|---|---|
| `recharts` | `^2.x` | Score trend line chart | ~80 KB gzipped (acceptable: `/dashboard` budget 200 KB) |

Sanctioned by [30-frontend-architecture.md §1](../../../docs/design/30-frontend-architecture.md) — "Charts: Recharts hoặc Tremor". Auto-decide pick = Recharts per smaller bundle.

## New query hooks

| Hook | Key | TTL | Path (new file) |
|---|---|---|---|
| `useRecentAudits({ limit?, dateFrom? })` | `queryKeys.audits.recent(opts)` | 60s (default) | `apps/web/src/lib/queries/use-audits.ts` |

Extend `queryKeys` in `apps/web/src/lib/queries/keys.ts`:

```ts
export const queryKeys = {
  auth: { me: ["auth", "me"] as const },
  audits: {
    all: () => ["audits"] as const,
    list: (filters: object) => ["audits", "list", filters] as const,
    recent: (opts: { limit?: number; dateFrom?: string }) => ["audits", "recent", opts] as const,
    detail: (id: string) => ["audits", "detail", id] as const,
  },
} as const;
```

## New pure-util files

| File | Purpose |
|---|---|
| `apps/web/src/lib/dashboard/aggregates.ts` | `computeStats(audits, now)` → stats object |
| `apps/web/src/lib/dashboard/chart-data.ts` | `buildTrendSeries(audits)` → recharts-ready `[{label,score,url}]` |
| `apps/web/src/lib/utils/format.ts` (modified) | Add `formatRelativeTime(iso, now?)` using dayjs vi locale |
| `apps/web/src/lib/utils/classify.ts` | Re-export `classify` from `@repo/shared` + map to token class names (`excellent/good/fair/poor`) |

## Files modified (not new)

| File | Change |
|---|---|
| `apps/web/src/lib/constants.ts` | Add `SIDEBAR_NAV`, `PAGE_TITLE_MAP` constants; existing `ROUTES` + `APP_NAME` unchanged |
| `apps/web/src/lib/api/types.ts` | Add `AuditListItem` interface |
| `apps/web/src/lib/queries/keys.ts` | Extend with `audits.*` keys |
| `apps/web/src/lib/auth/mutations.ts` | (none expected — logout already takes extras) |
| `apps/web/package.json` | Add `recharts` + `dayjs` + `dayjs/plugin/relativeTime` if not already present |

## Tier escalation decision

Starting tier: **Large**. No escalation needed.

Reasons no escalation:
- No MISSING backend endpoints.
- No proto additions (impact stays `layout-shell` not `proto-breaking`).
- No new auth flow (reuses slug 2 hooks + guards).
- No admin-role expansion beyond render-time filtering.

Slug remains Large → full gate suite required in Phase 5:
- type-check, lint, test, /review, /design-review (new visual UI), /qa (Large interactive).
- Skip /cso (no secrets/PII added — reuses auth infra already audited).
- Skip Gate 3c fe-be-integration (dashboard-shell doesn't touch auth/session/OAuth/rate-limit surface — only read-only list; Gate 3c reserved for auth/session slugs).

## Ready for Phase 3

All inputs resolved. Phase 3 will order the 25+ new files into dependency waves.
