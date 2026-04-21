---
phase: 2
feature_slug: auth-flow
tier: large
impact: auth-wiring
status: approved
date: 2026-04-18
---

# Phase 2 — Feature-to-Code Mapping

## Pages to create / modify

| Page | Path | Status | Notes |
|---|---|---|---|
| Auth layout | [apps/web/src/app/(auth)/layout.tsx](../../../apps/web/src/app/(auth)/layout.tsx) | NEW | Centered Card with logo. Wraps 5 of 6 auth pages. |
| Login | [(auth)/login/page.tsx](../../../apps/web/src/app/(auth)/login/page.tsx) | NEW | Exposed URL `/login`. Route group hides `(auth)`. |
| Register | [(auth)/register/page.tsx](../../../apps/web/src/app/(auth)/register/page.tsx) | NEW | URL `/register`. |
| Forgot password | [(auth)/forgot-password/page.tsx](../../../apps/web/src/app/(auth)/forgot-password/page.tsx) | NEW | URL `/forgot-password`. |
| Reset password | [(auth)/reset-password/[token]/page.tsx](../../../apps/web/src/app/(auth)/reset-password/[token]/page.tsx) | NEW | URL `/reset-password/:token`. |
| Verify email | [(auth)/verify-email/[token]/page.tsx](../../../apps/web/src/app/(auth)/verify-email/[token]/page.tsx) | NEW | URL `/verify-email/:token`. |
| OAuth success | [apps/web/src/app/auth/oauth-success/page.tsx](../../../apps/web/src/app/auth/oauth-success/page.tsx) | NEW | URL `/auth/oauth-success` — **lives OUTSIDE the `(auth)` group** because gateway hard-codes this path in [auth.controller.ts:148-149](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L148-L149): `res.redirect(${FRONTEND_URL}/auth/oauth-success?token=...)`. Renders minimal skeleton while fetching `/auth/me`. |
| Providers (modify) | [apps/web/src/app/providers.tsx](../../../apps/web/src/app/providers.tsx) | MODIFY | Add `<AuthBootstrap />` child before `{children}`. |

### ⚠️ Discovery from Phase 1

Gateway redirect path is `/auth/oauth-success` (with `/auth/` prefix), but
[docs/design/31-page-specs.md §7](../../../docs/design/31-page-specs.md) and
slug 1's `constants.ts` use `/oauth-success` (no prefix). Fix in this slug:

- Route file lives at `src/app/auth/oauth-success/page.tsx` (literal folder
  segment, NOT a route group).
- `ROUTES.oauthSuccess` in `src/lib/constants.ts` updated from
  `/oauth-success` → `/auth/oauth-success`.

## Components to create / reuse

### CREATE — under `apps/web/src/components/auth/`

| Component | File | Purpose |
|---|---|---|
| `<AuthBootstrap>` | `auth-bootstrap.tsx` | `'use client'` effect: runs `tryRefresh()` once on mount if no token. |
| `<AuthFormShell>` | `auth-form-shell.tsx` | RSC shell for auth pages (logo + title + description + slot + footer). |
| `<GoogleOAuthButton>` | `google-oauth-button.tsx` | Outline button with lucide `<Chrome>` icon redirecting to gateway `/auth/google`. |
| `<ResendVerifyLink>` | `resend-verify-link.tsx` | Button triggering `/auth/forgot-password` as a stand-in for a missing resend-verify endpoint. |
| `<FormField>` | `auth-form-field.tsx` | RHF-adapted Label + Input + error slot. |

### CREATE — lib modules under `apps/web/src/lib/`

| Module | File | Exports |
|---|---|---|
| API | `api/auth.ts` | `registerFn`, `loginFn`, `refreshFn`, `logoutFn`, `meFn`, `verifyEmailFn`, `forgotPasswordFn`, `resetPasswordFn` |
| Schemas | `auth/schemas.ts` | `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema` + inferred types |
| Mutations | `auth/mutations.ts` | `useLogin`, `useRegister`, `useVerifyEmail`, `useForgotPassword`, `useResetPassword` — each composes the matching `*Fn` with shared `onError` toast. |
| Hooks | `auth/hooks.ts` | `useAuth()`, `useLogout()`, `useAuthBootstrap()`, `useMeQuery()` |
| Guards | `auth/guard.tsx` | `<AuthGuard>`, `<AdminGuard>` |

### MODIFY

| File | Change |
|---|---|
| `src/app/providers.tsx` | Wrap children with `<AuthBootstrap />` (side-effect only). |
| `src/lib/api/client.ts` | Real `tryRefresh()` implementation (was a stub returning null). |
| `src/lib/queries/keys.ts` | Populate `queryKeys.auth = { me: ['auth','me'] as const }`. |
| `src/lib/constants.ts` | `ROUTES.oauthSuccess = '/auth/oauth-success'` (fix from discovery). |

### REUSE

| Module | Path |
|---|---|
| `<Button>`, `<Input>`, `<Label>`, `<Card>` | [apps/web/src/components/ui/](../../../apps/web/src/components/ui/) |
| `useAuthStore` | [apps/web/src/lib/auth/store.ts](../../../apps/web/src/lib/auth/store.ts) — shape already final |
| `api` (ky instance) | [apps/web/src/lib/api/client.ts](../../../apps/web/src/lib/api/client.ts) |
| `AuthenticatedUser`, `AuthSession`, `ApiErrorBody` | [apps/web/src/lib/api/types.ts](../../../apps/web/src/lib/api/types.ts) |

## API endpoints

All EXIST in gateway ([auth.controller.ts](../../../apps/gateway/src/auth/controllers/auth.controller.ts)):

| Method | Path | Hook | Status |
|---|---|---|---|
| POST | `/auth/register` | `useRegister` | EXISTS (line 60-64) |
| POST | `/auth/login` | `useLogin` | EXISTS (line 68-74) |
| POST | `/auth/refresh` | internal `tryRefresh` | EXISTS (line 78-87) |
| POST | `/auth/logout` | `useLogout` | EXISTS (line 92-99) |
| GET | `/auth/me` | `useMeQuery` | EXISTS (line 104-107) |
| POST | `/auth/verify-email` | `useVerifyEmail` | EXISTS (line 112-115) |
| POST | `/auth/forgot-password` | `useForgotPassword` | EXISTS (line 119-123) |
| POST | `/auth/reset-password` | `useResetPassword` | EXISTS (line 127-131) |
| GET | `/auth/google` | browser redirect | EXISTS (line 136-139) |
| GET | `/auth/google/callback` | gateway-side | EXISTS (line 143-150) |

→ **NO MISSING backend.**

## WebSocket events

None consumed by this slug.

## Proto impact

**none.**

## Tier escalation decision

- Touches authentication: ✅ → already Large from Phase 0. No further escalation.
- No proto/BullMQ change.
- No MISSING backend.

→ **Tier remains: large**
→ **Impact remains: auth-wiring**
→ **No HALT.** Proceed to Phase 3.
