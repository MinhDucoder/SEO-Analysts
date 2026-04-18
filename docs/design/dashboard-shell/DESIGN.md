---
type: design
feature_slug: dashboard-shell
date: 2026-04-19
status: approved
tier: large
source: extracted from docs/design/30-frontend-architecture.md §3.1/§4/§5 + 31-page-specs.md §8 + 32-design-system.md §2.7/§7.8 + stitch_d_n_m_i/dashboard/code.html
---

# Dashboard Shell — Technical Design

## Architecture overview

Dashboard shell xếp thành 3 lớp — layout shell wrap toàn bộ `(app)/*`,
dashboard widgets mount bên trong, data layer qua TanStack Query:

```
┌ (app) route group ─────────────────────────────────────────────────┐
│  app/(app)/layout.tsx (RSC wrapper)                                │
│  ├─ <AuthGuard>                            (slug 2 — reused)       │
│  │   └─ <DashboardShell> ('use client')                            │
│  │       ├─ <Sidebar>    (desktop ≥ lg)                            │
│  │       ├─ <MobileNav>  (drawer < lg)                             │
│  │       ├─ <Header>     (top app bar, sticky)                     │
│  │       └─ <main>                                                 │
│  │           └─ {children}                                         │
│  │               └─ page.tsx per route (dashboard, audits, …)      │
│  │                                                                 │
│  └─ Future slugs 4-8 drop into same shell:                         │
│      app/(app)/audits/…     (slug 4-5-6)                           │
│      app/(app)/settings/…   (slug 8)                               │
│      app/(app)/admin/…      (slug 7)  ← wrap extra <AdminGuard>    │
└────────────────────────────────────────────────────────────────────┘

<Dashboard page> (slug 3)
    │
    ├── useRecentAudits({ limit: 30 })           ← new in slug 3
    │     └── api.get('audits?limit=30')
    │           ↓
    │     Paginated<AuditListItem>
    │
    ├── compute aggregates CLIENT-SIDE:
    │     – statsThisMonth   = filter by dateFrom = startOfMonth
    │     – avgScore         = mean(audits[].score, completed only)
    │     – criticalIssues   = sum(audits[].ruleFails where severity=critical) — field
    │                          NOT present yet → placeholder 0 (fix in slug 5)
    │     – pdfsExported     = filter by audits[].pdfUrl !== null — field
    │                          may not exist → placeholder 0
    │
    ├── renders StatCards + ScoreGaugeHero + RecentAuditsCard + ScoreTrendChart
    │
    └── if audits.length === 0 → <DashboardEmpty />
```

## Folder structure (delta from slug 2)

