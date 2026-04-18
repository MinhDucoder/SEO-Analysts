# 30 — Frontend Architecture

> **Scope:** Kiến trúc ứng dụng web Next.js (chưa tồn tại — sẽ tạo tại `apps/web/`). Tài liệu này là blueprint để bắt đầu dev.
>
> **Tham khảo UI:** 3 mockup HTML/PNG trong thư mục này (`webaudit`, `aigenerate`, `learning`) — xem [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md).

---

## 1. Ngăn xếp công nghệ

| Lớp | Công nghệ | Phiên bản | Lý do chọn |
|---|---|---|---|
| Framework | Next.js | 14 (App Router) | RSC + streaming; SSR cho SEO (ironic nhưng cần); file-based routing |
| Language | TypeScript | 5.x | Strict mode; types import từ `@repo/shared` |
| UI components | shadcn/ui + Radix | — | Copy-paste, full ownership; accessible primitives |
| Styling | Tailwind CSS | 4.x (alpha/stable khi release) | Utility-first; dark mode; responsive |
| Icons | Material Symbols (web font) | — | Match mockup; 1 font file lo hết |
| Font | Manrope (headline) + Inter (body) | Google Fonts | Match mockup |
| Data fetching | TanStack Query | 5.x | Cache + mutation + optimistic + refetch on focus |
| HTTP client | ky / fetch wrapper | — | Tiny, typed, interceptor cho JWT refresh |
| WebSocket | socket.io-client | 4.8 | Khớp server-side |
| Form | react-hook-form + zod | 7.x + 3.x | Type-safe; share schema với backend |
| State global | Zustand (nếu cần) | 4.x | Auth context, UI state (toast, modal) |
| Routing/i18n | next-intl | — | Tiếng Việt mặc định |
| Charts | Recharts hoặc Tremor | — | CWV line chart, category bar, score gauge |
| PDF viewer | `<iframe>` hoặc react-pdf | — | Preview share link mà không download |
| Date | `dayjs` + Vietnamese locale | — | Format `"2 giờ trước"` |
| Testing | Vitest + React Testing Library + Playwright | — | Unit + E2E |

---

## 2. Cấu trúc thư mục `apps/web/`

```
apps/web/
├── package.json
├── tsconfig.json                  # extends @repo/typescript-config/nextjs
├── next.config.mjs
├── tailwind.config.ts
├── components.json                # shadcn/ui config
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── og-image.png
├── src/
│   ├── app/                       # App Router
│   │   ├── layout.tsx             # Root layout: font, metadata, providers
│   │   ├── providers.tsx          # QueryClient + Theme + Toast
│   │   ├── globals.css            # Tailwind base + CSS vars
│   │   ├── page.tsx               # Landing page
│   │   │
│   │   ├── (auth)/                # Route group — unauthenticated layout
│   │   │   ├── layout.tsx         # Centered card, logo
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/[token]/page.tsx
│   │   │   ├── verify-email/[token]/page.tsx
│   │   │   └── oauth-success/page.tsx
│   │   │
│   │   ├── (app)/                 # Route group — authenticated layout (sidebar)
│   │   │   ├── layout.tsx         # Sidebar + header + <main>
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── audits/
│   │   │   │   ├── page.tsx       # List
│   │   │   │   ├── new/page.tsx   # Create form
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx   # Detail (tabs)
│   │   │   │   │   ├── compare/page.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   ├── settings/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── security/page.tsx
│   │   │   └── admin/             # role=admin route group
│   │   │       ├── layout.tsx     # extra admin guard
│   │   │       ├── users/page.tsx
│   │   │       ├── rules/page.tsx
│   │   │       └── stats/page.tsx
│   │   │
│   │   ├── shared/
│   │   │   └── [token]/page.tsx   # Public view qua share link
│   │   │
│   │   └── api/
│   │       └── proxy/[...path]/route.ts  # Optional: proxy REST tới backend (tránh CORS)
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives (button, input, dialog, ...)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── audits/
│   │   │   ├── audit-form.tsx
│   │   │   ├── audit-list.tsx
│   │   │   ├── audit-status-badge.tsx
│   │   │   ├── score-gauge.tsx       # Circular 0-100
│   │   │   ├── category-bar.tsx      # Horizontal bar per category
│   │   │   ├── issues-table.tsx
│   │   │   ├── cwv-tile.tsx
│   │   │   ├── keyword-table.tsx
│   │   │   └── realtime-progress.tsx # WebSocket consumer
│   │   ├── admin/
│   │   │   ├── rule-weight-form.tsx
│   │   │   └── user-table.tsx
│   │   └── common/
│   │       ├── empty-state.tsx
│   │       ├── error-boundary.tsx
│   │       └── url-input.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts          # ky instance + JWT refresh interceptor
│   │   │   ├── auth.ts            # login/register/logout/refresh/me
│   │   │   ├── audits.ts          # CRUD + export/share
│   │   │   ├── admin.ts           # rules/users/stats
│   │   │   └── types.ts           # Request/Response types (mirror backend DTOs)
│   │   ├── ws/
│   │   │   ├── client.ts          # Socket.IO singleton
│   │   │   └── hooks.ts           # useAuditRealtime hook
│   │   ├── auth/
│   │   │   ├── store.ts           # Zustand auth store
│   │   │   ├── guard.tsx          # <AuthGuard>, <AdminGuard>
│   │   │   └── hooks.ts           # useUser, useRole
│   │   ├── queries/               # TanStack Query hooks
│   │   │   ├── use-audits.ts
│   │   │   ├── use-audit.ts
│   │   │   └── use-rules.ts
│   │   ├── utils/
│   │   │   ├── cn.ts              # classNames util
│   │   │   ├── format.ts          # score, duration, date formatters
│   │   │   ├── classify.ts        # re-export từ @repo/shared
│   │   │   └── url.ts             # normalize URL input
│   │   └── constants.ts           # Route paths, UI copy
│   │
│   ├── hooks/                     # Generic React hooks
│   │   ├── use-toast.ts
│   │   ├── use-debounce.ts
│   │   └── use-media-query.ts
│   │
│   ├── styles/
│   │   └── tokens.css             # Design tokens (xem [32-design-system.md])
│   │
│   └── types/
│       └── global.d.ts
│
├── tests/
│   ├── e2e/                       # Playwright
│   │   └── audit-flow.spec.ts
│   └── unit/                      # Vitest
│       └── components/
│
└── .env.local
```

