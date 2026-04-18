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

## Wave progress

| Wave | Description | Files | Commit | Status |
|---|---|---|---|---|
| 1 (PLAN W1+W2) | Workspace manifest + TS/build/test configs + scaffold | 10 (package.json, tsconfig.json, next.config.mjs, postcss.config.mjs, components.json, eslint.config.js, .gitignore, .env.example, src/types/global.d.ts; root package-lock.json bumped via `npm install` adding 151 deps) | **fc416bd** | ✅ done |
| 2 (PLAN W3) | Tailwind config + design tokens (`tokens.css`) + globals.css + public assets (favicon, logo.svg) | TBD | — | pending |
| 3 (PLAN W4) | Utilities with TDD: `cn.ts` + test, `format.ts` + test, `constants.ts`, ensure types/global.d.ts retained | TBD | — | pending |
| 4 (PLAN W5) | Lib stubs: `api/types.ts`, `api/client.ts`, `ws/client.ts`, `auth/store.ts`, `queries/keys.ts` | TBD | — | pending |
| 5 (PLAN W6) | shadcn primitives (11 components) | TBD | — | pending |
| 6 (PLAN W7) | App shell: `providers.tsx`, `error.tsx`, `layout.tsx` | TBD | — | pending |
| 7 (PLAN W8) | Placeholder page `app/page.tsx` | TBD | — | pending |
| 8 (PLAN W9) | Tests: `tests/setup.ts`, `tests/unit/smoke.test.tsx`, `tests/e2e/landing.spec.ts` + run gates | TBD | — | pending |

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