```
apps/web/src/
├── app/
│   ├── (app)/                            ← NEW route group
│   │   ├── layout.tsx                    ← NEW (AuthGuard + DashboardShell)
│   │   └── dashboard/
│   │       ├── page.tsx                  ← NEW (dashboard widgets composition)
│   │       └── loading.tsx               ← NEW (shell + skeleton bento grid)
│   │
│   └── providers.tsx                     ← UNCHANGED (already wraps QueryClient)
│
├── components/
│   ├── layout/                           ← NEW folder
│   │   ├── dashboard-shell.tsx           ← 'use client'; sidebar + header + main grid
│   │   ├── sidebar.tsx                   ← Desktop sidebar (≥ lg)
│   │   ├── sidebar-link.tsx              ← Nav item (active-state via pathname)
│   │   ├── sidebar-nav.tsx               ← Constant SIDEBAR_NAV + role filter
│   │   ├── mobile-nav.tsx                ← Radix Dialog drawer (< lg)
│   │   ├── header.tsx                    ← Top app bar (title + actions)
│   │   ├── user-menu-card.tsx            ← Sidebar footer: avatar + name + logout dropdown
│   │   └── wordmark.tsx                  ← Reusable brand text (Sidebar top + anywhere)
│   │
│   ├── dashboard/                        ← NEW folder
│   │   ├── stat-card.tsx                 ← Reusable: label + value + delta + icon
│   │   ├── stats-grid.tsx                ← Composes 4 StatCards + layout
│   │   ├── score-gauge-hero.tsx          ← Big circular SVG + delta badge
│   │   ├── recent-audits-card.tsx        ← 5-row list + "Xem tất cả" footer link
│   │   ├── audit-row.tsx                 ← Row inside RecentAuditsCard (URL + badges)
│   │   ├── score-trend-chart.tsx         ← Recharts LineChart 30d
│   │   └── dashboard-empty.tsx           ← Illustration + CTA for 0-audit users
│   │
│   ├── common/                           ← NEW folder (reusable utilities)
│   │   ├── empty-state.tsx               ← Generic: icon + title + body + CTA slot
│   │   ├── score-badge.tsx               ← Small score chip (classification-colored)
│   │   └── status-badge.tsx              ← Audit status chip (pending/crawling/completed/failed)
│   │
│   ├── auth/                             ← UNCHANGED (slug 2)
│   └── ui/                               ← UNCHANGED (slug 1)
│
├── lib/
│   ├── api/
│   │   ├── audits.ts                     ← NEW: listAudits(params)
│   │   ├── auth.ts                       ← UNCHANGED (slug 2)
│   │   ├── client.ts                     ← UNCHANGED
│   │   └── types.ts                      ← MODIFIED (add AuditListItem)
│   │
│   ├── queries/
│   │   ├── keys.ts                       ← MODIFIED (add queryKeys.audits)
│   │   └── use-audits.ts                 ← NEW (useRecentAudits)
│   │
│   ├── dashboard/                        ← NEW folder (pure utils for widgets)
│   │   ├── aggregates.ts                 ← computeStats(audits, now) → stats object
│   │   └── chart-data.ts                 ← buildTrendSeries(audits) → [{x,y}]
│   │
│   ├── auth/                             ← UNCHANGED (slug 2)
│   ├── utils/
│   │   └── format.ts                     ← MODIFIED (add formatRelativeTime via dayjs)
│   └── constants.ts                      ← MODIFIED (PAGE_TITLES + SIDEBAR_NAV)
│
└── tests/
    ├── unit/
    │   ├── dashboard/
    │   │   ├── stat-card.test.tsx
    │   │   ├── stats-grid.test.tsx
    │   │   ├── score-gauge.test.tsx
    │   │   ├── recent-audits-card.test.tsx
    │   │   ├── score-trend-chart.test.tsx
    │   │   ├── dashboard-page.test.tsx          (page smoke: 0-audit vs 5-audit)
    │   │   └── dashboard-empty.test.tsx
    │   ├── layout/
    │   │   ├── sidebar.test.tsx                 (nav, active-state, role filter)
    │   │   ├── header.test.tsx                  (title map, + New Audit link)
    │   │   ├── user-menu-card.test.tsx          (logout click → clears store)
    │   │   └── mobile-nav.test.tsx              (drawer open/close)
    │   └── dashboard-aggregates.test.ts         (pure util tests)
    │
    └── e2e/
        └── dashboard.spec.ts                    (login → /dashboard render + widgets)
```

## Components

### `<DashboardShell>` ('use client')

```tsx
// components/layout/dashboard-shell.tsx
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />          {/* hidden < lg */}
      <MobileNav user={user} />        {/* visible < lg */}
      <Header />
      <main className="lg:ml-64 pt-20 px-4 sm:px-6 lg:px-8 pb-16">
        {children}
      </main>
    </div>
  );
}
```

### `<Sidebar>`

- Fixed `left-0 top-0 h-full w-64 bg-slate-900 rounded-r-2xl shadow-xl z-40`.
- Hidden `< lg` via `hidden lg:flex`.
- Structure: Wordmark → `<nav>` (flex-1 nav items) → `<UserMenuCard>`
  (mt-auto).
- Nav from `SIDEBAR_NAV` constant (see `src/lib/constants.ts`).
- Admin mục: hiển thị khi `user.role === 'admin'` (filter tại render).

```tsx
// components/layout/sidebar.tsx
export function Sidebar({ user }: { user: AuthenticatedUser | null }) {
  const items = SIDEBAR_NAV.filter(i => !i.adminOnly || user?.role === 'admin');
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 rounded-r-2xl shadow-xl z-40 hidden lg:flex flex-col py-6">
      <Wordmark variant="light" className="px-6 mb-8" />
      <nav className="flex-1 space-y-1 px-2">
        {items.map((i) => <SidebarLink key={i.href} {...i} />)}
      </nav>
      <UserMenuCard user={user} className="mt-auto px-4" />
    </aside>
  );
}
```

