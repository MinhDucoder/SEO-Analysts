---
type: prd
feature_slug: web-bootstrap
date: 2026-04-18
status: approved
tier: large
source: extracted from docs/design/30-frontend-architecture.md + 32-design-system.md
---

# Web Bootstrap — Product Requirements

## Problem

Repo hiện có 5 backend microservice (`gateway`, `crawler`, `seo-analyzer`, `keyword-analyzer`, `report`) hoạt động đầy đủ với REST + WebSocket + gRPC + BullMQ. Phía frontend (`apps/web/`) **chưa tồn tại**. Trước khi build bất kỳ feature page nào (auth, dashboard, audit), cần có một nền móng Next.js 14 chuẩn hoá: project scaffold, design system tokens, font loading, UI primitives, providers (TanStack Query, theme, toast, auth store), HTTP/WS client, Tailwind config, env wiring, và E2E harness. Đây là **infrastructure feature** — không có trang chức năng end-user mới, nhưng là điều kiện cần cho 8 slug FE còn lại.

## User stories

- Là **dev FE** mới join, tôi muốn `cd apps/web && npm run dev` chạy được Next.js dev server tại `localhost:3001` để tôi bắt đầu code feature ngay.
- Là **dev FE** sắp build trang auth, tôi muốn import `<Button>`, `<Input>`, `<Card>`, `<Badge>`, `<Dialog>`, `<Toast>` từ `@/components/ui` (shadcn) đã có sẵn theme tokens.
- Là **dev FE** sắp gọi API, tôi muốn import `api` từ `@/lib/api/client` đã wire JWT refresh interceptor + base URL từ env.
- Là **dev FE** sắp dùng WebSocket, tôi muốn `getSocket()` đã setup auto-reconnect, auth token, và disconnect-on-logout.
- Là **dev FE** muốn dùng TanStack Query, tôi muốn `<QueryClientProvider>` đã wrap root, `staleTime` mặc định = 60s.
- Là **dev FE** code form, tôi muốn `react-hook-form` + `zod` resolver đã cài sẵn.
- Là **dev FE** code page i18n, tôi muốn `next-intl` đã wire với locale `vi` mặc định.
- Là **CI**, tôi muốn `npm run type-check`, `npm run lint --filter=web`, `npm run test --filter=web` chạy thành công với scaffold rỗng (smoke test pass).
- Là **dev**, tôi muốn `tailwind.config.ts` đã có CSS variable tokens (color, font, radius, shadow) match [32-design-system.md](../32-design-system.md) §2-§6.

## Acceptance criteria

