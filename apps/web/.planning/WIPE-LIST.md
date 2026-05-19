# Wipe list — apps/web/ legacy reset before Phase 5+

> **Goal**: Reset UI + theme to match design Phase 0–4 (mono Linear-style).
> **Keep**: BE-bound logic (api, auth store, query setup, ws, validators), infra config, pure-logic tests.
> **Strategy**: Backup branch first → delete → commit clean wipe → bootstrap fresh from Phase 5 plan.

---

## 🟢 KEEP (1121 LOC business logic + config + 4 test files)

### lib/ — BE-bound, no UI dependency
```
src/lib/api/audits.ts            (35  LOC) — gateway /audits client
src/lib/api/auth.ts              (59  LOC) — /auth/login/register/refresh
src/lib/api/client.ts            (87  LOC) — ky + silent refresh
src/lib/api/types.ts             (91  LOC) — re-exports @repo/shared + AuthenticatedUser/Session
src/lib/auth/store.ts            (32  LOC) — Zustand auth store
src/lib/auth/hooks.ts            (96  LOC) — useAuth, useLogout
src/lib/auth/mutations.ts        (152 LOC) — login/register/refresh/logout mutations
src/lib/auth/schemas.ts          (54  LOC) — zod validators (email/password/etc)
src/lib/queries/keys.ts          (28  LOC) — TanStack query keys
src/lib/queries/use-audits.ts    (38  LOC) — useRecentAudits hook
src/lib/ws/client.ts             (62  LOC) — Socket.IO singleton
src/lib/utils/classify.ts        (52  LOC) — score → variant (matches Pencil tokens)
src/lib/utils/cn.ts              (10  LOC) — clsx + twMerge
src/lib/utils/format.ts          (52  LOC) — dayjs formatters
src/lib/dashboard/aggregates.ts  (106 LOC) — stat computation
src/lib/dashboard/chart-data.ts  (66  LOC) — trend series builder
src/lib/constants.ts             (101 LOC) — ROUTES + API_URL/WS_URL envs
```

### app/ root — minimum scaffolding
```
src/app/layout.tsx               — root server layout (will need rewrite if needed)
src/app/providers.tsx            — QueryClient + Toaster + AuthBootstrap wrap
src/types/global.d.ts            — module declarations
```

### Test infra
```
tests/setup.ts                   — vitest + jest-dom setup
tests/msw/handlers.ts            — MSW HTTP handlers
tests/msw/server.ts              — MSW server boot
tests/helpers/render.tsx         — test wrapper with QueryClient
tests/unit/auth-schemas.test.ts  — pure logic
tests/unit/auth-store.test.ts    — pure logic
tests/unit/classify.test.ts      — pure logic
tests/unit/cn.test.ts            — pure logic
```

### Config + meta
```
package.json, tsconfig.json, next.config.mjs, next-env.d.ts
playwright.config.ts, vitest.config.ts, postcss.config.mjs
eslint.config.js, components.json, .env.example, .env.local
.gitignore, public/
```

---

## 🔴 DELETE (theme + UI mismatch with Phase 4)

### Components — all UI built before Phase 4 spec
```
src/components/auth/              — 5 files
src/components/common/            — 3 files (empty-state, score-badge, status-badge)
src/components/dashboard/         — 7 files (cards, charts, stats, score-gauge-hero)
src/components/layout/            — 7 files (sidebar, header, mobile-nav, user-menu, dashboard-shell, sidebar-link, wordmark)
src/components/ui/                — 11 shadcn primitives (will re-add via shadcn CLI as needed in Phase 5)
```

### Pages — wrong theme
```
src/app/(app)/                    — dashboard layout + page + loading (built corporate blue)
src/app/(auth)/                   — login/register/forgot/reset/verify (5 pages, wrong theme)
src/app/auth/oauth-success/       — wrong theme
src/app/page.tsx                  — landing (corporate blue hero)
src/app/error.tsx                 — global error (depends on shadcn)
src/app/globals.css               — tied to old tokens.css
src/styles/tokens.css             — CORPORATE BLUE, contradicts Phase 0–4 mono palette
```

### Tests bound to deleted UI
```
tests/e2e/                        — auth-pages, dashboard, landing specs
tests/unit/auth-guard.test.tsx    — depends on guard.tsx components
tests/unit/auth-pages/            — 6 files (login/register/forgot/reset/verify/oauth)
```

### Auth guard (UI component, rewrite in Phase 5)
```
src/lib/auth/guard.tsx            — uses Card + Skeleton (shadcn); logic survives in hooks.ts
```

### Tailwind config — bound to wrong tokens
```
apps/web/tailwind.config.ts       — REGENERATE from Pencil $color-* + $font-* + $radius-* + $spacing-*
```

---

## 🟡 MODIFY (not delete, but touch)

```
src/app/layout.tsx                — remove font ref to old Inter setup if any; rebuild after tokens regenerated
src/app/providers.tsx             — Toaster import will need to be re-pointed if sonner location changes
                                    AuthBootstrap component will be re-added when auth UI rebuilt
```

---

## Stats

- Files deleted: ~50 (components + pages + bound tests)
- Files kept: 17 lib/ + 3 app root + 8 test infra + 13 config
- LOC kept: ~1121 (lib) + ~110 (app root) + ~200 (test infra)
- LOC deleted: ~2500 estimated

---

## Execute order

1. `git checkout -b feat/web-legacy-snapshot` then push (rollback safety)
2. `git checkout feat/web-fresh` resume
3. Delete files per DELETE list above
4. Verify `pnpm --filter @seo/web check-types` still passes (lib/ should compile alone)
5. Commit `chore(web): wipe legacy UI before Phase 5 reskin`
