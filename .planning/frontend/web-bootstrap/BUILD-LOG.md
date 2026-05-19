---
phase: 4
feature_slug: web-bootstrap
tier: large
impact: scaffold-only
status: in-progress
date: 2026-04-18
---

# Phase 4 — Build Log

## Deviations from PLAN.md

| Plan wave | Actual commit | Reason |
|---|---|---|
| Wave 1 (manifest only) + Wave 2 (TS/build/test configs) | **MERGED into single commit `fc416bd`** | Pre-commit hook runs `turbo lint + check-types` across the workspace. If `package.json` is added without `tsconfig.json` + `eslint.config.js`, the `@seo/web` package's `check-types` and `lint` scripts cannot resolve and the commit fails. Bundling Wave 1 + 2 lets the hook see a coherent workspace. |
| `next lint` (planned in PLAN Wave 2) | Switched to `eslint .` | `next lint` errored "Invalid project directory provided" inside the turbo monorepo runner; switched to direct `eslint .` to bypass the wrapper. |
| Eslint preset `next-js` | Disabled `@next/next/no-html-link-for-pages` | The rule errors when `pages/` and `src/pages/` are absent (App Router). |
| Wave 2 favicon | `public/favicon.svg` (not `.ico`) | Can't author binary ICO via file-write; Next 14 supports SVG favicons. Browser + RSC link element pick it up. |
| Wave 5 React types | Root `package.json` `overrides` for `@types/react` + `@types/react-dom` → `^18.3.x` | `@repo/ui` declares React 19 + `@types/react@19.2.2` (hoisted to root `node_modules`). Apps/web runtime is React 18.3.1 (Next.js 14 doesn't support React 19). Without override, Radix primitives fail tsc with `bigint not assignable to ReactNode` because React 19 types leak into 18 runtime. Override is minimal (only types, not react runtime); `@repo/ui` still tsc-passes with 18 types because its 3 components use no React-19-only features. |
| Wave 8 React runtime | `@repo/ui/package.json` pinned to React 18 directly | npm `overrides` does NOT apply to workspace packages. @repo/ui's React 19 was still hoisted as the only react in root node_modules, and apps/web resolved to it via workspace hoisting. RTL + vitest rendering then threw "A React Element from an older version of React was rendered". Fix: downgrade @repo/ui to React 18 directly. Its 3 trivial components (Button/Card/Code) have no React-19-only APIs. |

## Wave progress

| Wave | Description | Files | Commit | Status |
|---|---|---|---|---|
| 1 (PLAN W1+W2) | Workspace manifest + TS/build/test configs + scaffold | 10 (package.json, tsconfig.json, next.config.mjs, postcss.config.mjs, components.json, eslint.config.js, .gitignore, .env.example, src/types/global.d.ts; root package-lock.json bumped via `npm install` adding 151 deps) | **fc416bd** + fix **be79300** (drop unused deps, add test configs) + **704141c** (turbo globalEnv) | ✅ done |
| 2 (PLAN W3) | Tailwind config + design tokens + globals + public SVG assets | 5 (tailwind.config.ts, src/styles/tokens.css, src/app/globals.css, public/logo.svg, public/favicon.svg) | **0ed5ee7** | ✅ done |
| 3 (PLAN W4) | Utilities with TDD: `cn.ts` + test, `format.ts` + test, `constants.ts` | 5 (src/lib/utils/cn.ts, src/lib/utils/format.ts, src/lib/constants.ts, tests/unit/cn.test.ts, tests/unit/format.test.ts). 19/19 vitest pass. | **3dedac6** | ✅ done |
| 4 (PLAN W5) | Lib stubs: api/types, api/client, ws/client, auth/store, queries/keys | 5 (src/lib/api/types.ts re-exports @repo/shared + AuthenticatedUser/AuthSession/Paginated/ApiErrorBody; src/lib/auth/store.ts Zustand {user, accessToken, setAuth, clearAuth, isAuthenticated, isAdmin}; src/lib/api/client.ts ky instance with beforeRequest Bearer + afterResponse 401→tryRefresh STUB; src/lib/ws/client.ts getSocket() singleton with 10× reconnect + __resetSocketForTests; src/lib/queries/keys.ts empty factory template) | **4060f4e** | ✅ done |
| 5 (PLAN W6) | shadcn primitives (11 components) + root React types override | 11 components in src/components/ui/ (button, input, label, card, badge, separator, skeleton, dialog, dropdown-menu, tabs, sonner). Adapted to MD3 tokens (primary-container/surface-container-high/on-surface-variant/error/tertiary). Root package.json overrides pin @types/react+dom to ^18 to stop @repo/ui's @types/react@19 from leaking to apps/web runtime (React 18.3.1) mismatch. | **e7c39f5** | ✅ done |
| 6 (PLAN W7) | App shell: providers, error, layout | 3 (src/app/providers.tsx with QueryClient 60s staleTime + Toaster; src/app/error.tsx global error boundary with Card + reset; src/app/layout.tsx next/font Manrope+Inter + html lang="vi" + metadata/viewport + Providers wrap) | **4f3dc31** | ✅ done |
| 7 (PLAN W8) | Placeholder page `app/page.tsx` | 1 (RSC landing renders Badge "web-bootstrap" + Manrope wordmark display-lg + tagline + status text + primary Button — smoke-tests token wiring end-to-end) | **7834f77** | ✅ done |
| 8 (PLAN W9) | Tests + @repo/ui React 18 downgrade | 2 (tests/unit/smoke.test.tsx 4 RTL cases verify HomePage renders wordmark/badge/Vietnamese copy/button; tests/e2e/landing.spec.ts 4 Playwright cases verify headline + badge + html lang="vi" + favicon). Root cause fix: @repo/ui/package.json pinned react/react-dom/@types/react/@types/react-dom to ^18 (was 19) — hoisted React 19 was triggering "A React Element from an older version" during RTL renders since apps/web runtime resolves via workspace to @repo/ui's React. | (this commit) | ✅ done |

## Resume instructions

Re-invoke in fresh session:

```
/claude-design web-bootstrap --resume
```

The orchestrator will read STATE.md, see `phases.4 = in-progress`, and pick up
at Wave 2 of Phase 4.

Pre-conditions verified before pause:

- `apps/web/package.json` ready, dependencies installed (`node_modules/` populated).
- `tsc --noEmit` passes (only `src/types/global.d.ts` exists).
- `eslint .` passes (no rule violations).
- Pre-commit hook is happy (16/16 turbo tasks pass).

Next concrete actions on resume:

1. Create `apps/web/tailwind.config.ts` per [docs/design/32-design-system.md §2-§6](../../../docs/design/32-design-system.md).
2. Create `apps/web/src/styles/tokens.css` per [32-design-system.md §12](../../../docs/design/32-design-system.md).
3. Create `apps/web/src/app/globals.css` (Tailwind layers + token import + body font).
4. Add placeholder `apps/web/public/favicon.ico` (transparent 1×1) and `apps/web/public/logo.svg` (inline wordmark).
5. Run `npx tsc --noEmit && npx eslint .` to verify, then commit Wave 2.
