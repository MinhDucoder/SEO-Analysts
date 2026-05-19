---
phase: 3
feature_slug: auth-flow
tier: large
impact: auth-wiring
status: approved
date: 2026-04-18
---

# Phase 3 — Implementation Plan

## Build strategy

Pragmatic wave-level commits (per slug 1 precedent in
[web-bootstrap BUILD-LOG](../web-bootstrap/BUILD-LOG.md)): one commit per
logical layer. True TDD per file for modules with real logic (schemas,
mutations, hooks, guards); wave-grouped commits for UI pages and layout
shells since their correctness is covered by RTL smoke tests downstream.

## Wave structure

```
Wave 1 — API client real refresh + auth API surface       (1 commit)
Wave 2 — Zod schemas + TDD                                (1 commit)
Wave 3 — Mutation + hook library                          (1 commit)
Wave 4 — <AuthBootstrap> + <AuthGuard> + providers wire    (1 commit)
Wave 5 — Auth form shell + field + google button          (1 commit)
Wave 6 — 6 auth pages + (auth) layout + /auth/oauth-success (1 commit)
Wave 7 — ROUTES.oauthSuccess fix + query keys + misc glue  (1 commit)
Wave 8 — Tests (RTL per page + mutation + schemas)        (1 commit)
```

## Wave 1 — API + real refresh

| File | Purpose | LOC |
|---|---|---|
| `apps/web/src/lib/api/client.ts` (modify) | `tryRefresh()` calls `POST /auth/refresh` with credentials:'include'; on 2xx returns `accessToken`; on anything else returns null. | +15/-5 |
| `apps/web/src/lib/api/auth.ts` (new) | Thin wrappers around `api.post/get` returning typed responses for register/login/refresh/logout/me/verify-email/forgot-password/reset-password. | ~90 |

Commit: `feat(web): auth-flow/wave-1 — real tryRefresh + api/auth.ts`

## Wave 2 — Zod schemas

| File | Purpose | Tests | LOC |
|---|---|---|---|
| `src/lib/auth/schemas.ts` | `loginSchema` (email, password min 1); `registerSchema` (fullName 2-100, email, password min 8, confirmPassword matches, agreed literal true); `forgotPasswordSchema` (email); `resetPasswordSchema` (newPassword min 8 + confirm matches). Exported types: `LoginInput`, `RegisterInput`, etc. | `tests/unit/auth-schemas.test.ts` | ~80 |

TDD cycle: write tests first — cover pass/fail for each field (empty, bad
format, short, mismatch, missing agreed).

Commit: `feat(web): auth-flow/wave-2 — zod schemas + TDD`

## Wave 3 — Mutations + hooks

| File | Purpose | LOC |
|---|---|---|
| `src/lib/auth/mutations.ts` | `useLogin`, `useRegister`, `useVerifyEmail`, `useForgotPassword`, `useResetPassword` — each uses `useMutation`, shared `onError` toast with status-code → Vietnamese message map. | ~140 |
| `src/lib/auth/hooks.ts` | `useAuth()` (select from store), `useLogout()` (mutation + clearAuth + router.push('/login')), `useAuthBootstrap()` (effect-once refresh), `useMeQuery()` (TanStack Query keyed `queryKeys.auth.me`, enabled=isAuthenticated). | ~80 |
| `src/lib/queries/keys.ts` (modify) | Populate `auth = { me: ['auth','me'] as const }`. | +3 |

Commit: `feat(web): auth-flow/wave-3 — mutations + hooks + query keys`

## Wave 4 — Bootstrap + Guards

| File | Purpose | LOC |
|---|---|---|
| `src/components/auth/auth-bootstrap.tsx` | `'use client'` component. Calls `useAuthBootstrap()` in a useEffect. Returns null. | ~25 |
| `src/lib/auth/guard.tsx` | `<AuthGuard>` (redirect to `/login` if !auth, render `<Skeleton />` while checking); `<AdminGuard>` (renders NotAuthorized card if !isAdmin). | ~70 |
| `src/app/providers.tsx` (modify) | Add `<AuthBootstrap />` as a sibling of children inside QueryClientProvider. | +3/-1 |

Commit: `feat(web): auth-flow/wave-4 — bootstrap + guards + providers wire`

## Wave 5 — Shared form components

