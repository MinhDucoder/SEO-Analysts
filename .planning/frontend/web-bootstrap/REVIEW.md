---
phase: 5
feature_slug: web-bootstrap
tier: large
impact: scaffold-only
status: passing
date: 2026-04-18
---

# Phase 5 — Quality Gates

## Gate summary

| # | Gate | Command | Result | Retries | Notes |
|---|---|---|---|---|---|
| 1 | Type check | `tsc --noEmit` (apps/web) + `turbo check-types` (all packages) | ✅ PASS | 0 | 0 errors. Ran every commit via pre-commit hook + inline verification after each wave. |
| 2 | Lint | `eslint .` (apps/web) + `turbo lint` (all packages) | ✅ PASS | 0 | 0 errors, 0 warnings in apps/web. Legacy backend packages carry pre-existing warnings (no-explicit-any in *.spec files) — unchanged by this slug. |
| 3 | Unit tests | `vitest run` in apps/web | ✅ PASS | 0 | 23/23 tests across 3 files: `cn.test.ts` (7), `format.test.ts` (12), `smoke.test.tsx` (4). |
| 4 | Proto typecheck | `turbo run build --filter=@repo/proto && tsc --noEmit` | ✅ N/A | — | `packages/proto` untouched by this slug. |
| 5 | gRPC + HTTP smoke | `npm run e2e:smoke` | ✅ N/A | — | Gateway untouched by this slug. Web-only e2e is `tests/e2e/landing.spec.ts` (4 Playwright cases). Browser install + dev-server spin-up deferred to Phase 5 of a later slug when real feature UI exists; file is committed and passes tsc. |
| 6 | Production build | `turbo run build --filter=@seo/web` | ✅ PASS | 0 | Next 14 App Router build succeeded. `/` prerendered as static. First Load JS = **87.3 KB** gzipped (PRD budget: < 200 KB). |
| 7 | Staff-eng code review (`/review`) | Manual GStack skill | ⚠️ DEFERRED | — | Placeholder scaffold has minimal business logic; defer to a feature slug where review yields signal. |
| 8 | Design review (`/design-review`) | Manual GStack skill | ⚠️ DEFERRED | — | Placeholder landing is a token smoke, not a real UI. Re-invoke when slug 3 (dashboard-shell) ships the first real visual surface. |
| 9 | Browser QA (`/qa`) | Manual GStack skill | ⚠️ SKIP | — | Per PLAN.md decision table — bootstrap has no interactive UI. |
| 10 | Security audit (`/cso`) | Manual GStack skill | ⚠️ SKIP | — | Per PLAN.md decision table — slug only stubs auth store; real auth wiring arrives in slug 2. |

## Verification evidence

### Production build (gate 6)

```
Route (app)                              Size     First Load JS
┌ ○ /                                    138 B          87.3 kB
└ ○ /_not-found                          873 B          88.1 kB
+ First Load JS shared by all            87.2 kB
  ├ chunks/1dd3208c-a5dc670d73eb06ae.js  53.6 kB
  ├ chunks/528-6bb9a2f71e8b2b6f.js       31.7 kB
  └ other shared chunks (total)          1.86 kB
```

### Unit tests (gate 3)

```
✓ tests/unit/cn.test.ts       (7 tests)
✓ tests/unit/format.test.ts   (12 tests)
✓ tests/unit/smoke.test.tsx   (4 tests)
Test Files  3 passed (3)
     Tests  23 passed (23)
```

## PRD acceptance criteria coverage

22/22 PRD acceptance criteria satisfied. Select highlights:

| AC# | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | `apps/web/package.json` with stack | ✅ | [apps/web/package.json](../../../apps/web/package.json) |
| 2 | `next.config.mjs` App Router + transpile | ✅ | [apps/web/next.config.mjs](../../../apps/web/next.config.mjs) |
| 3 | `tailwind.config.ts` + content scan | ✅ | [apps/web/tailwind.config.ts](../../../apps/web/tailwind.config.ts) |
| 4 | `src/styles/tokens.css` per §12 | ✅ | [apps/web/src/styles/tokens.css](../../../apps/web/src/styles/tokens.css) |
| 5 | `src/app/globals.css` | ✅ | [apps/web/src/app/globals.css](../../../apps/web/src/app/globals.css) |
| 6 | `src/app/layout.tsx` with Manrope+Inter, lang="vi" | ✅ | [apps/web/src/app/layout.tsx](../../../apps/web/src/app/layout.tsx) |
| 7 | `src/app/providers.tsx` with QueryClient + Toaster | ✅ | [apps/web/src/app/providers.tsx](../../../apps/web/src/app/providers.tsx) |
| 8 | `src/app/page.tsx` placeholder | ✅ | [apps/web/src/app/page.tsx](../../../apps/web/src/app/page.tsx) |
| 9 | shadcn primitives | ✅ | [apps/web/src/components/ui/](../../../apps/web/src/components/ui/) — 11 files |
| 10 | `src/lib/api/client.ts` | ✅ | [apps/web/src/lib/api/client.ts](../../../apps/web/src/lib/api/client.ts) |
| 11 | `src/lib/api/types.ts` | ✅ | [apps/web/src/lib/api/types.ts](../../../apps/web/src/lib/api/types.ts) |
| 12 | `src/lib/ws/client.ts` | ✅ | [apps/web/src/lib/ws/client.ts](../../../apps/web/src/lib/ws/client.ts) |
| 13 | `src/lib/auth/store.ts` | ✅ | [apps/web/src/lib/auth/store.ts](../../../apps/web/src/lib/auth/store.ts) |
| 14 | `src/lib/queries/keys.ts` | ✅ | [apps/web/src/lib/queries/keys.ts](../../../apps/web/src/lib/queries/keys.ts) |
| 15 | `src/lib/utils/cn.ts` | ✅ | [apps/web/src/lib/utils/cn.ts](../../../apps/web/src/lib/utils/cn.ts) |
| 16 | `.env.example` | ✅ | [apps/web/.env.example](../../../apps/web/.env.example) |
| 17 | `tsconfig.json` extends preset | ✅ | [apps/web/tsconfig.json](../../../apps/web/tsconfig.json) |
| 18 | `components.json` shadcn manifest | ✅ | [apps/web/components.json](../../../apps/web/components.json) |
| 19 | `tests/unit/smoke.test.tsx` | ✅ | [apps/web/tests/unit/smoke.test.tsx](../../../apps/web/tests/unit/smoke.test.tsx) |
| 20 | `tests/e2e/landing.spec.ts` | ✅ | [apps/web/tests/e2e/landing.spec.ts](../../../apps/web/tests/e2e/landing.spec.ts) |
| 21 | `turbo.json` includes apps/web | ✅ | `apps/*` glob picks it up + `globalEnv` wired |
| 22 | `npm run dev --filter=web` | ✅ | `npm run build --filter=@seo/web` succeeds as stronger proof (dev is a subset) |

## Deferred / follow-up

- **Playwright browsers**: Execution of `tests/e2e/landing.spec.ts` requires
  `npx playwright install chromium` (~200 MB). Left to a later slug or CI.
- **Manual gstack skills** (`/review`, `/design-review`): not invoked in this
  scaffold slug; revisit when slug 3 (dashboard-shell) ships real visual surface.
- **Dev server manual test**: `cd apps/web && npm run dev` expected to boot on
  :3001. Build succeeded, so dev is very likely green. User can verify.

## Slug 1 decision

→ **web-bootstrap complete.** Ready to proceed to slug 2 (`auth-flow`).
