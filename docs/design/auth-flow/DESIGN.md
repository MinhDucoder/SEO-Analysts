---
type: design
feature_slug: auth-flow
date: 2026-04-18
status: approved
tier: large
source: extracted from docs/design/30-frontend-architecture.md §5 + §6 + 31-page-specs.md §2-7
---

# Auth Flow — Technical Design

## Architecture overview

Auth is layered on top of `web-bootstrap`:

```
┌ (auth) route group ────────────────────────────────────────┐
│  Layout: centered Card + logo                              │
│  ┌────────────┬──────────────┬─────────────────┬────────┐ │
│  │ /login     │ /register    │ /forgot-password│ /reset │ │
│  │            │              │                 │-pass   │ │
│  │ /verify-email/[token]     │ /oauth-success  │        │ │
│  └────────────┴──────────────┴─────────────────┴────────┘ │
└────────────────────────────────────────────────────────────┘
        │                  │
        ▼                  ▼
   RHF + zod           TanStack Query mutation
   schema             (lib/auth/mutations.ts)
        │                  │
        └────────┬─────────┘
                 ▼
         api.post('auth/*', { json })
                 │
                 ├── 200: setAuth(user, accessToken)
                 ├── 401: tryRefresh → replay OR clearAuth
                 └── 4xx: throw HTTPError → caller toast

Providers wrap: <AuthBootstrap />
   ├── mount once
   ├── call tryRefresh() if !accessToken
   └── hydrate auth store before children render
```

## Folder structure (delta from slug 1)

```
apps/web/src/
├── app/
│   ├── (auth)/                           ← NEW route group
│   │   ├── layout.tsx                    ← Centered card + logo
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/[token]/page.tsx
│   │   ├── verify-email/[token]/page.tsx
│   │   └── oauth-success/page.tsx
│   └── providers.tsx                     ← MODIFIED (add <AuthBootstrap />)
├── components/
│   └── auth/                             ← NEW
│       ├── auth-bootstrap.tsx            ← 'use client'; boots refresh once
│       ├── auth-form-shell.tsx           ← Shared form wrapper (title + children + footer)
│       ├── google-oauth-button.tsx       ← Outline + G icon + href
│       ├── password-strength.tsx         ← Optional: live strength hint
│       └── resend-verify-link.tsx        ← Reusable CTA for error panels
├── lib/
│   ├── api/
│   │   ├── client.ts                     ← MODIFIED (real tryRefresh)
│   │   └── auth.ts                       ← NEW: login/register/verify/forgot/reset/me/logout/refresh
│   ├── auth/
│   │   ├── store.ts                      ← UNCHANGED (already final shape in slug 1)
│   │   ├── schemas.ts                    ← NEW (zod schemas)
│   │   ├── mutations.ts                  ← NEW (useLogin, useRegister, …)
│   │   ├── hooks.ts                      ← NEW (useAuth, useLogout, useAuthBootstrap)
│   │   └── guard.tsx                     ← NEW (<AuthGuard>, <AdminGuard>)
│   └── queries/
│       └── keys.ts                       ← MODIFIED (populate auth.me)
└── tests/
    └── unit/
        ├── auth-schemas.test.ts          ← zod schema validation cases
        ├── auth-mutations.test.tsx       ← MSW-mocked mutation behavior
        └── auth-pages/*.test.tsx         ← 6 page-level RTL tests
```

## Components

### `<AuthFormShell>` (RSC-safe wrapper)

- Props: `{ title: string; description?: string; children: ReactNode; footer?: ReactNode }`
- Renders Card (outline variant, max-w-md) with logo top + title + description
  + form slot + footer slot (for "Chưa có tài khoản?" links etc.).

### `<GoogleOAuthButton>` (client)

- Props: `{ label?: string }` (default "Đăng nhập với Google")
- Renders `<Button variant="outline" size="lg">` with lucide `<Chrome>` icon
  (proxy for Google G) + label.
- onClick: `window.location.href = `${API_URL.replace(/\/api\/v1$/, '')}/auth/google``
  (auth endpoints are outside the `/api/v1` prefix based on gateway).

### `<AuthBootstrap>` (client)

- `useEffect(() => { if (!accessToken) { tryRefresh().then(token => { if (token) { fetch /auth/me } }) } }, [])`
- Returns null — side-effect only.
- Placed inside Providers BEFORE `{children}` so every page mounts with
  auth hydrated (or confirmed guest).

### `<AuthGuard>` (client)

- Reads auth store.
- If `!isAuthenticated`: push to `/login`, render FullpageSkeleton.
- Else: render children.
- Used by `(app)` route group layouts in future slugs.

### Form pages

Each form page follows the same pattern:

