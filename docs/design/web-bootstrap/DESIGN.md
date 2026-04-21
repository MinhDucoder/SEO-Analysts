---
type: design
feature_slug: web-bootstrap
date: 2026-04-18
status: approved
tier: large
source: extracted from docs/design/30-frontend-architecture.md + 32-design-system.md + 33-realtime-ux.md
---

# Web Bootstrap — Technical Design

## Architecture overview

`web-bootstrap` thiết lập **monorepo workspace mới** `apps/web` (Next.js 14 App Router) cùng với các module hạ tầng client-side mà mọi slug FE sau (auth, dashboard, audits, admin, settings, public) sẽ consume. Sau khi xong, repo có:

```
apps/
├── gateway/              (đã có)
├── crawler/              (đã có)
├── seo-analyzer/         (đã có)
├── keyword-analyzer/     (đã có)
├── report/               (đã có)
└── web/                  ← MỚI
packages/
├── proto/, shared/, ui/, typescript-config/, eslint-config/   (đã có)
```

`apps/web/` không thay đổi backend/proto/shared. Chỉ consume types từ `@repo/shared`.

## Folder structure

```
apps/web/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json                        # extends @repo/typescript-config/nextjs.json
├── components.json                      # shadcn config
├── .env.example
├── .gitignore
├── public/
│   ├── favicon.ico                      # placeholder
│   └── logo.svg                         # placeholder wordmark
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root: html lang="vi", fonts, providers, metadata
│   │   ├── providers.tsx                # 'use client' — QueryClient + Toast + ThemeProvider stub
│   │   ├── page.tsx                     # Placeholder "SEO Analyst — đang xây dựng"
│   │   ├── globals.css                  # Tailwind base + tokens.css import + font reset
│   │   └── error.tsx                    # Global error boundary placeholder
│   ├── components/
│   │   └── ui/                          # shadcn primitives
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── tabs.tsx
│   │       └── sonner.tsx               # Toast wrapper
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                # ky instance + interceptor
│   │   │   └── types.ts                 # re-export from @repo/shared
│   │   ├── ws/
│   │   │   └── client.ts                # Socket.IO singleton
│   │   ├── auth/
│   │   │   └── store.ts                 # Zustand shell (stub)
│   │   ├── queries/
│   │   │   └── keys.ts                  # Centralized factory (empty starter)
│   │   ├── utils/
│   │   │   ├── cn.ts                    # clsx + twMerge
│   │   │   └── format.ts                # date/score/duration helpers stub
│   │   └── constants.ts                 # Route paths, app metadata
│   ├── styles/
│   │   └── tokens.css                   # CSS variables (color/radius/shadow)
│   └── types/
│       └── global.d.ts
├── tests/
│   ├── unit/
│   │   └── smoke.test.tsx               # Vitest: layout renders without throw
│   ├── e2e/
│   │   └── landing.spec.ts              # Playwright: GET / sees "SEO Analyst"
│   └── setup.ts                         # Vitest setup (jsdom, RTL)
├── vitest.config.ts
└── playwright.config.ts
```

## Components (per file scope)

### Files **created** (apps/web)