1. `apps/web/package.json` tồn tại với dependencies: `next@14`, `react@18`, `typescript@5`, `tailwindcss@^4`, `@tanstack/react-query@^5`, `socket.io-client@^4`, `ky` hoặc `axios`, `react-hook-form@^7`, `zod@^3`, `zustand@^4`, `next-intl`, `dayjs`, `recharts`, `lucide-react`, `class-variance-authority`, `tailwind-merge`, `clsx`.
2. `apps/web/next.config.mjs` config App Router + Vietnamese locale support + image domains.
3. `apps/web/tailwind.config.ts` import token preset, scan `./src/**/*.{ts,tsx}` + `../../packages/ui/src/**/*.{ts,tsx}`.
4. `apps/web/src/styles/tokens.css` chứa CSS variables theo [32-design-system.md §12](../32-design-system.md).
5. `apps/web/src/styles/globals.css` import Tailwind base + tokens.css + font face.
6. `apps/web/src/app/layout.tsx` wire: Manrope + Inter font (next/font/google), `<html lang="vi">`, providers, metadata.
7. `apps/web/src/app/providers.tsx` wrap: `QueryClientProvider`, `ToastProvider` (sonner), theme detector.
8. `apps/web/src/app/page.tsx` placeholder landing render "SEO Analyst" wordmark + "Đang xây dựng".
9. `apps/web/src/components/ui/` chứa shadcn primitives được copy (theo [32-design-system.md §7](../32-design-system.md)): button, input, card, badge, dialog, dropdown-menu, label, separator, toast, skeleton, tabs.
10. `apps/web/src/lib/api/client.ts` export `api` instance: ky/axios với prefixUrl `NEXT_PUBLIC_API_URL`, JWT refresh interceptor stub (chưa hook auth store thật vì auth chưa build — mock interface).
11. `apps/web/src/lib/api/types.ts` re-export DTOs từ `@repo/shared`.
12. `apps/web/src/lib/ws/client.ts` export `getSocket()` singleton với auto-reconnect config theo [33-realtime-ux.md §3](../33-realtime-ux.md). Auth token nguồn = stub (sẽ gắn auth store ở slug 2).
13. `apps/web/src/lib/auth/store.ts` Zustand store stub với shape `{ user, accessToken, setAuth, clearAuth, isAdmin }` (chưa có UI consumer — chỉ skeleton để slug 2 dùng).
14. `apps/web/src/lib/queries/keys.ts` centralized query key factory rỗng (template).
15. `apps/web/src/lib/utils/cn.ts` export `cn()` helper (clsx + tailwind-merge).
16. `apps/web/.env.example` chứa: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_REPORT_HTTP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`.
17. `apps/web/tsconfig.json` extends `@repo/typescript-config/nextjs.json`, paths `@/*` → `src/*`.
18. `apps/web/components.json` config shadcn-ui style "new-york", baseColor "slate", cssVariables: true.
19. `apps/web/tests/unit/smoke.test.tsx` Vitest smoke test render `<RootLayout>` không throw.
20. `apps/web/tests/e2e/landing.spec.ts` Playwright smoke navigate `/` thấy "SEO Analyst".
21. `turbo.json` đã include `apps/web` qua glob `apps/*` (đã có sẵn).
22. `npm run dev` ở root **hoặc** `npm run dev --filter=web` chạy được không lỗi.

## Out of scope

- Auth UI/pages (login/register/forgot/reset/verify/oauth). → slug 2 `auth-flow`.
- Sidebar + header layout cho `(app)` route group. → slug 3 `dashboard-shell`.
- Dashboard widgets, audit list/detail, admin pages. → slugs 3-7.
- Real auth store hookup vào API client (giờ chỉ stub). → slug 2.
- Real WS subscription hooks (`useAuditRealtime`). → slug 5.
- Public pages (landing + shared). → slug 9.
- Mobile-specific layout hoàn chỉnh (chỉ scaffold breakpoint config).
- Storybook (không nằm trong stack đã chọn).
- Deployment config Vercel (`vercel.json`, build command). → riêng phase deploy.

## Open questions

- **shadcn/ui source**: copy vào `apps/web/src/components/ui/` (per-app), hay vào `packages/ui/src/`(monorepo shared)? → **Decision (default):** copy vào `apps/web/src/components/ui/` để tránh đụng tới `packages/ui` (đang có code cũ); nếu sau này cần share với app khác sẽ refactor.
- **Tailwind v4 alpha hay v3**: Tailwind v4 chưa stable hết. → **Decision:** dùng v3 stable (3.4+) cho an toàn; migrate v4 ở phase riêng.
- **Tester**: Vitest + RTL + Playwright? → confirmed theo [30 §10](../30-frontend-architecture.md).
- **HTTP client**: `ky` hay `axios`? → **Decision:** `ky` (theo [30 §1](../30-frontend-architecture.md)) — nhỏ, typed, browser-first.
- **Toast lib**: `sonner` (theo 32 §7.7).
- **WebSocket auth token nguồn**: hiện slug 1 chưa có auth, dùng stub `() => null` — slug 2 sẽ thay bằng `useAuthStore.getState().accessToken`.

## Success metrics

- `cd apps/web && npm run dev` → server lên trong < 5s, không error.
- `npm run type-check` (root) → 0 error.
- `npm run lint --filter=web` → 0 error.
- `npm run test --filter=web` → smoke test pass.
- `npm run e2e:smoke` (chỉ landing route) → pass.
- Bundle size landing page < 200 KB gzipped (theo [30 §9](../30-frontend-architecture.md)).
- Lighthouse landing page LCP < 2.5s, CLS < 0.1.
