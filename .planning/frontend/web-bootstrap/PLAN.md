---
phase: 3
feature_slug: web-bootstrap
tier: large
impact: scaffold-only
status: approved
date: 2026-04-18
---

# Phase 3 — Implementation Plan

## Build strategy

**TDD adaptation for scaffold work:** The `/claude-design` workflow defaults to
per-file TDD via `superpowers:test-driven-development`. For `web-bootstrap`, most
files are **non-testable scaffold** (configs, env files, type re-exports, JSX
primitives copied from shadcn). True TDD only applies to a handful of utility
functions with logic.

**Decision:** group scaffold files into **wave-level commits** (one commit per
wave) rather than 41 micro-commits. Two smoke tests gate the entire slug at the
end of Phase 4 (per-file gates restored in slugs 2-9 where logic warrants TDD).
Files with real logic (`cn.ts`, `format.ts`, auth store) get per-file TDD.

This deviates intentionally from the strict `/claude-design.md` spec but
preserves its spirit (atomic, reviewable commits + green tests before slug
exits Phase 4).

## Wave structure

```
Wave 1 — Workspace manifest + scripts        (1 commit)
Wave 2 — TS / build / test configs            (1 commit)
Wave 3 — Tailwind + tokens + globals          (1 commit)
Wave 4 — Utilities (TDD where logic exists)   (≤4 commits)
Wave 5 — Lib stubs (api / ws / auth / queries)(1 commit)
Wave 6 — shadcn primitives                    (1 commit)
Wave 7 — App shell (layout + providers + error)(1 commit)
Wave 8 — Placeholder page                     (1 commit)
Wave 9 — Tests + verify                       (1 commit, runs Phase 5 smoke)
```

Total: ~11 commits in Phase 4 (vs 41 if per-file). Pre-commit hook (turbo
lint+typecheck) runs once per commit → ~11 invocations vs 41.

## Wave 1 — Workspace manifest

| File | Purpose | Deps | Test | LOC |
|---|---|---|---|---|
| `apps/web/package.json` | Workspace name `@seo/web`, scripts (dev:3001, build, start, lint, test, type-check, e2e), dependencies | None | Wave 9 | ~70 |

**Action:** create file → run `npm install` from repo root → verify lockfile updates.
**Commit:** `feat(web): web-bootstrap/wave-1 — workspace manifest + deps`

## Wave 2 — TS / build / test configs

| File | Purpose | Deps | Test | LOC |
|---|---|---|---|---|
| `apps/web/tsconfig.json` | extends `@repo/typescript-config/nextjs.json`, paths `@/*` | Wave 1 | Wave 9 | ~25 |
| `apps/web/next.config.mjs` | App Router, transpilePackages, images.domains | Wave 1 | Wave 9 | ~25 |
| `apps/web/postcss.config.mjs` | tailwindcss + autoprefixer | Wave 1 | Wave 9 | ~6 |
| `apps/web/components.json` | shadcn manifest (style: new-york, baseColor: slate, cssVariables: true) | Wave 1 | Wave 9 | ~15 |
| `apps/web/.eslintrc.cjs` | extends `@repo/eslint-config/next.js` (or fallback) | Wave 1 | Wave 9 | ~10 |
| `apps/web/vitest.config.ts` | jsdom env, setupFiles, alias `@` | Wave 1 | Wave 9 | ~30 |
| `apps/web/playwright.config.ts` | webServer npm run dev, baseURL :3001 | Wave 1 | Wave 9 | ~35 |
| `apps/web/.gitignore` | .next/, coverage/, test-results/, .env.local | None | Wave 9 | ~8 |
| `apps/web/.env.example` | NEXT_PUBLIC_* vars | None | Wave 9 | ~10 |

**Verification:** `npm run type-check --filter=web` should pass with empty src.
**Commit:** `feat(web): web-bootstrap/wave-2 — ts + build + test configs`

## Wave 3 — Tailwind + tokens + globals

| File | Purpose | Deps | Test | LOC |
|---|---|---|---|---|
| `apps/web/tailwind.config.ts` | content scan, theme.extend (colors via CSS vars per [32 §2](../../../docs/design/32-design-system.md), fontFamily Manrope/Inter, fontSize scale §3.2, spacing §4, borderRadius §5, boxShadow §6), darkMode 'class', plugins (typography, animate) | Wave 2 | Wave 9 | ~95 |
| `apps/web/src/styles/tokens.css` | All CSS variables per [32 §12](../../../docs/design/32-design-system.md) | None | Wave 9 | ~85 |
| `apps/web/src/app/globals.css` | @tailwind base/components/utilities + import tokens + body font + ::selection + reduced motion media query | Wave 3 (tokens.css) | Wave 9 | ~55 |
| `apps/web/public/favicon.ico` | Placeholder (1×1 transparent or copy from another app) | None | Wave 9 | binary |
| `apps/web/public/logo.svg` | Inline SVG wordmark "SEO Analyst" | None | Wave 9 | ~30 |

**Commit:** `feat(web): web-bootstrap/wave-3 — tailwind + design tokens + globals`

## Wave 4 — Utilities (TDD where applicable)

