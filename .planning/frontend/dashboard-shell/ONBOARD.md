---
phase: 1
feature_slug: dashboard-shell
tier: large
status: draft
---

# Phase 1 — Codebase Onboarding Report

## 1. FE Folder Structure + Routing Convention

- App Router root: `apps/web/src/app/` (Next.js 14).
- Route group `(auth)` exists: `apps/web/src/app/(auth)/{forgot-password,login,register,reset-password/[token],verify-email/[token]}/*` + `layout.tsx` (pass-through).
- Root `layout.tsx` RSC imports next/font Manrope + Inter (`--font-manrope` + `--font-inter`), wraps `<Providers>`.
- Root `providers.tsx` client boundary: QueryClientProvider + AuthBootstrap + Toaster.
- Root `page.tsx` placeholder landing (smoke-tests tokens + fonts).
- Slug 3 landing zone: `(app)/` route group does **NOT exist yet** → will create `app/(app)/layout.tsx` + `app/(app)/dashboard/page.tsx`.
- Kebab-case directory convention confirmed (`forgot-password/`, not `forgotPassword/`).

## 2. Component Design Pattern

- RSC default (`app/layout.tsx`, `app/page.tsx`). `'use client'` applied to `providers.tsx`, `AuthBootstrap`, all hooks in `@/lib/auth/hooks.ts`.
- shadcn primitives at `apps/web/src/components/ui/`: `badge, button, card, dialog, dropdown-menu, input, label, separator, skeleton, sonner (toast), tabs` — Radix + CVA + MD3 tokens.
- Slug 2 components at `apps/web/src/components/auth/`: `auth-bootstrap, auth-form-shell, auth-form-field, google-oauth-button, resend-verify-link`.
- Kebab-case `.tsx` files, **named exports only** (`export function Foo() {}`).

## 3. Styling Approach

- `apps/web/tailwind.config.ts`:
  - darkMode `["class", '[data-theme="dark"]']` (not wired).
  - MD3 color aliases (primary/surface/on-surface/error/warning/tertiary/sidebar/score), all `rgb(var(--color-x) / <alpha-value>)` pattern.
  - Fonts: `sans: ["var(--font-inter)"]`, `headline: ["var(--font-manrope)"]`.
  - Custom fontSize: display-xl/lg/md, h1-h4, body-lg/body/body-sm, caption, micro.
  - Radii via `--radius-sm` → `--radius-2xl`. Shadows via `--shadow-xs` → `--shadow-xl` + `--shadow-primary`.
- `apps/web/src/styles/tokens.css` → `:root` defines RGB triplets; `[data-theme="dark"]` flips 4 vars.
- **Sidebar dark tokens ALREADY available**: `--color-sidebar-bg` (15 23 42 slate-900), `--color-sidebar-bg-active` (0 82 255 primary), `--color-sidebar-text` (148 163 184 slate-400), `--color-sidebar-text-hover` (255 255 255), `--color-sidebar-text-active` (255 255 255).
- Score classification tokens: excellent/good/fair/poor = emerald-500/blue-500/amber-500/red-500.
- `cn()` util at `apps/web/src/lib/utils/cn.ts` (clsx + tailwind-merge).
- next/font Google: subsets `["latin", "vietnamese"]` both Inter & Manrope, display swap.

## 4. API Client Pattern

- `apps/web/src/lib/api/client.ts`: ky wrapper with `prefixUrl: API_URL`, `credentials: 'include'`.
  - `beforeRequest` hook: attaches `Authorization: Bearer <accessToken>` from Zustand.
  - `afterResponse` on 401 (skip /auth/refresh path): calls `tryRefresh()` single-flight, replays on success, clears auth on fail.
  - `refreshInFlight` promise prevents concurrent refresh calls.
- `apps/web/src/lib/api/auth.ts`: thin typed functions — `registerFn, loginFn, logoutFn, meFn, verifyEmailFn, forgotPasswordFn, resetPasswordFn`. No error handling in wrappers.
- Error mapping in `apps/web/src/lib/auth/mutations.ts` → `describeError(err)` maps HTTPError → Vietnamese toast strings.
- Mutation composition pattern (critical, bug-fixed in 0cb8acd):
  ```ts
  return useMutation({
    mutationFn: loginFn,
    ...extras,                            // spread FIRST
    onSuccess: (...args) => {
      // default: setAuth + queryCache update
      (extras?.onSuccess)?.(...args);     // call extras AFTER default
    },
    onError: (...args) => {
      // default: toast error
      (extras?.onError)?.(...args);
    },
  });
  ```
- TanStack Query `providers.tsx`: `staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`.

## 5. State Management

- Zustand store `apps/web/src/lib/auth/store.ts`:
  - Shape: `{ user, accessToken, setAuth, clearAuth, isAuthenticated, isAdmin }`.
  - In-memory only (no localStorage per XSS policy 30 §5.3).
- Selector hook pattern: `const user = useAuthStore((s) => s.user);`.
- `useAuth()` wrapper in `apps/web/src/lib/auth/hooks.ts` returns `{ user, accessToken, isAuthenticated, isAdmin }`.
- URL state: `next/navigation` `useSearchParams` + `useRouter`.
- **No persistence layer yet** — slug 3 will add localStorage for sidebar collapse.

## 6. Realtime Pattern

- Socket.IO singleton at `apps/web/src/lib/ws/client.ts`:
  - Lazy init, reconnection exp-backoff 1s→10s × 10 attempts, JWT in `handshake.auth.token`, transports `["websocket","polling"]`, `autoConnect: false`.