---

## 3. Strategy tóm tắt

### 3.1 Server Components (RSC) vs Client Components

| Page / component | Loại | Lý do |
|---|---|---|
| Landing `/` | RSC | Public, SEO-first, render tĩnh |
| Dashboard `/dashboard` | RSC + Client child | Shell SSR; widgets dùng TanStack Query (client) |
| Audit list `/audits` | RSC + Client table | Pagination + filter qua URL searchParams → SSR có thể pre-fetch |
| Audit detail `/audits/:id` | Client (chủ yếu) | Realtime WS + TanStack Query; hard to do SSR với streaming data |
| Admin pages | Client | Chỉ admin xem, không cần SSR |
| Shared view `/shared/:token` | RSC | SEO + share preview |
| Auth pages | Client | Form interactivity |

**Quy tắc:** bắt đầu bằng RSC, chuyển sang `'use client'` khi cần state/effect/WS.

### 3.2 Data fetching

- **Authenticated data** qua TanStack Query:
  ```tsx
  const { data: audits } = useAudits({ page: 1, status: 'completed' });
  ```
- **Public data** (landing, shared) qua `fetch` trong RSC với `cache: 'force-cache'`.
- **Mutations** qua `useMutation` với `onSuccess → queryClient.invalidateQueries`.

### 3.3 Auth flow

```
User truy cập /dashboard
 │
 ├─ Middleware đọc cookie `refresh_token`?
 │    ├─ Không → redirect /login
 │    └─ Có → render shell, client hydrate
 │
 └─ Client: useAuth() hook
      ├─ Không có accessToken in memory → POST /auth/refresh → set token
      ├─ Có token → queries dùng token
      └─ 401 trong query → trigger refresh → retry
```

**Storage:**
- `refreshToken`: HttpOnly cookie (gateway set). Client **không** đọc được.
- `accessToken`: memory (Zustand store, không localStorage — XSS risk).
- Refresh khi page reload: client gọi `POST /auth/refresh` ngay khi mount.

### 3.4 Error handling

- **Global error boundary** (`app/error.tsx`) cho uncaught errors.
- **Per-page loading** (`loading.tsx`) dùng Suspense.
- **Per-query error** → toast + inline error message.
- **401 interceptor** → thử refresh; thất bại → logout redirect.
- **Network error** → retry 3 lần (TanStack Query default).