### 4a — `cn.ts` (TDD)

| File | Purpose | Test file | LOC |
|---|---|---|---|
| `apps/web/src/lib/utils/cn.ts` | `cn(...inputs) = twMerge(clsx(inputs))` | `apps/web/tests/unit/cn.test.ts` | 8 |

**TDD cycle:**
1. RED: `tests/unit/cn.test.ts` — assert `cn('a','b') === 'a b'`, `cn('p-4','p-2') === 'p-2'` (twMerge dedupe).
2. GREEN: implement `cn()`.
3. Commit: `feat(web): web-bootstrap/lib/utils/cn — clsx + twMerge`

### 4b — `format.ts` (TDD)

| File | Purpose | Test file | LOC |
|---|---|---|---|
| `apps/web/src/lib/utils/format.ts` | `formatScore(n)`, `formatDuration(ms)`, `formatRelativeDate(date)` (dayjs vi locale) | `apps/web/tests/unit/format.test.ts` | 60 |

**TDD cycle:**
1. RED: `tests/unit/format.test.ts` — `formatScore(85) === '85'`, `formatScore(null) === '—'`; `formatDuration(15000) === '15 giây'`; `formatRelativeDate(2hAgo) === '2 giờ trước'`.
2. GREEN: implement.
3. Commit: `feat(web): web-bootstrap/lib/utils/format — score + duration + date helpers`

### 4c — `constants.ts` (no TDD; literal data)

| File | Purpose | LOC |
|---|---|---|
| `apps/web/src/lib/constants.ts` | `ROUTES` enum (paths from [30 §4](../../../docs/design/30-frontend-architecture.md) routing table), `APP_NAME`, `APP_URL` | 50 |

### 4d — `types/global.d.ts` (no TDD)

| File | Purpose | LOC |
|---|---|---|
| `apps/web/src/types/global.d.ts` | (Empty placeholder for future window/global types) | 15 |

**Commit:** `feat(web): web-bootstrap/wave-4 — utility helpers + constants + global types`

## Wave 5 — Lib stubs

All shells with stub interfaces; real wiring comes in slugs 2 + 5.

| File | Purpose | Deps | Test | LOC |
|---|---|---|---|---|
| `apps/web/src/lib/api/types.ts` | Re-export DTOs from `@repo/shared` (`AuthenticatedUser`, `AuditStatus`, `AuditProgressEvent`, `CoreWebVitals`, `JWT_CONFIG`, `RATE_LIMIT`) | None | Wave 9 (typecheck) | 15 |
| `apps/web/src/lib/api/client.ts` | `ky` instance: prefixUrl from `NEXT_PUBLIC_API_URL`, beforeRequest reads token from `useAuthStore.getState()`, afterResponse 401 → `tryRefresh()` STUB returning null | Wave 5 (auth/store) | Wave 9 (typecheck) | 80 |
| `apps/web/src/lib/ws/client.ts` | `getSocket()` singleton + `disconnectSocket()`, auth token from store stub, reconnect 1s→10s 10 attempts ([33 §3](../../../docs/design/33-realtime-ux.md)) | Wave 5 (auth/store) | Wave 9 (typecheck) | 100 |
| `apps/web/src/lib/auth/store.ts` | Zustand: `{ user, accessToken, setAuth, clearAuth, isAdmin }` per [30 §5.1](../../../docs/design/30-frontend-architecture.md) | None | Wave 9 (typecheck) | 50 |
| `apps/web/src/lib/queries/keys.ts` | Empty `queryKeys = {}` factory + JSDoc | None | Wave 9 | 25 |

**Commit:** `feat(web): web-bootstrap/wave-5 — api + ws + auth + queries stubs`

## Wave 6 — shadcn primitives

11 components copied verbatim from shadcn registry then aligned to project tokens
([32 §7](../../../docs/design/32-design-system.md)).

| File | Variants / API | Deps | LOC |
|---|---|---|---|
| `apps/web/src/components/ui/button.tsx` | CVA: primary/secondary/ghost/destructive/outline; sizes sm/md/lg/icon | cn | 60 |
| `apps/web/src/components/ui/input.tsx` | forwardRef; left/right icon; error state | cn | 40 |
| `apps/web/src/components/ui/label.tsx` | Radix Label | cn + @radix-ui/react-label | 25 |
| `apps/web/src/components/ui/card.tsx` | Card + Header/Title/Description/Content/Footer; variants default/elevated/outline/dark/hero | cn | 70 |
| `apps/web/src/components/ui/badge.tsx` | CVA: primary/success/warning/error/neutral; sizes sm/md/lg | cn | 50 |
| `apps/web/src/components/ui/dialog.tsx` | Radix Dialog wrapped | cn + @radix-ui/react-dialog | 80 |
| `apps/web/src/components/ui/dropdown-menu.tsx` | Radix DropdownMenu | cn + @radix-ui/react-dropdown-menu | 90 |
| `apps/web/src/components/ui/separator.tsx` | Radix Separator | cn + @radix-ui/react-separator | 25 |
| `apps/web/src/components/ui/skeleton.tsx` | bg-muted animate-pulse rounded | cn | 20 |
| `apps/web/src/components/ui/tabs.tsx` | Radix Tabs | cn + @radix-ui/react-tabs | 60 |
| `apps/web/src/components/ui/sonner.tsx` | Sonner Toaster wrapper, theme-aware | sonner | 25 |

