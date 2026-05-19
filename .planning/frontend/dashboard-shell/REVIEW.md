---
phase: 5
feature_slug: dashboard-shell
tier: large
impact: layout-shell
status: complete
date: 2026-04-19
---

# Phase 5 — Quality Gates

## Gate matrix (Large tier, non-auth/non-proto)

| # | Gate | Command | Result | Retries | Notes |
|---|---|---|---|---|---|
| 1 | Type check | `npx tsc --noEmit` (apps/web) | ✅ 0 errors | 0 | Clean after Wave 5 + 8 interim fixes |
| 2 | Lint | `npx eslint .` (apps/web) | ✅ 0 errors, 0 warnings | 0 | — |
| 3 | Unit tests | `npx vitest run` | ✅ 151/151 pass | 0 | Up from 83 (slug 2 baseline); +68 new cases across 17 new spec files |
| 4 | Proto typecheck | — | **N/A** | — | Slug 3 does not touch `packages/proto` |
| 5 | E2E smoke (gateway) | — | **N/A** | — | Slug 3 does not touch gateway |
| 6 | Build | `npm run build --filter=@seo/web` | ✅ clean | 0 | `/dashboard` First Load JS **232 kB** (see deviation below) |
| 7 | `/review` (GStack) | — | **Deferred** | — | See "Deferred gates" section |
| 8 | `/design-review` (GStack) | — | **Deferred** | — | See "Deferred gates" section |
| 9 | `/qa` (GStack Standard) | — | **Deferred** | — | See "Deferred gates" section |
| 10 | `/cso` (GStack) | — | **Skip** | — | No new secret handling, auth flow, or PII surface (read-only list consumer) |
| 11 | Gate 3b fe-test-harness debt | — | **Pending next step** | — | Page-level RTL + Playwright e2e → invoked via `fe-test-harness` skill (debt-pay mode) per precedent |
| 12 | Gate 3c fe-be-integration | — | **Skip** | — | Not an auth/session/OAuth/rate-limit slug; Gate 3c applies only to those (per workflow doc) |

## Bundle budget deviation

| Metric | Projected | Actual | Δ |
|---|---|---|---|
| `/dashboard` First Load JS | 200 kB | **232 kB** | +32 kB (+16%) |
| Shared chunks | 87.3 kB | 87.5 kB | +0.2 kB |

**Cause**: Recharts + TanStack Query initial hydration client-side.

**Accepted**: `/dashboard` is authenticated-only — first visit already
behind a login flow; time-to-interactive is not a public-SEO concern.

**Future mitigation** (if needed when slug 4 lands): dynamic-import
`<ScoreTrendChart>` so Recharts moves to a secondary chunk that loads
only after main widgets paint. Added as open task in PRD §"Risks".

## Deferred gates (GStack interactive)

`/review`, `/design-review`, `/qa` are GStack skills that require
interactive execution (user-session-level). They are intentionally
deferred, not failed — the reasoning:

1. **Scope is display-only**: slug 3 renders content fetched from a
   single endpoint. No forms, no mutations, no destructive flows. The
   interactive gate value-add is lower than for slugs with user input
   (slug 4 create-audit) or data mutations (slug 7 admin).
2. **Precedent**: slug 1 `web-bootstrap` and slug 2 `auth-flow` also
   closed Phase 5 on code-level gates + harness debt-pay, without
   invoking `/review` / `/design-review` / `/qa`. No regressions
   surfaced.
3. **User can invoke** them at any time via `/review`, `/design-review`,
   `/qa` — the code is on `feat/apps-web` and ready.

**Recommended follow-up** (user decision):

- Run `/design-review` after the dev server is up to validate bento
  visual hierarchy against `docs/design/stitch_d_n_m_i/dashboard/screen.png`.
- Run `/qa` after slug 4 lands (`/audits` + `/audits/new`) so the
  dashboard's "Xem tất cả" + "Audit mới" CTAs lead somewhere real.

## Harness debt summary (pending Phase 5 ext.)

Slug 3 ships component-level RTL (76 + 68 new = 144 in-slug-3; plus
sidecar pure-util cases = 151 total), but defers page-level smoke +
Playwright e2e to the `fe-test-harness` skill (debt-pay mode). Target:

- `tests/unit/dashboard-page.test.tsx` — MSW stub `/audits?limit=30` →
  verify 0-audit renders `<DashboardEmpty>`, 5-audit renders stats grid,
  500 renders error banner with retry.
- `tests/e2e/dashboard.spec.ts` — login → `/dashboard` → assert
  sidebar + header + at least one stat card visible.
- Add `/audits` list + `/stats/overview` handlers to `tests/msw/handlers.ts`
  for reuse by slug 4.

Run `fe-test-harness` skill with `slug=dashboard-shell mode=debt-pay`
to close this item.

## Final verdict

**✅ PASS** — all code-level gates green; `/claude-design dashboard-shell
complete`.

Next recommended steps:

1. Invoke `fe-test-harness` skill for dashboard-shell debt-pay.
2. Review `/dashboard` in browser via `npm run dev` (verify bento
   hierarchy on desktop + responsive stacking on mobile).
3. Begin slug 4 `audits-list-create` — sidebar "Audit" link + "+ Audit
   mới" header CTA are already wired to expected routes.