### 3.5 Loading & Suspense

- Dùng `<Suspense>` bọc phần async để Next.js stream.
- Skeleton component thay cho spinner (xem [32-design-system.md](32-design-system.md)).
- Realtime progress bar cho audit (thay vì fullscreen spinner).

---

## 4. Routing chi tiết

| Route | Access | Layout | Main page component |
|---|---|---|---|
| `/` | Public | Landing (no sidebar) | Hero + features + CTA |
| `/login`, `/register`, `/forgot-password`, `/reset-password/:token`, `/verify-email/:token`, `/oauth-success` | Public | Auth (centered card) | Form |
| `/dashboard` | User | App (sidebar) | Stat cards + recent audits |
| `/audits` | User | App | List + filters |
| `/audits/new` | User | App | Create form (single/site mode) |
| `/audits/:id` | User (owner) | App | Tabs: Overview / Rules / Keywords / CWV / Timeline |
| `/audits/:id/compare?with=<otherId>` | User | App | Side-by-side diff |
| `/settings/profile`, `/settings/security` | User | App | Forms |
| `/admin` | Admin | App + admin banner | Admin home |
| `/admin/users` | Admin | App | User table |
| `/admin/rules` | Admin | App | Rule weight sliders |
| `/admin/stats` | Admin | App | Platform stats + charts |
| `/shared/:token` | Public | Shared (minimal header, no sidebar) | Readonly report view |

**Route group:**
- `(auth)` — auth pages share một layout (card tập trung).
- `(app)` — mọi route authenticated dùng sidebar + header.

---

## 5. Auth module chi tiết

### 5.1 `lib/auth/store.ts` — Zustand

```typescript
interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  setAuth: (user, token) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  setAuth: (user, token) => set({ user, accessToken: token }),
  clearAuth: () => set({ user: null, accessToken: null }),
  isAdmin: () => get().user?.role === 'admin',
}));
```

### 5.2 `lib/api/client.ts` — ky + refresh interceptor

```typescript
import ky from 'ky';
import { useAuthStore } from '../auth/store';

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',    // để cookie refresh_token đi theo
  hooks: {
    beforeRequest: [
      (req) => {
        const token = useAuthStore.getState().accessToken;
        if (token) req.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (req, _opts, res) => {
        if (res.status === 401 && !req.url.includes('/auth/refresh')) {
          // Thử refresh một lần
          const refreshed = await tryRefresh();
          if (refreshed) {
            req.headers.set('Authorization', `Bearer ${refreshed}`);
            return ky(req);
          }
          // Fail → logout
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
      },
    ],
  },
});
```

### 5.3 `lib/auth/guard.tsx` — route guard

```tsx
'use client';
export function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);

  if (!user) return <FullpageSkeleton />;
  return <>{children}</>;
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore(s => s.isAdmin());
  if (!isAdmin) return <NotAuthorized />;
  return <>{children}</>;
}
```

Dùng trong layout:
```tsx
// app/(app)/layout.tsx
<AuthGuard>
  <Sidebar />
  <Header />
  <main>{children}</main>
</AuthGuard>
```

### 5.4 Google OAuth

```tsx
<Button onClick={() => window.location.href = `${API_URL}/auth/google`}>
  Đăng nhập với Google
</Button>
```

Callback endpoint gateway redirect về `/oauth-success?token=<jwt>`:
```tsx
// app/(auth)/oauth-success/page.tsx
'use client';
export default function OAuthSuccess() {
  const params = useSearchParams();
  const token = params.get('token');

  useEffect(() => {
    if (token) {
      api.get('auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .json<AuthenticatedUser>()
        .then(user => {
          useAuthStore.getState().setAuth(user, token);
          router.replace('/dashboard');
        });
    }
  }, [token]);

  return <FullpageSkeleton />;
}
```

---

## 6. TanStack Query patterns

### 6.1 Hook naming

`use{Resource}[Filter]` — vd `useAudits`, `useAudit(id)`, `useAdminUsers({ page })`.

### 6.2 Query keys

Centralize để invalidate đúng:

```typescript
// lib/queries/keys.ts
export const queryKeys = {
  audits: {
    all: () => ['audits'] as const,
    list: (filters: AuditFilters) => ['audits', 'list', filters] as const,
    detail: (id: string) => ['audits', 'detail', id] as const,
    status: (id: string) => ['audits', 'status', id] as const,
  },
  admin: {
    rules: () => ['admin', 'rules'] as const,
    users: (filters) => ['admin', 'users', filters] as const,
  },
};
```

