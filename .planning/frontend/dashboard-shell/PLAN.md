---
phase: 3
feature_slug: dashboard-shell
tier: large
impact: layout-shell
status: approved
---

# Phase 3 — Implementation Plan

9 waves, ~30 files. Leaves → containers → pages. Same-wave files are
dependency-independent; later waves consume earlier outputs only.

## Wave 1 — Foundation (constants, types, keys, utils)

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 1 | `apps/web/package.json` (modify) | Add `recharts`, `dayjs` (+ `dayjs/plugin/relativeTime`) if missing | — | +3 |
| 2 | `apps/web/src/lib/api/types.ts` (modify) | Add `AuditListItem` interface per ONBOARD §7 (`seoScore`, not `score`) | — | +15 |
| 3 | `apps/web/src/lib/queries/keys.ts` (modify) | Extend with `queryKeys.audits.{all,list,recent,detail}` | — | +10 |
| 4 | `apps/web/src/lib/constants.ts` (modify) | Add `SIDEBAR_NAV`, `PAGE_TITLE_MAP`, `STORAGE_KEYS.sidebarCollapsed` | — | +45 |
| 5 | `apps/web/src/lib/utils/classify.ts` (NEW) | `scoreClassName(score)` → `text-excellent\|good\|fair\|poor` | `@repo/shared classify` | 20 |
| 6 | `apps/web/src/lib/utils/format.ts` (modify) | Add `formatRelativeTime(iso, now?)` (dayjs vi locale) | dayjs | +25 |

**Tests Wave 1**:
- `tests/unit/format.test.ts` — relative time cases (now, 1h ago, 2d ago, 30d ago).
- `tests/unit/classify.test.ts` — 4 threshold boundaries + null case.

## Wave 2 — API wrapper + pure utils

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 7 | `apps/web/src/lib/api/audits.ts` (NEW) | `listAudits(params)` → `Paginated<AuditListItem>` | Wave 1 (types, client) | 40 |
| 8 | `apps/web/src/lib/dashboard/aggregates.ts` (NEW) | `computeStats(audits, now)` — audits-this-month, avg seoScore, deltas | Wave 1 (types) | 80 |
| 9 | `apps/web/src/lib/dashboard/chart-data.ts` (NEW) | `buildTrendSeries(audits)` → `[{label, score, url}]` sorted + bucketed | Wave 1 (types) + dayjs | 50 |

**Tests Wave 2**:
- `tests/unit/dashboard-aggregates.test.ts` — 5 cases (empty, this-month-only, both-months, completed-vs-pending, null scores).
- `tests/unit/dashboard-chart-data.test.ts` — 3 cases (empty → placeholder, <2 audits → empty series, 5 audits → sorted).

## Wave 3 — Query hook

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 10 | `apps/web/src/lib/queries/use-audits.ts` (NEW) | `useRecentAudits(opts)` — TanStack useQuery | Wave 1-2 | 30 |

**Tests Wave 3**: deferred — covered by page-level MSW integration in Phase 5 harness debt-pay.

## Wave 4 — Common atoms (all 3 can land in parallel via subagents)

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 11 | `apps/web/src/components/common/empty-state.tsx` (NEW) | Generic empty: icon + title + body + CTA slot | `@/components/ui/*` | 40 |
| 12 | `apps/web/src/components/common/score-badge.tsx` (NEW) | `<ScoreBadge score={…} />` — classification-colored chip | `@/components/ui/badge`, classify util | 35 |
| 13 | `apps/web/src/components/common/status-badge.tsx` (NEW) | `<StatusBadge status={…} />` — audit status chip | `@/components/ui/badge`, `AuditStatus` | 45 |

**Tests Wave 4**: RTL smoke per component (render + props branches) — 3 files.

## Wave 5 — Layout leaves (parallelizable)

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 14 | `apps/web/src/components/layout/wordmark.tsx` (NEW) | Brand text block (title + tagline) | `APP_NAME`, `APP_TAGLINE`, `cn` | 30 |
| 15 | `apps/web/src/components/layout/sidebar-link.tsx` (NEW) | Nav item with active-state (pathname prefix match) | lucide-react, `usePathname`, `cn` | 55 |
| 16 | `apps/web/src/components/layout/user-menu-card.tsx` (NEW) | Avatar + name + dropdown (Profile/Security/Logout) | `@/components/ui/dropdown-menu`, `useAuth`, `useLogout` | 80 |

**Tests Wave 5**: RTL per component — active-state logic in sidebar-link, logout flow in user-menu-card.

## Wave 6 — Layout containers

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 17 | `apps/web/src/components/layout/sidebar.tsx` (NEW) | Fixed dark sidebar (desktop ≥ lg) | Wave 5, `SIDEBAR_NAV`, `useAuth` | 60 |
| 18 | `apps/web/src/components/layout/mobile-nav.tsx` (NEW) | Hamburger + Radix Dialog drawer (< lg) | Wave 5, `@/components/ui/dialog` | 85 |
| 19 | `apps/web/src/components/layout/header.tsx` (NEW) | Sticky top bar (title map + actions) | `PAGE_TITLE_MAP`, `usePathname`, `ROUTES.auditsNew`, `@/components/ui/button`, lucide | 85 |
| 20 | `apps/web/src/components/layout/dashboard-shell.tsx` (NEW) | Compose Sidebar + MobileNav + Header + `<main>{children}</main>` | Wave 5-6 | 45 |