| File | Purpose | Approx LOC | Key exports / contents |
|---|---|---|---|
| `package.json` | Workspace manifest | 60 | scripts: dev (port 3001), build, start, lint, test, test:e2e, type-check |
| `next.config.mjs` | Next config | 25 | reactStrictMode, images.domains, transpilePackages: ['@repo/shared','@repo/ui'] |
| `tailwind.config.ts` | Tailwind config | 90 | content scan, theme.extend (color via CSS vars, fontFamily, fontSize scale §3.2, spacing, borderRadius, boxShadow), darkMode: 'class' |
| `postcss.config.mjs` | PostCSS | 6 | tailwindcss + autoprefixer |
| `tsconfig.json` | TS config | 25 | extends `@repo/typescript-config/nextjs.json`; paths `@/*`, `@repo/shared`, `@repo/ui` |
| `components.json` | shadcn manifest | 15 | style: new-york, baseColor: slate, cssVariables: true, aliases: components, utils, ui, hooks, lib |
| `.env.example` | Env template | 10 | NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_REPORT_HTTP_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME |
| `.gitignore` | Ignore | 8 | .next/, node_modules/, .env*.local, coverage/, test-results/ |
| `public/favicon.ico` | Placeholder | binary | Empty/placeholder |
| `public/logo.svg` | Placeholder wordmark | 30 | Inline SVG "SEO Analyst" |
| `src/app/layout.tsx` | Root layout | 70 | next/font Manrope+Inter; metadata; lang="vi"; wrap providers |
| `src/app/providers.tsx` | Client providers | 50 | QueryClient (staleTime 60s, refetchOnWindowFocus false); Toaster from sonner |
| `src/app/page.tsx` | Placeholder landing | 30 | Hero with wordmark + "Đang xây dựng" |
| `src/app/globals.css` | Global CSS | 50 | @tailwind base/components/utilities; import tokens; body font; ::selection |
| `src/app/error.tsx` | Error boundary | 40 | 'use client'; reset button + error.message display |
| `src/styles/tokens.css` | CSS variables | 80 | All tokens from [32 §2-§6](../32-design-system.md) |
| `src/components/ui/button.tsx` | shadcn Button | 60 | CVA variants: primary, secondary, ghost, destructive, outline; sizes sm/md/lg/icon |
| `src/components/ui/input.tsx` | shadcn Input | 40 | forwardRef; left/right icon slot; error state border |
| `src/components/ui/label.tsx` | shadcn Label | 25 | Radix Label primitive |
| `src/components/ui/card.tsx` | shadcn Card | 50 | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter; variants default/elevated/outline/dark/hero |
| `src/components/ui/badge.tsx` | shadcn Badge | 50 | CVA variants: primary, success, warning, error, neutral; sizes sm/md/lg |
| `src/components/ui/dialog.tsx` | shadcn Dialog | 80 | Radix Dialog wrapped |
| `src/components/ui/dropdown-menu.tsx` | shadcn DropdownMenu | 90 | Radix DropdownMenu wrapped |
| `src/components/ui/separator.tsx` | shadcn Separator | 25 | Radix Separator |
| `src/components/ui/skeleton.tsx` | shadcn Skeleton | 20 | bg-muted animate-pulse rounded |
| `src/components/ui/tabs.tsx` | shadcn Tabs | 60 | Radix Tabs |
| `src/components/ui/sonner.tsx` | Sonner Toaster | 25 | Theme-aware Toaster wrapper |
| `src/lib/api/client.ts` | HTTP client | 80 | ky instance; beforeRequest hook reads token from store; afterResponse 401 → tryRefresh stub |
| `src/lib/api/types.ts` | Shared DTOs re-export | 15 | re-export from `@repo/shared` (assume `AuthenticatedUser`, `Audit*`, etc. exist) |
| `src/lib/ws/client.ts` | Socket singleton | 100 | getSocket(), disconnectSocket(), reconnect config (1s→10s, 10 attempts) |
| `src/lib/auth/store.ts` | Auth store stub | 50 | Zustand: user, accessToken, setAuth, clearAuth, isAdmin |
| `src/lib/queries/keys.ts` | Query key factory | 25 | Empty `queryKeys = {}` template + JSDoc |
| `src/lib/utils/cn.ts` | clsx + tw-merge | 8 | `export const cn = (...inputs) => twMerge(clsx(inputs))` |
| `src/lib/utils/format.ts` | Format helpers | 60 | formatScore, formatDuration, formatRelativeDate (dayjs vi locale) |
| `src/lib/constants.ts` | Routes + copy | 50 | ROUTES enum, APP_NAME, APP_URL |
| `src/types/global.d.ts` | Globals | 15 | Window extensions if needed |
| `tests/setup.ts` | Vitest setup | 20 | jest-dom, cleanup |
| `tests/unit/smoke.test.tsx` | Smoke unit | 30 | renders RootLayout w/o throw |
| `tests/e2e/landing.spec.ts` | E2E smoke | 25 | navigate /, expect "SEO Analyst" text |
| `vitest.config.ts` | Vitest config | 30 | jsdom env, setup file, alias `@` |
| `playwright.config.ts` | Playwright config | 35 | webServer: npm run dev; baseURL http://localhost:3001 |

### Files **modified** (root)

| File | Change |
|---|---|
| `package.json` | Add scripts: `dev:web` → `turbo run dev --filter=@seo/web`; `e2e:web` → `playwright test apps/web` |
| `turbo.json` | (Verify) `apps/*` glob already covers; if not, add `apps/web` to pipeline |
| `.gitignore` (root) | Verify `**/.next/`, `**/test-results/` already ignored |

### Reuse from existing codebase

- `@repo/typescript-config/nextjs.json` — extend in `apps/web/tsconfig.json`.
- `@repo/eslint-config/next.js` (or similar) — extend in `apps/web/.eslintrc.cjs`.
- `@repo/shared` — re-export DTOs in `src/lib/api/types.ts`.
- `@repo/ui` (existing) — **NOT consumed** by web in this slug (web uses local `src/components/ui/`); will revisit if needed.