### `<SidebarLink>`

- Active-state: `usePathname().startsWith(href)` — matches sub-routes too
  (e.g. `/audits/123` highlights Audit).
- Default: `text-slate-400 hover:text-white hover:bg-slate-800`.
- Active: `bg-primary-container text-white shadow-primary active:scale-95`
  (per 32 §7.8).
- Icons: `lucide-react` (LayoutDashboard, Search, GitCompare, Shield,
  Settings). NOT Material Symbols (stitch uses them but lucide is already
  shipped via slug 2; consistency wins).

### `<MobileNav>`

- Hamburger button trong header (visible `< lg`).
- Radix `<Dialog>` with `side="left"` drawer animation (tailwindcss-animate
  keyframes). Bg matches Sidebar (slate-900).
- Same nav items + UserMenuCard → reuse component parts; isolate state
  hooks (open/close) inside this file.

### `<Header>`

- Sticky `sticky top-0 z-30 bg-background/80 backdrop-blur`.
- Layout (left-to-right):
  - **Mobile only** (`< lg`): hamburger `<Button>` triggers MobileNav.
  - **Title block**: `<h2>` + subtitle from `PAGE_TITLE_MAP` constant
    keyed by pathname prefix.
  - **Right cluster** (ml-auto, gap-3):
    - Search input (disabled placeholder).
    - Notification bell (disabled icon button).
    - `+ Audit mới` button → `ROUTES.auditsNew` (primary variant).
- Spans full width `lg:ml-64` to align with main canvas.

### `<UserMenuCard>`

- Inside `<Sidebar>` + `<MobileNav>`. Card look: `bg-slate-800/50 rounded-2xl
  p-4`.
- Shows: initials avatar + fullName + role label.
- Click → Radix `<DropdownMenu>` with items:
  - "Hồ sơ" → `/settings/profile`
  - "Bảo mật" → `/settings/security`
  - Separator
  - "Đăng xuất" → `useLogout()` mutation (shipped slug 2).

### `<StatCard>`

Props:
```ts
{
  label: string;           // "Audit tháng này"
  value: string | number;  // 12
  delta?: string;          // "+3 so với tháng trước"
  deltaDirection?: 'up' | 'down' | 'flat';
  icon: LucideIcon;        // LayoutDashboard etc.
  accentColor?: 'primary' | 'tertiary' | 'warning' | 'error';
}
```

- Base: `bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/5`.
- Icon chip top-left (`p-2.5 rounded-xl bg-{accent}/10 text-{accent}`).
- Delta top-right (`text-xs font-bold flex items-center gap-1` with
  tertiary green for up / error red for down / on-surface-variant for flat).
- Label (uppercase, tracking-widest, text-xs).
- Value (`text-3xl font-extrabold`).
- Optional progress/sparkline slot (children) — chỉ dùng trong mockup,
  slug 3 bỏ qua để giảm surface.

### `<ScoreGaugeHero>`

Props: `{ score: number | null; deltaPct?: number | null; lastAudits?:
number }` (last count là counter subtle ở dưới).

SVG theo 32 §7.10 ScoreGauge recipe + mockup size:

```tsx
<div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center relative overflow-hidden col-span-12 lg:col-span-4">
  <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest mb-6">
    Sức khỏe SEO
  </h3>
  <svg viewBox="0 0 192 192" className="w-48 h-48 -rotate-90">
    <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" className="text-surface-container" />
    <circle
      cx="96" cy="96" r="88"
      fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
      className={classifyColorClass(score)}
      strokeDasharray={552.92}
      strokeDashoffset={552.92 - (score / 100) * 552.92}
    />
  </svg>
  <div className="absolute flex flex-col items-center">
    <span className="text-6xl font-extrabold">{score ?? '—'}</span>
    <span className="text-on-surface-variant/60 font-bold text-sm">/ 100</span>
  </div>
  {deltaPct != null && (
    <DeltaBadge value={deltaPct} direction={deltaPct >= 0 ? 'up' : 'down'} />
  )}
</div>
```

### `<RecentAuditsCard>`

