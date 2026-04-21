---
phase: 4
feature_slug: dashboard-shell
tier: large
impact: layout-shell
status: complete
date: 2026-04-19
---

# Phase 4 — Build Log

## Wave progress

| Wave | Scope | Files | Commit | Status |
|---|---|---|---|---|
| 1 | Foundation (types, keys, constants, classify util, recharts install) | 6 | **5118434** | ✅ |
| 2 | API wrapper + dashboard utils (listAudits, computeStats, buildTrendSeries) | 3 + 2 tests | **(next of 5118434)** | ✅ |
| 3 | Query hook (useRecentAudits) | 1 | **a45080d** | ✅ |
| 4 | Common atoms (empty-state, score-badge, status-badge) | 3 + 3 tests | **(next of a45080d)** | ✅ |
| 5 | Layout leaves (wordmark, sidebar-link, user-menu-card) | 3 + 2 tests | (next of Wave 4) | ✅ |
| 6 | Layout containers (sidebar, mobile-nav, header, dashboard-shell) | 4 + 3 tests | (next of Wave 5) | ✅ |
| 7 | Dashboard leaves (stat-card, audit-row, gauge-hero, dashboard-empty) | 4 + 4 tests | (next of Wave 6) | ✅ |
| 8 | Dashboard composites (stats-grid, recent-audits-card, score-trend-chart) | 3 + 3 tests | (next of Wave 7) | ✅ |
| 9 | Pages (app layout, dashboard page, loading) | 3 | (next of Wave 8) | ✅ |

Exact commit hashes are recorded in git history under `feat(web):
dashboard-shell/wave-N` subject prefixes.

## TDD discipline

Per file: hermetic pure-util files → test + impl in same commit (ran
vitest between Write steps). Component files → test + impl in same
commit; full vitest run verified green before each commit. Page-level
RTL smoke + Playwright e2e deferred to Phase 5 harness debt-pay
(precedent: slug 2 Wave 8).

## Deviations from PLAN.md

| Planned | Actual | Reason |
|---|---|---|
| Wave 1 format.ts add `formatRelativeTime` | **Skipped** | `formatRelativeDate` already shipped in slug 1; reused. |
| Wave 9 page-level RTL smoke | **Deferred to Phase 5 harness debt-pay** | Mirrors slug 2 precedent — page tests need MSW handler additions + render helper mocks that belong to the harness skill, not scaffolding. |
| Bundle budget 200 kB | **Actual 232 kB** (+16%) | Recharts + useQuery initial hydrator weight. Acceptable — flagged in commit message; future mitigation = dynamic import `<ScoreTrendChart>`. |
| Wave 2 test timezone | **Fix: explicit +07:00 offsets** | Initial test used `Z` UTC, but dayjs formats in local TZ → day-boundary drift. Fix scoped to test data. |
| Wave 5 `parts[0][0]` strict-mode check | **Fix: `?.` optional chain** | TS strict flags `parts[0]` as possibly undefined even after length check. |
| Wave 8 Recharts + jsdom | **Stub ResizeObserver in tests/setup.ts** | jsdom doesn't implement the API; Recharts ResponsiveContainer depends on it. Stub has no effect in browser (Playwright) which has native impl. |

## Files summary

**New files (24)**:

- `apps/web/src/lib/utils/classify.ts` (Wave 1)
- `apps/web/src/lib/api/audits.ts` (Wave 2)
- `apps/web/src/lib/dashboard/{aggregates,chart-data}.ts` (Wave 2)
- `apps/web/src/lib/queries/use-audits.ts` (Wave 3)
- `apps/web/src/components/common/{empty-state,score-badge,status-badge}.tsx` (Wave 4)
- `apps/web/src/components/layout/{wordmark,sidebar-link,user-menu-card,sidebar,mobile-nav,header,dashboard-shell}.tsx` (Wave 5-6)
- `apps/web/src/components/dashboard/{stat-card,audit-row,score-gauge-hero,dashboard-empty,stats-grid,recent-audits-card,score-trend-chart}.tsx` (Wave 7-8)
- `apps/web/src/app/(app)/layout.tsx` (Wave 9)
- `apps/web/src/app/(app)/dashboard/{page,loading}.tsx` (Wave 9)

**Modified files (5)**:

- `apps/web/package.json` + root `package-lock.json` (recharts dep)
- `apps/web/src/lib/api/types.ts` (AuditListItem)
- `apps/web/src/lib/queries/keys.ts` (queryKeys.audits)
- `apps/web/src/lib/constants.ts` (SIDEBAR_NAV, PAGE_TITLE_MAP, STORAGE_KEYS)
- `apps/web/tests/setup.ts` (ResizeObserver stub)

**Test files added (17)**:

- `tests/unit/classify.test.ts`
- `tests/unit/dashboard-aggregates.test.ts`, `tests/unit/dashboard-chart-data.test.ts`
- `tests/unit/common/{empty-state,score-badge,status-badge}.test.tsx`
- `tests/unit/layout/{sidebar-link,user-menu-card,sidebar,mobile-nav,header}.test.tsx`
- `tests/unit/dashboard/{stat-card,audit-row,score-gauge-hero,dashboard-empty,stats-grid,recent-audits-card,score-trend-chart}.test.tsx`

## End-of-phase totals

- Total commits Phase 4: 9 wave commits + 1 BUILD-LOG commit.
- Tests: 83 (pre-slug-3) → **151 vitest** (+68 new cases).
- Gates green after each wave: tsc 0, vitest 100%.
- Bundle `/dashboard`: 232 kB First Load (shared 87.5 kB unchanged).

Phases 0-5 closed. See [REVIEW.md](./REVIEW.md) for gate matrix.

## Harness debt paid (fe-test-harness skill, debt-pay mode)

Post-Phase-5 the `fe-test-harness` skill ran in `debt-pay mode` to cover
page-level + e2e items deferred from Wave 9:

| Item | Files | Tests |
|---|---|---|
| MSW default `GET /audits` handler + `sampleAudits` + `sampleAuditsEmpty` fixtures | `tests/msw/handlers.ts` (modify) | reusable by slug 4 |
| Dashboard page RTL smoke (3 cases: empty, populated, 500+retry) | `tests/unit/dashboard/dashboard-page.test.tsx` | +3 |
| Playwright dashboard e2e (login mock → /dashboard render + sidebar link assertions) | `tests/e2e/dashboard.spec.ts` | +2 |
| E2E helper `stubDashboardRoutes(page)` (auth + audits mocks) | `tests/e2e/helpers/dashboard.ts` | — |

Totals after debt paid: **154 vitest** (+3) + **11 Playwright** (+2). tsc
0, eslint 0, all green.

Harness reusable by next slugs:
- Slug 4 `audits-list-create`: extend `auditsHandlers` or `server.use(...)`
  for filter/search permutations + 201/POST handlers.
- Slug 5 `audits-detail-realtime`: add `/audits/:id`, `/audits/:id/status`
  handlers + WebSocket fixture support.
- Slug 7 `admin-panel`: add `/admin/users`, `/admin/rules`, `/admin/stats`
  handlers + AdminGuard-exercising e2e.