- Event shape (future slug 5):
  - Emit: `audit:subscribe`, `audit:unsubscribe`.
  - Listen: `audit:progress`, `audit:completed`, `audit:failed`.
- **Slug 3 does NOT consume WS** — infra dormant until slug 5.

## 7. Available Gateway HTTP Endpoints

**Primary consumed by slug 3:**

- `GET /audits` — **ListAuditsQuery**: `page=1, limit=20, sort=createdAt|seoScore, order=asc|desc, search?, status?, scoreMin?, scoreMax?, dateFrom?, dateTo?`.
- **Response item shape** (CRITICAL correction — field is `seoScore` not `score`):
  ```ts
  {
    id: string (UUID),
    url: string,
    domain: string,
    status: AuditStatus,            // PENDING|CRAWLING|ANALYZING|REPORTING|COMPLETED|FAILED
    seoScore: number | null,
    targetKeyword: string | null,
    crawlerType: string | null,
    crawlDurationMs: number | null,
    createdAt: Date,
    completedAt: Date | null,
  }
  ```
- `POST /auth/logout`, `GET /auth/me` — consumed slug 2, confirmed.

**Full endpoint inventory** (for future slugs):

- `/auth`: register, login, refresh, logout, me, verify-email, forgot-password, reset-password, google, google/callback.
- `/audits`: POST(create), GET(list), GET(detail), GET(:id/status), GET(:id/export, 302), POST(:id/share), DELETE(:id/share), DELETE(:id), GET(compare?audit1&audit2).
- `/users`: PATCH(profile), PATCH(password).
- `/admin` (JWT+ADMIN): GET(users), PATCH(users/:id), GET(rules), PUT(rules), GET(stats?period=30d).
- `/shared`: GET(audits/:token) public via share token.
- `/health`: GET — `{status, version, uptime, services:{database,redis,crawler,analyzer,report}}`.
- `/scheduled-audits` (JWT): POST, GET(list), GET(:id), PATCH(:id/pause), PATCH(:id/resume), DELETE(:id).

## 8. Available Gateway WebSocket Events

`/ws` Socket.IO namespace:

- Emits to room `audit:<id>`: `audit:progress`, `audit:completed`, `audit:failed`.
- Accepts: `audit:subscribe { auditId }`, `audit:unsubscribe { auditId }`.
- Auth: JWT in handshake.auth.token or Authorization header.
- Source: `ProgressSubscriberService` re-emits from Redis channels `audit.progress/audit.completed/audit.failed`.

**Slug 3 does NOT consume.** Listed for completeness.

## 9. Available Proto RPCs

Slug 3 has **no proto impact**. Inventory for future slugs:

- CrawlerService: `CrawlUrl`, `HealthCheck`.
- SeoAnalyzerService: `AnalyzePage`, `ListRules`, `UpdateRuleWeight`, `GetRulesByCategory`, `HealthCheck`.
- KeywordAnalyzerService: `AnalyzeKeywords`, `HealthCheck`.
- ReportService: `GenerateReport`, `GetReport`, `CompareReports`, `CreateShareLink`, `GetSharedReport`, `RevokeShareLink`, `GeneratePdf`, `HealthCheck`.
- Common enums: `AuditStatus, CheckStatus, IssueCategory`. Messages: `CoreWebVitals, ImageInfo, LinkInfo`.

## 10. Naming Conventions

- Files: kebab-case `.tsx` (e.g. `auth-bootstrap.tsx`).
- Tests: `.test.tsx` (Vitest).
- Directories:
  ```
  apps/web/src/
  ├── app/
  │   ├── (auth)/                 ← slug 2
  │   ├── (app)/                  ← slug 3 target
  │   ├── layout.tsx, providers.tsx, globals.css, page.tsx, error.tsx
  ├── components/
  │   ├── ui/                     ← shadcn primitives
  │   ├── auth/                   ← slug 2
  │   ├── dashboard/              ← slug 3 target
  │   ├── layout/                 ← slug 3 target
  │   └── common/                 ← slug 3 target
  ├── lib/
  │   ├── api/{client,auth,types}.ts
  │   ├── auth/{store,schemas,mutations,hooks,guard}.{ts,tsx}
  │   ├── queries/keys.ts
  │   ├── utils/{cn,format}.ts
  │   ├── ws/client.ts
  │   └── constants.ts
  ├── styles/tokens.css
  └── types/
  ```
- Enum/type: PascalCase.
- Constants: UPPER_SNAKE_CASE (ROUTES, API_URL, JWT_CONFIG).
- Hooks: camelCase prefixed `use` (useAuth, useLogin, useLogout).

## Deltas vs DESIGN.md (correcting assumptions)

1. **AuditListItem field name**: DESIGN.md says `score`; actual endpoint returns **`seoScore`**. Correct in MAPPING.md and source files.
2. **Sidebar dark tokens already shipped** in `tokens.css` → sidebar can use `bg-sidebar-bg`, `text-sidebar-text`, `bg-sidebar-bg-active`, `text-sidebar-text-active` class utilities (no inline slate-900).
3. **Score classification tokens** available → score gauge can use `text-excellent / text-good / text-fair / text-poor` (no ad-hoc classifyColorClass function).
4. **Font variable names**: `var(--font-inter)` + `var(--font-manrope)` (already in Tailwind config under `sans` + `headline`) → use Tailwind utilities `font-sans` + `font-headline` directly.