- Container: `bg-white rounded-2xl p-6 shadow-sm col-span-12 lg:col-span-4`.
- Header: title "Audit gần đây" + link "Xem tất cả →" (text-primary).
- Body: `<AuditRow>` × 5 (divide-y divide-outline-variant/20 px-0 py-3).
- Empty: `<EmptyState icon={Search} title="Chưa có audit nào" body="Tạo
  audit đầu tiên để theo dõi." action={<Button href={ROUTES.auditsNew}>Tạo
  audit</Button>} />`.

### `<AuditRow>`

```tsx
<div className="flex items-center gap-3 py-3">
  <div className="min-w-0 flex-1">
    <p className="text-sm font-bold truncate">{url}</p>
    <p className="text-xs text-on-surface-variant">{domain} · {fromNow(createdAt)}</p>
  </div>
  <ScoreBadge score={score} />
  <StatusBadge status={status} />
</div>
```

### `<ScoreTrendChart>` (Recharts)

```tsx
<LineChart data={series} width={undefined} height={256}>
  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-container)" />
  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
  <Tooltip content={<CustomTooltip />} />
  <Line type="monotone" dataKey="score" stroke="var(--color-primary)"
        strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
</LineChart>
```

- Container: `ResponsiveContainer` wraps for width = 100%.
- `<CustomTooltip>`: shows `{date} · {url} · score {n}`.

### `<DashboardEmpty>`

- Full-width card `col-span-12 bg-white rounded-2xl p-16 text-center`.
- Illustration: inline SVG placeholder (simple circle + lines, no external
  asset needed).
- Heading "Chưa có audit nào".
- Body "Tạo audit đầu tiên để bắt đầu phân tích SEO."
- CTA: `<Button href={ROUTES.auditsNew} size="lg">+ Tạo audit đầu tiên</Button>`.

## Data flow

### Dashboard page mount

```
dashboard/page.tsx
  → useRecentAudits({ limit: 30 })
      → api.get('audits?limit=30')
          → Paginated<AuditListItem>
  → if !data: render <DashboardLoadingSkeleton>
  → if audits.length === 0: render <DashboardEmpty />
  → else:
      stats = computeStats(audits, new Date())
      trend = buildTrendSeries(audits)
      avgScore, avgScoreDelta = computeAvg(audits)
      render all widgets
```

### computeStats (pure util)

```ts
// lib/dashboard/aggregates.ts
export function computeStats(
  audits: AuditListItem[],
  now: Date,
): DashboardStats {
  const startOfThisMonth = startOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));

  const thisMonth = audits.filter(a => a.createdAt >= startOfThisMonth);
  const lastMonth = audits.filter(
    a => a.createdAt >= startOfLastMonth && a.createdAt < startOfThisMonth,
  );
  const completed = audits.filter(a => a.status === AuditStatus.COMPLETED);

  return {
    auditsThisMonth: {
      value: thisMonth.length,
      delta: lastMonth.length === 0 ? null : thisMonth.length - lastMonth.length,
    },
    avgScore: {
      value: completed.length === 0 ? null : mean(completed.map(a => a.score ?? 0)),
      delta: /* compute same pattern */,
    },
    criticalIssues: {
      // Gateway doesn't return ruleFails on list endpoint → placeholder until
      // slug 5 adds /stats/my or list includes digest counts.
      value: 0, delta: null,
    },
    pdfsExported: {
      // Same — list endpoint doesn't expose. Placeholder.
      value: 0, delta: null,
    },
  };
}
```

### Logout flow (reused from slug 2)

```
UserMenuCard "Đăng xuất" click
  → useLogout().mutate()
      → api.post('auth/logout') (slug 2)
      → clearAuth() (Zustand)
      → router.push('/login') (slug 2 mutation already handles)
```

### Sidebar pathname match

```
SidebarLink href="/audits"
  → const pathname = usePathname()
  → const active = pathname === href || pathname.startsWith(`${href}/`)
  → class(active ? 'bg-primary-container' : 'hover:bg-slate-800')
```

