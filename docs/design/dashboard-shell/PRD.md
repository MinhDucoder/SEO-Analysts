---
type: prd
feature_slug: dashboard-shell
date: 2026-04-19
status: approved
tier: large
source: extracted from docs/design/30-frontend-architecture.md §3.1 + §4 + 31-page-specs.md §8 + 32-design-system.md §2.7/§7.8 + stitch_d_n_m_i/dashboard/code.html
---

# Dashboard Shell — Product Requirements

## Problem

Sau slug 2 (`auth-flow`), người dùng đã có thể đăng nhập nhưng không có nơi
nào để hạ cánh — `/dashboard` chưa tồn tại. `(app)` route group cũng chưa
được dựng, nghĩa là:

- Không có `Sidebar + Header + <main>` layout nào ôm các trang authenticated
  (dashboard, audits, settings, admin).
- Không có một màn hình "trang chủ user" nào sau login.
- Các `useMutation` login/register/oauth đang `router.push('/dashboard')`
  nhưng route đích còn 404.

Slug `dashboard-shell` dựng:

1. `(app)` route group layout (sidebar cố định bên trái + top app bar +
   main canvas + AuthGuard wrap).
2. `<Sidebar>` dark-mode theo [32-design-system.md §2.7 + §7.8](../../32-design-system.md),
   với nav items tương ứng slugs 3-7-8, active-state theo pathname.
3. `<Header>` — page title + search placeholder + notifications + user menu.
4. Trang `/dashboard` với 4 StatCards + Score gauge hero + Recent audits list
   + Score chart 30 ngày (Recharts) theo [31-page-specs.md §8](../../31-page-specs.md),
   visually inspired by `stitch_d_n_m_i/dashboard/code.html` bento grid.
5. Empty state cho user chưa có audit nào: illustration + CTA
   "Tạo audit đầu tiên".

Gateway chưa ship `/stats/my` endpoint → tất cả stat aggregates compute
client-side từ `GET /audits?limit=30` (workaround prescribed tại
[31-page-specs.md §8](../../31-page-specs.md)).

## User stories

- **Landing sau login** — User login thành công → redirect tới `/dashboard`
  → thấy ngay tổng quan: tháng này đã chạy bao nhiêu audit, điểm SEO trung
  bình, audit gần nhất, xu hướng 30 ngày.
- **Navigate via sidebar** — User click nav item (Dashboard / Audits /
  Admin / Settings) → chuyển trang ngay, active-state highlight đúng mục
  hiện tại, mobile-dưới-lg sidebar collapse thành hamburger drawer.
- **Quick action "Tạo audit mới"** — Header luôn có button `+ New Audit`
  (cả mobile lẫn desktop), click dẫn tới `/audits/new` (route sẽ được
  slug 4 implement; slug 3 chỉ cần đảm bảo link trỏ đúng).
- **User menu** — Footer sidebar hiển thị `<UserMenuCard>` với avatar +
  tên + email; click mở dropdown: "Hồ sơ", "Bảo mật", "Đăng xuất".
  Logout gọi `useLogout()` (đã ship slug 2) → clear store → redirect
  `/login`.
- **Admin chỉ dành cho admin** — `role === 'admin'` mới thấy nav mục
  "Quản trị" trong sidebar; `AdminGuard` đã ship slug 2 không áp dụng
  trên nav list (chỉ áp dụng trên `(app)/admin/*` layout sau này), slug
  này chỉ ẩn/hiện mục nav dựa trên role.
- **Empty state** — User mới (0 audits) thấy `<DashboardEmpty>` thay cho
  stats/chart: illustration placeholder + "Chưa có audit nào" + CTA
  "Tạo audit đầu tiên" → `/audits/new`.