### 6.3 Optimistic update khi tạo audit

```typescript
const { mutate: createAudit } = useMutation({
  mutationFn: api.createAudit,
  onMutate: async (newAudit) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.audits.all() });
    const previous = queryClient.getQueryData(queryKeys.audits.list(filters));
    queryClient.setQueryData(queryKeys.audits.list(filters), (old) => ({
      ...old,
      data: [{ ...newAudit, status: 'pending', id: 'temp-' + Date.now() }, ...old.data],
    }));
    return { previous };
  },
  onError: (_err, _new, ctx) => {
    queryClient.setQueryData(queryKeys.audits.list(filters), ctx?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.audits.all() });
  },
});
```

---

## 7. WebSocket integration

Chi tiết xem [33-realtime-ux.md](33-realtime-ux.md). Tóm tắt:

```typescript
// lib/ws/client.ts — singleton
let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(WS_URL, { auth: { token: getToken() } });
  }
  return socket;
}

// lib/ws/hooks.ts
export function useAuditRealtime(auditId: string, {
  onProgress, onCompleted, onFailed
}) {
  useEffect(() => {
    const s = getSocket();
    s.emit('audit:subscribe', { auditId });
    s.on('audit:progress', onProgress);
    s.on('audit:completed', onCompleted);
    s.on('audit:failed', onFailed);

    return () => {
      s.emit('audit:unsubscribe', { auditId });
      s.off('audit:progress');
      s.off('audit:completed');
      s.off('audit:failed');
    };
  }, [auditId]);
}
```

Dùng trong page:
```tsx
useAuditRealtime(auditId, {
  onProgress: ({ progress, stage }) => setProgress({ progress, stage }),
  onCompleted: () => queryClient.invalidateQueries(queryKeys.audits.detail(auditId)),
  onFailed: ({ error }) => toast.error(error),
});
```

---

## 8. Environment variables

`.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
NEXT_PUBLIC_REPORT_HTTP_URL=http://localhost:3004
NEXT_PUBLIC_APP_NAME=SEO Analyst
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Optional
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

**Lưu ý prefix `NEXT_PUBLIC_`:** chỉ vars này mới xuất hiện trên client.

---

## 9. Performance budgets

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Initial JS bundle | < 200 KB (gzipped) |
| Image LCP lazy load | ✅ |
| Font display swap | ✅ (Manrope + Inter preload) |

**Cách đạt:**
- RSC cho nội dung tĩnh → giảm JS gửi về.
- Code split theo route (Next.js tự làm).
- Tree-shake shadcn/ui (copy từng component, không bundle cả library).
- `next/image` cho mọi ảnh (lazy load + WebP tự động).
- TanStack Query `staleTime` = 60s → ít refetch.

---

## 10. Testing strategy

| Loại | Tool | Coverage |
|---|---|---|
| Unit component | Vitest + RTL | Form validation, render logic |
| Integration (API mocked) | Vitest + MSW | TanStack Query hooks |
| E2E | Playwright | Login → create audit → wait complete → export PDF |
| Visual regression (optional) | Chromatic / Percy | Page snapshots |

E2E smoke flow minimum:
1. Register new user → verify email (read token from DB or test fixture).
2. Login.
3. Create audit `https://example.com`.
4. Wait for `audit:completed` WS event (timeout 30s).
5. Assert score hiển thị.
6. Click export → assert PDF download.

---

## 11. Deployment

**Dev:**
```bash
cd apps/web
npm run dev              # localhost:3001
```

Backend phải chạy song song (`npm run docker:up` ở root).

**Prod (Vercel):**
- Build command: `turbo run build --filter=@seo/web`
- Output: `.next/`
- Env vars: set trong Vercel dashboard (`NEXT_PUBLIC_*`).
- Preview deployment mỗi PR.

**CORS:** backend `gateway` env `FRONTEND_URL` phải match prod URL.

---

## 12. Đi tiếp

- Chi tiết từng page → [31-page-specs.md](31-page-specs.md)
- Design tokens + component library → [32-design-system.md](32-design-system.md)
- Realtime UX patterns → [33-realtime-ux.md](33-realtime-ux.md)
- Map mockup → spec → [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md)
