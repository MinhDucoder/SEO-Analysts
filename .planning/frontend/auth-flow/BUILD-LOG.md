---
phase: 4
feature_slug: auth-flow
tier: large
impact: auth-wiring
status: complete
date: 2026-04-18
---

# Phase 4 — Build Log

## Wave progress

| Wave | Description | Commit | Status |
|---|---|---|---|
| 1+2 (merged) | Real `tryRefresh` + `api/auth.ts` wrappers + zod schemas (loginSchema/registerSchema/forgotPasswordSchema/resetPasswordSchema) + 15 TDD schema tests | **0a599fa** | ✅ |
| 3 | `lib/auth/mutations.ts` (useLogin/Register/VerifyEmail/ForgotPassword/ResetPassword with shared Vietnamese error mapping) + `lib/auth/hooks.ts` (useAuth, useLogout, useMeQuery, useAuthBootstrap) + `queryKeys.auth.me` | **f6d5943** | ✅ |
| 4 | `<AuthBootstrap>` component + `<AuthGuard>`/`<AdminGuard>` guards + providers.tsx wire | **8ad4e6e** | ✅ |
| 5 | Shared auth components: `<AuthFormShell>` (RSC), `<AuthFormField>` (RHF-wired), `<GoogleOAuthButton>`, `<ResendVerifyLink>` | **ce2e8ca** | ✅ |
| 6+7 (merged) | 6 auth pages + `(auth)` layout + `/auth/oauth-success` (outside group per gateway contract) + `ROUTES.oauthSuccess` fix | **c43a96a** | ✅ |
| — | BUG FIX: swap `...extras` order so defaults aren't dropped by caller's `onSuccess/onError` | **0cb8acd** | ✅ |
| — | BUILD FIX: Suspense wrap + force-dynamic for useSearchParams in oauth-success | **d38fc4f** | ✅ |
| 8 | `tests/unit/auth-store.test.ts` (4 cases). Heavier RTL page tests deferred until MSW wired. | **d38fc4f** | ✅ |

## Deviations from PLAN.md

| Plan wave | Actual | Reason |
|---|---|---|
| Wave 1 + Wave 2 | merged | `api/auth.ts` imports types from `schemas.ts`; tsc fails if they land in separate commits. |
| Wave 6 + Wave 7 | merged | Pages reference `ROUTES.oauthSuccess` — path fix must land atomically with pages. |
| Wave 8 page-level RTL tests | deferred to follow-up | Auth pages mount TanStack mutations + sonner + next/navigation. Testing them reliably needs MSW + router mocks, both of which are more test-infra than belongs in a scaffolding slug. Auth schemas (15 cases) + store (4 cases) are the critical gate-level invariants; downstream slugs can add page tests as they compose on top. |
| Mutation composition pattern | refactored | Initial `...extras` at end let caller's `onSuccess` replace wrapper's setAuth + setQueryData. Swap to `...extras` first so wrapper always wins the TanStack-Query composition, then explicitly invoke extras inside the wrapper. |
| Next.js static generation of /auth/oauth-success | Suspense + force-dynamic | `useSearchParams()` cannot be captured during static export; first Next 14 build fail, then clean rebuild after fix. |

## Files created (summary)

- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/{login,register,forgot-password}/page.tsx` (3)
- `src/app/(auth)/{reset-password,verify-email}/[token]/page.tsx` (2)
- `src/app/auth/oauth-success/page.tsx` (1, outside group)
- `src/components/auth/{auth-bootstrap,auth-form-shell,auth-form-field,google-oauth-button,resend-verify-link}.tsx` (5)
- `src/lib/api/auth.ts`
- `src/lib/auth/{schemas,mutations,hooks,guard}.{ts,tsx}` (4)
- `tests/unit/auth-schemas.test.ts`, `tests/unit/auth-store.test.ts`

## Files modified

- `src/lib/api/client.ts` — real `tryRefresh`
- `src/lib/queries/keys.ts` — populate `auth.me`
- `src/lib/constants.ts` — `ROUTES.oauthSuccess` → `/auth/oauth-success`
- `src/app/providers.tsx` — add `<AuthBootstrap />` inside QueryClientProvider