- **Real stats khi có audits** — User có ≥ 1 audit thấy:
  - 4 StatCards (This month / Avg SEO score / Critical issues / PDFs
    exported).
  - Score gauge hero (big circular 0-100, classification-colored, "+N%
    vs last month" badge).
  - Recent audits list (5 audits mới nhất, mỗi row: URL ellipsis, domain
    badge, score badge, status badge, "X giờ trước").
  - Score trend line chart (30 ngày, X = ngày, Y = score, tooltip
    hover).
- **401 auto-logout đã hoạt động** — Slug 2 đã ship interceptor — slug 3
  chỉ validate: nếu token expired mid-session, TanStack Query fetch
  `/audits` → 401 → tryRefresh → fail → `window.location.href = '/login'`.

## Acceptance criteria

1. `apps/web/src/app/(app)/layout.tsx` (NEW, RSC wrapper quanh `'use client'`
   shell) renders `<AuthGuard><DashboardShell>{children}</DashboardShell></AuthGuard>`.
   `<DashboardShell>` là client component chứa Sidebar + Header + main.
2. `<Sidebar>` (`src/components/layout/sidebar.tsx`, client): dark
   (`bg-slate-900`), fixed left w-64, rounded-r-2xl shadow-xl. Wordmark
   "SEO Analyst" + tagline. Nav list từ `SIDEBAR_NAV` constant theo thứ
   tự: Dashboard (LayoutDashboard icon), Audit (Search icon), So sánh
   (GitCompare icon), Quản trị (Shield, admin-only), Cài đặt (Settings).
   `<SidebarLink>` active-state khi `pathname.startsWith(href)`. Footer:
   `<UserMenuCard>` (avatar placeholder + fullName + role badge).
3. Mobile (<lg): sidebar ẩn, `<MobileNav>` hiện header hamburger → Drawer
   (Radix Dialog) trượt từ trái với cùng nav list. Backdrop blur, click
   ngoài đóng.
4. `<Header>` (`src/components/layout/header.tsx`, client): page title
   (tính từ pathname via `PAGE_TITLE_MAP` constant), subtitle, search
   input (disabled placeholder for now), notification bell (disabled),
   `+ Audit mới` button → `ROUTES.auditsNew`. Sticky top, bg-background/80
   backdrop-blur.
5. `src/app/(app)/dashboard/page.tsx` (NEW, client chứa các widget):
   - Đầu trang: `<ScoreGaugeHero>` (col-span-4 lg, recharts RadialBar
     hoặc custom SVG) + 4 `<StatCard>` (col-span-8 lg, 2×2 grid).
   - Middle: `<ScoreTrendChart>` (col-span-8, Recharts LineChart 30d) +
     `<RecentAuditsCard>` (col-span-4).
   - Bottom: `<DashboardQuickActions>` (create audit + view all audits
     links).
6. `<StatCard>` props: `{ label, value, delta?, deltaDirection?, icon,
   accentColor? }`. 4 cards: "Audit tháng này" (LayoutDashboard),
   "Điểm SEO TB" (BarChart3), "Issue quan trọng" (AlertTriangle), "PDF
   đã xuất" (FileText). Tất cả compute từ `useRecentAudits(30d)`.
7. `<ScoreGaugeHero>`: SVG circular 192×192, stroke dash theo
   score/100 × 552.92, stroke color = `classify(score)` (excellent
   green / good blue / fair amber / poor red). Center text 6xl font
   + "/100" sub-label + delta badge bên dưới ("+4.2% so với tháng
   trước" hoặc "—" nếu dữ liệu <2 tháng).
8. `<RecentAuditsCard>`: lấy 5 `audits[0..4]` từ `useRecentAudits()`.
   Mỗi row: URL ellipsis + domain badge + score badge (classification
   color) + status badge + `dayjs.fromNow()`. Empty state: "Chưa có
   audit nào" + CTA. Footer link "Xem tất cả →" → `/audits`.
9. `<ScoreTrendChart>`: Recharts `<LineChart>` 30d, X-axis = ngày
   (dayjs format `DD/MM`), Y-axis = 0-100. Tooltip show URL + score.
   Empty state: placeholder "Cần ≥ 2 audit để vẽ xu hướng" khi audit
   count < 2.
10. `<DashboardEmpty>` (empty state): khi `audits.length === 0` — skip
    tất cả widget trên, render 1 card full-width với illustration SVG
    placeholder + heading "Chưa có audit nào" + body copy + CTA button
    "Tạo audit đầu tiên" → `/audits/new`.
11. `src/lib/api/audits.ts` (NEW) export `listAudits({ limit, status,
    dateFrom, dateTo, page }): Promise<Paginated<AuditListItem>>`.
    Slug 4 sẽ extend thêm search/filter params; slug này chỉ cần `limit`
    + optional `dateFrom`.
12. `src/lib/api/types.ts` (MODIFIED) export `AuditListItem` shape
    matching gateway `GET /audits` response item — tối thiểu fields:
    `id, url, domain, status, score, mode, createdAt, completedAt`.
13. `src/lib/queries/use-audits.ts` (NEW) export `useRecentAudits(opts?:
    { limit?: number; dateFrom?: string })` — `useQuery` key
    `queryKeys.audits.recent(opts)` TTL 60s. Also export
    `useAuditsList(filters)` placeholder (empty impl) for slug 4 wiring.
14. `src/lib/queries/keys.ts` (MODIFIED) extend `queryKeys.audits = {
    all: [], list: (filters) => […], recent: (opts) => […], detail:
    (id) => […] }`.
15. Sidebar collapse toggle state persists trong localStorage key
    `seo.sidebar.collapsed` (boolean). Default expanded on desktop,
    always drawer on mobile.
16. Toàn bộ UI Vietnamese-localized. Lưu copy trong
    `src/lib/constants.ts` `COPY.dashboard` khi nhiều chỗ share; inline
    nếu dùng một lần.
17. Build green: `npm run build --filter=@seo/web` pass; tsc 0; eslint
    0; First Load JS `/dashboard` < 200 KB gzipped (baseline 87.3 +
    recharts ~80 KB).
18. Tests (pay-via-harness): RTL cho `<Sidebar>`, `<Header>`, `<StatCard>`,
    `<RecentAuditsCard>`, `<DashboardEmpty>`, và page-level
    `dashboard/page.tsx` smoke (MSW stub `/audits?limit=30` trả [] vs
    5 items); Playwright e2e `dashboard.spec.ts` happy-path (login →
    /dashboard render shell + widget).

## Out of scope

- `/audits`, `/audits/new`, `/audits/:id`, `/audits/:id/compare` pages —
  slug 4-6. Sidebar link chỉ cần tồn tại + trỏ đúng (404 tạm chấp nhận).
- `/settings/*`, `/admin/*` — slugs 7-8. Sidebar mục "Cài đặt" trỏ
  `/settings/profile` (sẽ 404), "Quản trị" trỏ `/admin/users` (404 +
  admin-only visibility).
- Notification drawer — chỉ stub button, không có logic feed. Slug sau
  có thể extend.
- Search bar — stub disabled input, không wire query. Planning cho slug
  tương lai (sitewide search).
- `/stats/my` backend endpoint — compute aggregate client-side; BE
  endpoint là future enhancement ngoài scope FE.
- Chart drill-down / click-through — line chart chỉ tooltip, không
  navigate khi click point.
- Dark mode toggle — tokens đã prep trong [32-design-system.md §2.9](../../32-design-system.md),
  thực thi để slug sau.
- i18n khác tiếng Việt — không trong scope dự án.
- Real-time audit progress widget — sẽ gắn trong slug 5 (audit-detail).
  Slug 3 chỉ show static "recent audits" từ REST, không WS.

## Open questions

- **ScoreGaugeHero placement**: Mockup đặt hero gauge làm "card đầu
  tiên" (col-span-4); 31 §8 không có gauge, chỉ có 4 stat cards đồng
  đều. **Decision**: adopt gauge từ mockup vì nó là visual hook quan
  trọng; nó thay thế card "Điểm SEO TB" hoặc bổ sung — chọn **bổ sung**
  (giữ cả 4 stat cards + 1 gauge hero), bento grid sẽ có 1 big gauge +
  4 nhỏ stat. Phù hợp cấu trúc grid-cols-12 của stitch.
- **Empty dataset delta display**: Nếu audit count chỉ có tháng này (0
  baseline tháng trước), delta trong stat card hiển thị gì? **Decision**:
  hiện "—" + copy "Chưa đủ dữ liệu so sánh".
- **Score chart khi < 30 ngày dữ liệu**: **Decision**: vẫn vẽ nhưng X-axis
  chỉ đi từ audit cũ nhất đến nay; không padding empty days.
- **User avatar**: gateway chưa có avatar field trên `AuthenticatedUser`.
  **Decision**: placeholder = initials (fullName chia theo space, lấy
  chữ cái đầu) trong vòng tròn nền slate-800.
- **Sidebar hover vs always-expanded**: **Decision**: always-expanded trên
  desktop (w-64); không hover-to-expand (thêm state complexity không cần).
- **Recharts vs Tremor**: Design doc §1 nêu "Recharts hoặc Tremor".
  **Decision**: Recharts — nhẹ hơn (~80 KB vs Tremor ~150 KB), primitives
  lower-level đủ customize theo token system.

## Success metrics

- `npm run test --filter=web` → 100% pass including new dashboard tests
  (projected ~20 new vitest + 1 new playwright).
- `npm run build --filter=@seo/web` → bundle size `/dashboard` <
  200 KB gzipped.
- `login → /dashboard render` e2e < 5s locally với MSW handlers.
- Keyboard navigation: Tab qua sidebar → header → main nội dung, không
  có focus trap bất ngờ.
- Lighthouse local a11y score ≥ 95 trên `/dashboard`.
