---
type: prd
feature_slug: auth-flow
date: 2026-04-18
status: approved
tier: large
source: extracted from docs/design/31-page-specs.md §2-7 + 30-frontend-architecture.md §5
---

# Auth Flow — Product Requirements

## Problem

Web-bootstrap (slug 1) ships stubs for `tryRefresh()`, `useAuthStore`, and the
`(auth)` route group is empty. Nothing works end-to-end yet: no user can sign
in, no API call attaches a real Bearer, no page is guarded.

Slug `auth-flow` wires the 6 public auth pages against the gateway's auth
controller ([apps/gateway/src/auth/controllers/auth.controller.ts](../../../apps/gateway/src/auth/controllers/auth.controller.ts)) and
turns the scaffolded stubs into real behavior: auth store hydration on app
boot, 401→refresh→retry interceptor, `<AuthGuard>` / `<AdminGuard>` wrappers,
and Zustand-persisted access token.

## User stories

- **Register** — A new visitor fills `/register` (fullName, email, password,
  confirm, agree-terms), submits → receives verify email → lands on a success
  card with instructions.
- **Verify email** — User opens `/verify-email/:token` from the email → auto-
  verifies → sees success + "Đăng nhập" CTA.
- **Login** — Existing user fills `/login` (email, password) → redirected to
  `/dashboard`. "Quên mật khẩu?" and "Đăng ký" links present.
- **Forgot password** — User enters email at `/forgot-password` → always sees
  "email đã gửi" (no leak about whether the account exists).
- **Reset password** — User clicks emailed link → `/reset-password/:token` →
  submits new password → redirected to `/login` with success toast.
- **Google OAuth** — Button on `/login` and `/register` opens
  `gateway/auth/google` → after callback, gateway redirects to
  `/oauth-success?token=<jwt>` → client reads query, fetches `/auth/me`,
  stores auth, redirects to `/dashboard`.
- **Token refresh on boot** — On every page mount, the client attempts a
  silent `POST /auth/refresh` (using the HTTP-only `refresh_token` cookie);
  if successful, the auth store is hydrated before any authenticated UI
  renders.
- **401 auto-refresh** — Any API call returning 401 triggers a single refresh
  attempt; on success the original request is replayed, on failure the store
  is cleared and the user is sent to `/login`.
- **Guard** — A `<AuthGuard>` wrapper redirects to `/login` when not
  authenticated. `<AdminGuard>` (stub for now) renders a `NotAuthorized` card
  when `role !== 'admin'`.
- **Logout** — Any auth'd page can call `logout()` → gateway clears the
  cookie → client clears the store → redirect to `/login`.

## Acceptance criteria

1. `apps/web/src/app/(auth)/layout.tsx` renders a centered Card (max-w 400px)
   with the wordmark logo on top, child form below, no sidebar.
2. `/login` page (`src/app/(auth)/login/page.tsx`) uses RHF + zod; submits
   `POST /auth/login`; on 200 stores auth + redirects to `/dashboard`; on 401
   shows "Email hoặc mật khẩu không đúng"; on 403 not-verified shows a
   "Gửi lại email verify" inline action; on 429 rate-limit shows countdown;
   has "Đăng nhập với Google" + "Quên mật khẩu?" + "Đăng ký" links.
3. `/register` page with full zod schema (fullName min 2, email, password
   min 8, confirmPassword matches, agreed === true); submits
   `POST /auth/register`; on 201 shows success card "Đã gửi email verify tới
   {email}"; on 409 shows "Email đã được đăng ký".
4. `/verify-email/[token]` auto-calls `POST /auth/verify-email { token }` on
   mount; shows loading → success (with "Đăng nhập" CTA) or error (with
   "Gửi lại email verify" CTA that re-invokes `/auth/forgot-password`).
5. `/forgot-password` submits `POST /auth/forgot-password { email }`; always
   shows "Nếu email tồn tại, link reset sẽ được gửi" regardless of response.
6. `/reset-password/[token]` submits `POST /auth/reset-password { token,
   newPassword }`; on 200 redirects to `/login` with toast "Đã đặt lại mật
   khẩu"; on 400 shows "Link không hợp lệ hoặc đã hết hạn".
7. `/oauth-success` page reads `?token=<jwt>` param → calls
   `GET /auth/me` with Bearer → stores auth → redirects to `/dashboard`.
8. `src/lib/api/client.ts` real `tryRefresh()`: `POST /auth/refresh` with
   `credentials: 'include'`; on success returns `accessToken`, on failure
   returns `null`.
9. `src/lib/auth/hooks.ts` exports `useAuth()` (user + isAuthenticated +
   isAdmin), `useLogout()` (mutation calls `POST /auth/logout` + clears store
   + redirects), `useAuthBootstrap()` (calls `tryRefresh()` on app mount if
   not already authenticated).
10. `src/lib/auth/guard.tsx` exports `<AuthGuard>` (redirects to `/login` if
    not authenticated, renders skeleton while checking) + `<AdminGuard>`
    (renders `NotAuthorized` if not admin).
11. `src/lib/queries/keys.ts` populates `queryKeys.auth = { me: ['auth','me'] }`.
12. `src/app/providers.tsx` gains an `<AuthBootstrap />` client component
    that calls `useAuthBootstrap()` once on mount, before children render.
13. RHF + zod schemas live in `src/lib/auth/schemas.ts` (loginSchema,
    registerSchema, forgotPasswordSchema, resetPasswordSchema) — exported
    types available for reuse by admin/settings slugs later.
14. All 6 pages plus the layout render unit-test smoke green (RTL) and at
    least one happy-path E2E (`/login → /dashboard` after mocked 200).
15. All 6 pages are fully Vietnamese-localized (no English string leak).
16. Submitting any form disables the submit button while the mutation is
    pending and shows a spinner.

## Out of scope

- Session management page (revoke refresh tokens). Deferred to slug 8 settings.
- 2FA / TOTP. Not in project scope.
- Email re-verify endpoint. Gateway doesn't have one yet; UI uses
  `/auth/forgot-password` as a temporary resend vector per [31-page-specs.md
  §4](../../../docs/design/31-page-specs.md).
- Account deletion. Backend endpoint missing — deferred.
- Social providers other than Google.
- Audit-specific redirects (e.g., deep-link to a protected audit then bounce
  back post-login). Slug 4 can add a `?next=` param.

## Open questions

- **Rate-limit countdown UX**: the gateway returns `Retry-After` header on
  429 — do we display a live-counting Vietnamese label or a plain message?
  **Decision**: plain "Thử lại sau X giây" parsed once from header; no live
  tick (avoids setInterval noise).
- **Remember-me toggle**: mockup has one but gateway's refresh cookie is
  fixed 30-day TTL. **Decision**: hide the toggle (cookie-controlled).
- **Google OAuth button styling**: Google's brand guidelines require their
  logo + white bg. **Decision**: use `outline` variant with Google G icon
  from lucide-react (not the colored SVG — acceptable for dev, can upgrade
  later).

## Success metrics

- `npm run test --filter=web` → 100% pass including new auth tests.
- `npm run build --filter=@seo/web` → still succeeds, First Load JS for
  `/login` < 110 KB gzipped (adds zod + rhf ≈ 20 KB).
- End-to-end flow (register → verify → login → dashboard) completes in
  under 8 seconds locally against `docker:up` gateway.