**Verification:** Each primitive renders in isolation (verified by smoke test
indirectly — placeholder page imports `<Button>` to prove tree-shake works).
**Commit:** `feat(web): web-bootstrap/wave-6 — shadcn primitives (11 components)`

## Wave 7 — App shell

| File | Purpose | Deps | Test | LOC |
|---|---|---|---|---|
| `apps/web/src/app/providers.tsx` | `'use client'`. QueryClientProvider (staleTime 60s, refetchOnWindowFocus false) + Sonner Toaster | Wave 5+6 | Wave 9 (smoke) | 50 |
| `apps/web/src/app/error.tsx` | `'use client'`. Generic error UI + reset button | Wave 6 (Card, Button) | Wave 9 | 40 |
| `apps/web/src/app/layout.tsx` | next/font Manrope+Inter, `<html lang="vi">`, metadata, wrap `<Providers>` | Wave 3+5+7 | Wave 9 (smoke) | 70 |

**Commit:** `feat(web): web-bootstrap/wave-7 — root layout + providers + error boundary`

## Wave 8 — Placeholder page

| File | Purpose | Deps | Test | LOC |
|---|---|---|---|---|
| `apps/web/src/app/page.tsx` | RSC: hero with Manrope wordmark "SEO Analyst" + Inter subtitle "Phân tích SEO Việt — đang xây dựng" + one `<Button variant="primary">` placeholder | Wave 6 (Button), Wave 7 (layout) | Wave 9 (e2e) | 30 |

**Commit:** `feat(web): web-bootstrap/wave-8 — placeholder landing page`

## Wave 9 — Tests + Phase 5 entry

| File | Purpose | Deps | LOC |
|---|---|---|---|
| `apps/web/tests/setup.ts` | Vitest setup: `@testing-library/jest-dom`, cleanup | RTL | 20 |
| `apps/web/tests/unit/smoke.test.tsx` | Render `<RootLayout><div>x</div></RootLayout>` w/o throw; assert children rendered | RTL | 30 |
| `apps/web/tests/e2e/landing.spec.ts` | Navigate `/`, expect "SEO Analyst" text + Manrope font applied | Playwright | 30 |

**Verification (= Phase 5 entry):**
- `npm run type-check` (root) → 0 errors
- `npm run lint --filter=web` → 0 errors
- `npm run test --filter=web` → smoke + cn + format pass
- `npm run dev --filter=web` → dev server up at localhost:3001
- `npm run e2e:smoke` (web only via filter) → landing.spec.ts pass
- Manual visual check (or `/design-review` skill if visual surface added)

**Commit:** `feat(web): web-bootstrap/wave-9 — smoke tests + e2e landing`

## Integration checklist

Items that touch repo-level state (verify in Phase 5):

- [ ] **Env vars:** `apps/web/.env.example` documents `NEXT_PUBLIC_API_URL`,
      `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_REPORT_HTTP_URL`, `NEXT_PUBLIC_APP_URL`,
      `NEXT_PUBLIC_APP_NAME`. Local `.env.local` not committed.
- [ ] **TanStack Query keys:** `lib/queries/keys.ts` exports empty factory; slug 2
      will populate `auth.*`, slug 4-5 will add `audits.*`.
- [ ] **Routes:** `lib/constants.ts` defines `ROUTES.{ home, login, register,
      dashboard, audits, ... }` per [30 §4](../../../docs/design/30-frontend-architecture.md);
      every future slug references this enum.
- [ ] **i18n:** No `next-intl` wiring in this slug (defer to slug 9 or later).
      Body text in placeholder uses Vietnamese inline.
- [ ] **CORS:** Backend gateway `FRONTEND_URL` env already defaults to
      `http://localhost:3001` ([auth.controller.ts:148](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L148)) — no
      backend change needed.
- [ ] **Turbo pipeline:** `turbo.json` `apps/*` glob covers `apps/web` automatically;
      verify `dev`, `build`, `lint`, `check-types`, `test` tasks fire correctly.

## Phase 4 → Phase 5 gate map

| Phase 5 gate | Status for `web-bootstrap` |
|---|---|
| 1. type-check | Always — runs after each wave commit via pre-commit hook |
| 2. lint --filter=web | Always — runs after each wave commit |
| 3. test --filter=web | Wave 4 (cn, format), Wave 9 (smoke) |
| 4. Proto typecheck | N/A — no proto change |
| 5. e2e:smoke (gateway) | N/A — no gateway change; web e2e is `landing.spec.ts` only |
| 6. /review (Medium+Large) | Manual after Wave 9 |
| 7. /design-review | Manual after Wave 9 (token wiring smoke) |
| 8. /qa (Large interactive) | Skip — only placeholder UI; QA defers to slug 5 |
| 9. /cso (Large + auth/PII/admin) | Skip — slug touches auth STUB only, no real auth wiring; defer to slug 2 |