Edge: `/` (home) match EXACT only (use `===`); others use prefix.

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/dashboard` | GET | Authenticated user home; widgets from recent audits |

Plus layout at `(app)` route group wraps all future authenticated pages.

## States (per widget)

- **loading**: skeletons matching bento grid (4 stat skeletons + gauge +
  chart rectangle + list rows). `dashboard/loading.tsx` ships shell-level
  version; widget-level suspense boundaries not needed slug 3.
- **empty (0 audits)**: `<DashboardEmpty>` full-screen.
- **error (query fails)**: top banner `<ErrorBanner>` inside dashboard
  page + "Thử lại" button (`refetch()`). No full replace.
- **success**: all widgets render with real data.

## API endpoints consumed

| Method | Endpoint | Query hook | Notes |
|---|---|---|---|
| GET | `/audits?limit=30` | `useRecentAudits` | New hook; reused by slug 4 with more params |
| POST | `/auth/logout` | `useLogout` | Shipped slug 2 |
| GET | `/auth/me` | `useMeQuery` | Shipped slug 2; used by `<UserMenuCard>` + `<Header>` |

No WebSocket in slug 3.

## WebSocket events consumed

**None.** Dashboard is REST-only. Realtime audit progress belongs to
slug 5 (audit-detail page) per [33-realtime-ux.md](../../33-realtime-ux.md).

## Proto impact

**None.** gRPC unchanged.

## Decisions log

| Decision | Choice | Reason |
|---|---|---|
| Chart library | Recharts | 30 §1 sanctions it; ~80 KB; primitive-level styling matches token system |
| Icon set | lucide-react | Already shipped slug 2; Material Symbols (stitch) would add 1 font file for zero DX gain |
| Sidebar collapse | Always expanded on desktop | Hover-to-expand adds motion + state complexity; users prefer predictability |
| Empty aggregate delta | "—" placeholder | Rendering "+0%" when baseline missing is misleading |
| Critical issues source | Placeholder 0 | Gateway `GET /audits` list endpoint doesn't return ruleFails count. Don't over-engineer FE to fetch detail × N; slug 5 can add `/stats/my` |
| PDFs exported source | Placeholder 0 | Same — list doesn't expose; can be backend follow-up |
| Admin nav visibility | Role-filter at render | Cheaper than extra AdminGuard wrapper for sidebar only; user can still navigate to `/admin/*` in URL bar and AdminGuard (slug 2) blocks them |
| Mobile breakpoint | `lg` (1024px) | Sidebar width 256px becomes intrusive < 1024; matches shadcn + Tailwind convention |
| Score gauge placement | Bento hero col-span-4 + 4 stat cards col-span-8 | Merges 31 §8 metrics + stitch visual hierarchy |
| Quick-action "+ New audit" | Header button (all viewports) + empty state CTA | Always discoverable; empty CTA reinforces onboarding |
| Sidebar storage key | `seo.sidebar.collapsed` localStorage | Scope-qualified to avoid collision with future multi-app |
| `(app)` layout | RSC outer + client `<DashboardShell>` inner | AuthGuard needs client state; outer RSC wrapper preserves Next.js layout streaming |

## Open technical questions

- **Recharts ResponsiveContainer + SSR** — Next.js App Router can static-render
  Recharts but `<ResponsiveContainer>` needs window; dashboard page is
  client component so no concern. **Decision**: mark `page.tsx` as
  `'use client'` (already natural for widget state).

- **Loading state during `<AuthGuard>` redirect** — Auth guard renders
  `<FullpageSkeleton>` while checking. For `(app)` layout we get double
  loading (guard skeleton → widget skeleton) feels janky. **Decision**:
  accept the double-flash for slug 3; slug 2 guard already handles
  this — no rework. Follow-up: guard could expose "silent bypass when
  client-navigation" later.

- **Dashboard route prefetch from login success** — `useLogin().onSuccess`
  does `router.push('/dashboard')`. Want preloaded list? **Decision**:
  skip for slug 3. Let TanStack Query handle first fetch; adds complexity
  without meaningful TTI win given audits list is small.

- **Score in list endpoint** — Gateway returns `audits[i].score` or
  `audits[i].seoScore`? Confirmed by inspection: TBD — audit-service
  schema uses `score`. Will verify during execution; if mismatch,
  narrow `AuditListItem` to `{ score?: number | null }` to be safe.

- **Dark-mode tokens already defined** — 32 §2.9 preps CSS variables for
  dark theme but slug 3 doesn't implement toggle. **Decision**: use
  light tokens only; ensure no hardcoded hex in widgets so future dark
  mode works without widget rewrite.
