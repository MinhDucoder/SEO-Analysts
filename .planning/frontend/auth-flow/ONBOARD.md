---
phase: 1
feature_slug: auth-flow
tier: large
status: approved
date: 2026-04-18
---

# Phase 1 — Onboard (reference + delta)

Slug 1 (`web-bootstrap`) performed a full `Agent:Explore` scan and produced
[web-bootstrap/ONBOARD.md](../web-bootstrap/ONBOARD.md) covering the 10 sections
of the monorepo's FE + API surface. The gateway, proto, and shared packages
have NOT changed since that report was committed (`e2f05ce`), so this slug
re-uses it in full.

**This document captures only the DELTA: what slug 1 shipped in `apps/web/`
that slug 2 will consume or modify.**

## 1. FE folder structure (now populated)

```
apps/web/
├── package.json                          (48 deps)
├── tsconfig.json                         (extends @repo/typescript-config/nextjs)
├── next.config.mjs                       (transpilePackages: ['@repo/shared'])
├── tailwind.config.ts                    (MD3 tokens + Manrope/Inter + fontSize scale)
├── postcss.config.mjs                    (tailwindcss + autoprefixer)
├── components.json                       (shadcn new-york + slate)
├── eslint.config.js                      (extends @repo/eslint-config/next-js)
├── vitest.config.ts                      (jsdom + setup + alias @)
├── playwright.config.ts                  (baseURL :3001 + webServer)
├── .env.example, .gitignore
├── public/
│   ├── favicon.svg
│   └── logo.svg                          (wordmark)
├── src/
│   ├── app/
│   │   ├── layout.tsx                    (html lang="vi", fonts via next/font)
│   │   ├── providers.tsx                 (QueryClient + Toaster) ⚠️ slug 2 MODIFIES
│   │   ├── error.tsx                     (global boundary)
│   │   ├── page.tsx                      (placeholder landing — will stay until slug 9)
│   │   └── globals.css                   (Tailwind + token import + body/headline fonts)
│   ├── components/
│   │   └── ui/                           (11 shadcn primitives)
│   │       ├── button, input, label, card, badge, separator,
│   │       ├── skeleton, dialog, dropdown-menu, tabs, sonner
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                 ⚠️ slug 2 MODIFIES (real tryRefresh)
│   │   │   └── types.ts                  (re-exports @repo/shared + AuthenticatedUser/AuthSession/Paginated/ApiErrorBody)
│   │   ├── auth/
│   │   │   └── store.ts                  (Zustand; shape already final)
│   │   ├── ws/client.ts                  (socket.io singleton — unchanged by slug 2)
│   │   ├── queries/keys.ts               ⚠️ slug 2 MODIFIES (populate auth.me)
│   │   ├── utils/
│   │   │   ├── cn.ts
│   │   │   └── format.ts                 (formatScore, formatDuration, formatRelativeDate, formatAbsoluteDate)
│   │   └── constants.ts                  (ROUTES, API_URL, WS_URL, APP_NAME, APP_TAGLINE, APP_URL)
│   ├── styles/
│   │   └── tokens.css                    (CSS variables — MD3)
│   └── types/global.d.ts
└── tests/
    ├── setup.ts
    ├── unit/
    │   ├── cn.test.ts                    (7 cases)
    │   ├── format.test.ts                (12 cases)
    │   └── smoke.test.tsx                (4 RTL cases)
    └── e2e/
        └── landing.spec.ts               (4 Playwright cases)
```

## 2. Stub surfaces slug 2 will replace / extend

| File | Current (slug 1) | Slug 2 change |
|---|---|---|
| `src/lib/api/client.ts` | `tryRefresh()` returns `null` (stub) | Replace with real `POST /auth/refresh` fetch |
| `src/lib/api/` | Only `client.ts`, `types.ts` | ADD `auth.ts` (login/register/verify/forgot/reset/me/logout/refresh functions) |
| `src/lib/auth/` | Only `store.ts` | ADD `schemas.ts` (zod), `mutations.ts` (TanStack), `hooks.ts` (useAuth/useLogout/useAuthBootstrap), `guard.tsx` (AuthGuard/AdminGuard) |
| `src/lib/queries/keys.ts` | `queryKeys = {}` | Populate `queryKeys.auth.me` |
| `src/app/providers.tsx` | QueryClient + Toaster only | Add `<AuthBootstrap />` above children |
| `src/app/` | Only `layout/providers/error/page` | ADD `(auth)/` route group with 6 pages + layout |

## 3. Gateway auth endpoints (consumed unchanged — see slug 1 ONBOARD §7)

All present at `/api/v1/auth/...` ([auth.controller.ts:60-150](../../../apps/gateway/src/auth/controllers/auth.controller.ts)):

- POST register, login, refresh, logout, verify-email, forgot-password,
  reset-password
- GET me, google, google/callback

Google OAuth callback target: `${FRONTEND_URL}/auth/oauth-success?token=<jwt>`
per [auth.controller.ts:148-149](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L148-L149).

**Our route is `/oauth-success` (NOT `/auth/oauth-success`) per DESIGN.md §"Routes".**
Need to verify gateway's `FRONTEND_URL` behavior — see Phase 2 mapping.

## 4. @repo/shared types already re-exported (slug 1)

`src/lib/api/types.ts` already exports `AuthenticatedUser`, `AuthSession`,
`AuditStatus`, `JWT_CONFIG`, `RATE_LIMIT`, etc. Slug 2 reuses these directly.

## Full onboard

For gateway HTTP endpoints (§7), WS events (§8), proto RPCs (§9), naming
conventions (§10), etc., refer to
[web-bootstrap/ONBOARD.md](../web-bootstrap/ONBOARD.md) which is still
current.