| File | Purpose | LOC |
|---|---|---|
| `src/components/auth/auth-form-shell.tsx` | RSC-safe (no "use client") Card outline max-w-md + logo.svg Image + title + description + children slot + footer slot. | ~60 |
| `src/components/auth/auth-form-field.tsx` | `'use client'`. RHF-adapted Label + Input + error message. Props: name, label, type, placeholder, autoComplete. | ~50 |
| `src/components/auth/google-oauth-button.tsx` | `'use client'`. Outline Button size=lg with lucide `<Chrome>` icon. onClick: window.location.href = `${API_URL.replace(/\/api\/v1$/, '')}/auth/google`. | ~35 |
| `src/components/auth/resend-verify-link.tsx` | `'use client'`. Button that calls `useForgotPassword` with the user's email; shown inside error banners. | ~40 |

Commit: `feat(web): auth-flow/wave-5 — auth form shell + fields + google button`

## Wave 6 — Pages + Layouts

| File | Purpose | LOC |
|---|---|---|
| `src/app/(auth)/layout.tsx` | Centered card layout: `min-h-screen flex items-center justify-center bg-surface p-6`, renders `{children}`. | ~25 |
| `src/app/(auth)/login/page.tsx` | Login form using `useLogin` mutation. On success: `router.push('/dashboard')`. Uses `<GoogleOAuthButton>` + `<Link href="/forgot-password">` + register link. | ~100 |
| `src/app/(auth)/register/page.tsx` | Register form (fullName, email, password, confirmPassword, agreed). On 201 switches to success Card with instructions. | ~110 |
| `src/app/(auth)/forgot-password/page.tsx` | Email input + always-200 success card. | ~60 |
| `src/app/(auth)/reset-password/[token]/page.tsx` | Two password fields; calls `useResetPassword` with token + newPassword. | ~70 |
| `src/app/(auth)/verify-email/[token]/page.tsx` | `'use client'`. useEffect calls `useVerifyEmail.mutate({ token })` once. Shows loading/success/error card. | ~70 |
| `src/app/auth/oauth-success/page.tsx` | **Outside `(auth)` group** (path: `/auth/oauth-success`). Reads `?token=`, sets Bearer, fetches `/auth/me`, then `setAuth` + `router.push('/dashboard')`. | ~60 |

Commit: `feat(web): auth-flow/wave-6 — 6 auth pages + (auth) layout + oauth-success`

## Wave 7 — Glue fixes

| File | Change |
|---|---|
| `src/lib/constants.ts` | `ROUTES.oauthSuccess` → `/auth/oauth-success` (path matches gateway redirect). |
| any stale import checks after reorganization. | — |

Commit: `fix(web): auth-flow/wave-7 — ROUTES.oauthSuccess path + misc`

## Wave 8 — Tests

| File | Tests | LOC |
|---|---|---|
| `tests/unit/auth-schemas.test.ts` | Already committed in Wave 2 (TDD). Remains green. | — |
| `tests/unit/auth-pages/login.test.tsx` | RTL: renders fields, validation errors, submit calls `useLogin` mock. | ~80 |
| `tests/unit/auth-pages/register.test.tsx` | As above for register + zod confirm match. | ~90 |
| `tests/unit/auth-pages/forgot-password.test.tsx` | Email field + success state. | ~60 |
| `tests/unit/auth-guards.test.tsx` | `<AuthGuard>` pushes to `/login` when !auth; renders children when auth. | ~70 |
| `tests/e2e/auth.spec.ts` | Playwright: open `/login`, assert form rendered, type + click login (expect 401 against empty gateway — document expectation). | ~40 |

Commit: `feat(web): auth-flow/wave-8 — auth tests (RTL + Playwright)`

## Integration checklist

- [ ] `ROUTES.oauthSuccess` updated + any caller verified.
- [ ] `queryKeys.auth.me` used by `useMeQuery` and no duplicate string.
- [ ] `<AuthBootstrap />` mounted inside `QueryClientProvider` (needs the
      client for `useMeQuery`).
- [ ] `api/client.ts` interceptor unchanged shape but `tryRefresh` real.
- [ ] Every page has Vietnamese copy + appropriate aria labels.

## Phase 4 → Phase 5 gate map

| Gate | For auth-flow |
|---|---|
| type-check | after each wave |
| lint | after each wave |
| unit tests | wave 2 (schemas), wave 8 (pages+guards) |
| production build | wave 8 (smoke it still builds) |
| /review, /design-review | defer — no new visual surface beyond card form |
| /qa | defer — no full flow against live backend in this session |
| /cso | ⚠️ may re-invoke — touches auth. Decision: include in Phase 5 as reminder. |