## Data flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 14 App Router                  │
│                                                             │
│   <RootLayout>                                              │
│     <html lang="vi">                                        │
│       <body className="manrope inter">                      │
│         <Providers>                ← 'use client'           │
│           <QueryClientProvider>                             │
│             <Toaster />                                     │
│             {children}             ← page.tsx               │
│           </QueryClientProvider>                            │
│         </Providers>                                        │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼ (future slugs hook into these)
        ┌──────────────┴──────────────┬──────────────────┐
        │                             │                  │
   src/lib/api                  src/lib/ws         src/lib/auth
   ─────────────                ───────────        ────────────
   ky(prefixUrl=ENV)            io(WS_URL,         Zustand store
   beforeRequest:                  auth=store)       { user, token }
     attach Bearer                 reconnect 10x    setAuth, clearAuth
   afterResponse:
     401 → tryRefresh(stub)
                       │
                       ▼
                 @repo/shared types
```

**Key principle:** all infrastructure modules are **stubs that compile and run**, ready for slug 2 (auth-flow) to wire real refresh logic, store binding, and WS hooks.

## Routes

| Route | Status | Purpose |
|---|---|---|
| `/` | NEW | Placeholder landing — wordmark + "đang xây dựng" message |

(All other routes deferred to subsequent slugs.)

## States

- **loading**: `tests/unit/smoke.test.tsx` verifies layout renders. Real loading states arrive with feature slugs.
- **empty**: N/A (no data fetching in bootstrap).
- **error**: `app/error.tsx` shows generic error UI with reset button.
- **populated**: `app/page.tsx` renders static "SEO Analyst — đang xây dựng".

## API endpoints consumed (this slug)

**None.** Only stub client; no real fetch in bootstrap.

## WebSocket events consumed

**None.** Only stub `getSocket()`; no real subscription.

## Proto impact

**None.** Bootstrap touches no `.proto` files.

## Test plan

### Unit (Vitest + RTL)

- `tests/unit/smoke.test.tsx`:
  ```typescript
  test('RootLayout renders without throwing', () => {
    render(<RootLayout><div>child</div></RootLayout>);
    // Just verify no crash; document.body has child
  });
  ```

### E2E (Playwright)

- `tests/e2e/landing.spec.ts`:
  ```typescript
  test('landing renders wordmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('SEO Analyst')).toBeVisible();
  });
  ```

### Type check

- `npm run type-check` from root must pass.

### Lint

- `npm run lint --filter=web` must pass with 0 errors.

## Performance budgets

Inherits [30 §9](../30-frontend-architecture.md):

| Metric | Target | How |
|---|---|---|
| LCP (landing) | < 2.5s | RSC + font preload + minimal JS |
| INP | < 200ms | Static page, no event handlers |
| CLS | < 0.1 | Font display swap with size-adjust |
| Initial JS bundle | < 200 KB gzipped | Tree-shake shadcn (only primitives copied) |

## Accessibility baseline

- `<html lang="vi">` set in root layout.
- Focus visible utility class added in globals.css.
- Reduced motion media query in globals.css.

## Decisions log

| Decision | Choice | Reason |
|---|---|---|
| App Router vs Pages | App Router | Per [30 §1](../30-frontend-architecture.md); RSC support |
| HTTP client | `ky` | Tiny, typed, browser-first |
| WS lib | `socket.io-client@4` | Match server |
| Form lib | `react-hook-form` + `zod` | Type-safe, share schemas |
| State | `zustand` | Per [30 §1](../30-frontend-architecture.md); minimal API |
| i18n | `next-intl` | Vietnamese-default, App Router compatible |
| shadcn location | `apps/web/src/components/ui/` | Avoid touching existing `packages/ui`; revisit later |
| Tailwind version | v3 stable (3.4+) | v4 not stable yet |
| Toast lib | `sonner` | Per 32 §7.7 |
| Charts | `recharts` | Per [30 §1](../30-frontend-architecture.md); install but not used yet |
| Test stack | Vitest + RTL + Playwright | Per [30 §10](../30-frontend-architecture.md) |
| Port | 3001 | Match [30 §11](../30-frontend-architecture.md); 3000 is gateway |

## Open technical questions

- Whether to install `@radix-ui/*` primitives individually or via shadcn add commands (network-dependent). → Install via npm direct + manual file create to keep build hermetic.
- `@repo/shared` actually exports `AuthenticatedUser`? Phase 1 onboard subagent must verify.
- `@repo/typescript-config/nextjs.json` exists? Phase 1 verify; if not, fall back to inline tsconfig.