```tsx
'use client';
const form = useForm<T>({ resolver: zodResolver(schema), defaultValues: {...} });
const mutation = useLogin() /* or useRegister, … */;

const onSubmit = form.handleSubmit(async (values) => {
  try {
    await mutation.mutateAsync(values);
  } catch (e) { /* toast via mutation onError */ }
});

return (
  <AuthFormShell title="…" footer={<Link href="/register">…</Link>}>
    <form onSubmit={onSubmit} className="space-y-4">
      <Field name="email" label="Email" />
      <Field name="password" label="Mật khẩu" type="password" />
      <Button type="submit" loading={mutation.isPending}>Đăng nhập</Button>
    </form>
  </AuthFormShell>
);
```

## Data flow

### Login

```
User submits LoginDto
  → zod validate
  → useLogin mutation.mutateAsync(values)
  → api.post('auth/login', { json: values })
  → on 200:
       useAuthStore.setAuth(user, accessToken)
       queryClient.setQueryData(['auth','me'], user)
       router.push('/dashboard')
  → on 401: onError → toast('Email hoặc mật khẩu không đúng')
  → on 403 unverified: onError → toast + show <ResendVerifyLink email={values.email} />
  → on 429: onError → toast('Thử lại sau {retry} giây')
```

### Boot refresh

```
AuthBootstrap mount
  → if useAuthStore.getState().accessToken: skip (already hydrated)
  → else: tryRefresh()
            → POST /auth/refresh (cookie only)
            → on 200: setAuth(me fetched with new token)
            → on 401: no-op (guest)
```

### 401 auto-refresh (client interceptor)

```
api.afterResponse on 401:
  if url contains /auth/refresh: return response (avoid loop)
  newToken = await tryRefresh()
  if newToken:
    useAuthStore.setState({ accessToken: newToken })
    replay request with new Bearer
  else:
    useAuthStore.clearAuth()
    window.location.assign('/login')
```

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/login` | GET | Centered login form |
| `/register` | GET | Centered register form |
| `/forgot-password` | GET | Email input |
| `/reset-password/[token]` | GET | New password + confirm |
| `/verify-email/[token]` | GET | Auto-verifies on mount |
| `/oauth-success` | GET | Reads `?token=` and hydrates auth |

## States (per form)

- **loading**: submit button shows spinner, form fields disabled.
- **empty**: pristine form at mount.
- **error**: inline field errors from RHF + global banner for 401/403/429.
- **success**: redirect or show success Card (register, verify, forgot).

## API endpoints consumed

All under `/api/v1/auth` except `/auth/google*` (OAuth redirect).

| Method | Endpoint | Mutation hook | Notes |
|---|---|---|---|
| POST | `/auth/register` | `useRegister` | 201 returns `{ user, accessToken }` |
| POST | `/auth/login` | `useLogin` | 200 + sets cookie |
| POST | `/auth/refresh` | internal `tryRefresh()` | Cookie only, returns `{ accessToken }` |
| POST | `/auth/logout` | `useLogout` | Clears cookie |
| GET | `/auth/me` | `useMeQuery` | Attached to query key `auth.me` |
| POST | `/auth/verify-email` | `useVerifyEmail` | Auto-mount in page |
| POST | `/auth/forgot-password` | `useForgotPassword` | Idempotent 200 |
| POST | `/auth/reset-password` | `useResetPassword` | Redirects to `/login` on success |
| GET | `/auth/google` | browser redirect | No mutation |
| GET | `/auth/google/callback` | gateway-handled | Never called from client |

## WebSocket events consumed

**None.** Auth pages don't open a socket.

## Proto impact

**none.**

## Decisions log

| Decision | Choice | Reason |
|---|---|---|
| Form lib | `react-hook-form` + `@hookform/resolvers/zod` | Already installed. Shared schemas with @repo/shared-safe. |
| Error display | Field-level (RHF) + toast (global) | Matches 31-page-specs.md §2 "inline error + toast" pattern. |
| Refresh trigger | On app mount AND on 401 response | Covers both tab-reopen and mid-session expiry. |
| OAuth popup vs redirect | Full redirect | Simpler; no postMessage; gateway already routes to `/oauth-success`. |
| Password confirm field | Client-only | Gateway doesn't validate confirm; zod `refine` handles it. |
| Remember-me | Hidden | Cookie is 30d fixed; toggle would be cosmetic. |

## Open technical questions

- Should `<AuthBootstrap>` show a full-page skeleton during the refresh
  round-trip? **Decision**: NO — unauthenticated-accessible pages (landing,
  auth) should render immediately; `<AuthGuard>` handles the case for
  protected pages.
- Does `POST /auth/logout` require a body? Per
  [auth.controller.ts:92-99](../../../apps/gateway/src/auth/controllers/auth.controller.ts#L92-L99)
  → no; it reads the cookie.