**Tests Wave 6**: 4 RTL files — sidebar nav rendering + role filter; mobile-nav open/close; header title map; shell layout structure.

## Wave 7 — Dashboard widget leaves (parallelizable)

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 21 | `apps/web/src/components/dashboard/stat-card.tsx` (NEW) | Single stat card (icon/label/value/delta) | `@/components/ui/card`, `cn`, lucide | 85 |
| 22 | `apps/web/src/components/dashboard/audit-row.tsx` (NEW) | Row inside RecentAuditsCard | Wave 4 (score-badge, status-badge), format util | 60 |
| 23 | `apps/web/src/components/dashboard/score-gauge-hero.tsx` (NEW) | Big circular SVG + delta badge + score text | classify util, `@/components/ui/card`, lucide | 110 |
| 24 | `apps/web/src/components/dashboard/dashboard-empty.tsx` (NEW) | Empty state full-card with illustration | Wave 4 (empty-state), `@/components/ui/button`, `ROUTES` | 65 |

**Tests Wave 7**: 4 RTL files — stat-card prop branches; audit-row composition; gauge null-score + classification color; dashboard-empty CTA link.

## Wave 8 — Dashboard composites

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 25 | `apps/web/src/components/dashboard/stats-grid.tsx` (NEW) | 4 StatCards in 2×2 grid, computed from hook | Wave 7 (stat-card), aggregates util | 95 |
| 26 | `apps/web/src/components/dashboard/recent-audits-card.tsx` (NEW) | Top-5 list + "Xem tất cả" | Wave 7 (audit-row), Wave 4 (empty-state), `@/components/ui/card`, `ROUTES` | 80 |
| 27 | `apps/web/src/components/dashboard/score-trend-chart.tsx` (NEW) | Recharts LineChart 30d | recharts, Wave 2 (chart-data), `@/components/ui/card` | 110 |

**Tests Wave 8**: 3 RTL files — stats-grid with mocked audits (empty/5/30); recent-audits-card empty vs populated; score-trend-chart series length + axis.

## Wave 9 — Pages

| # | File | Purpose | Deps | LOC |
|---|---|---|---|---|
| 28 | `apps/web/src/app/(app)/layout.tsx` (NEW) | RSC wrapper: `<AuthGuard><DashboardShell>{children}</DashboardShell></AuthGuard>` | Wave 6, `@/lib/auth/guard` | 20 |
| 29 | `apps/web/src/app/(app)/dashboard/page.tsx` (NEW) | Widget composition, consumes `useRecentAudits` | Wave 3, Wave 7-8 | 120 |
| 30 | `apps/web/src/app/(app)/dashboard/loading.tsx` (NEW) | Shell-level skeleton (bento grid of skeletons) | `@/components/ui/skeleton` | 55 |

**Tests Wave 9**: 1 RTL page test (smoke with MSW — 0-audit vs 5-audit path) + 1 Playwright e2e (login → /dashboard render) — both paid in Phase 5 harness debt-pay.

## Integration checklist (Phase 4 finalization)

- [ ] Env vars: no new envs required (reuses `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`).
- [ ] TanStack query keys: `queryKeys.audits.recent(opts)` added and invalidation hooks correct.
- [ ] Routes: `ROUTES.dashboard` + `ROUTES.auditsNew` already present (slug 1); no additions.
- [ ] i18n: all strings Vietnamese; pages-level strings live in `<Header>`/`<Sidebar>`/widgets inline — no resource file needed.
- [ ] Bundle audit: `npm run build` after Wave 9 — verify `/dashboard` First Load JS < 200 KB.
- [ ] Build stays green per wave — no deferred type errors.
- [ ] `docs/design/31-page-specs.md §8` cross-refs validated (stat names match).

## Estimated totals

- **New files**: 24
- **Modified files**: 6
- **Total LOC**: ~1650 new + ~100 modified = ~1750 LOC (under the 2200 budget).
- **Test files planned**: 17 RTL/vitest during Phase 4 + 1 Playwright + harness debt-pay in Phase 5.

## Wave execution strategy (Large tier)

- **Waves 1, 3, 9** — sequential (single file or tight coupling).
- **Waves 2, 4, 5, 6, 7, 8** — parallelizable within wave (use `superpowers:test-driven-development` per file via sub-agents when needed; for this slug, sequential inside a wave is acceptable — total file count fits in ~12 commits without orchestration complexity).

**Commit cadence**: 1 commit per file via TDD (RED → GREEN → refactor → commit) following skill rule. Target messages:
`feat(web): dashboard-shell/<wave>-<basename> — <one-liner>`.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Recharts SSR issues | Mark `page.tsx` `'use client'` (required anyway for hooks); `<ResponsiveContainer>` runs in browser only — no issue |
| Bundle budget breach | Monitor `/dashboard` after Wave 9; if > 200 KB, gate `<ScoreTrendChart>` behind `dynamic()` import |
| Gateway `seoScore` field naming change | MAPPING.md + Wave 1 type definition aligned; if backend renames, single type file to update |
| Sidebar/Header state leakage across route transitions | Use `usePathname()` derived state; no module-level mutable state |
| `(app)` route group collision with `(auth)` | Confirmed distinct groups; Next.js allows multiple groups side-by-side |
| Dark-mode tokens already shipped but not toggled | Widgets use token classes only — forward-compatible |

## Ready for Phase 4

All inputs mapped, ordered, deps clean. Execute wave-by-wave in Phase 4 with
atomic commits + BUILD-LOG updates.
