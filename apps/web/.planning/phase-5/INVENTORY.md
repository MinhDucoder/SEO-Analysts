# INVENTORY — Phase 5+ Implementation Map

> Maps **design Phase 0-4 artifacts** (28 components × 53 page states) to
> **apps/web/** file structure + BACKEND-API.md endpoints + decision log.
>
> Source: `design/system-tokens.pen` + `design/BACKEND-API.md` + `design/INTENT.md`

---

## 1. Component Inventory (28 reusable → file map)

### 1a. Primitives — shadcn re-add via `npx shadcn`

| Pencil Component | id | shadcn primitive | Target file | Variants needed |
|---|---|---|---|---|
| Component/Button/Primary | `o8AJkQ` | button | `src/components/ui/button.tsx` | primary (default) |
| Component/Button/Secondary | `NaTK3` | button | ↑ | secondary |
| Component/Button/Outline | `QThUr` | button | ↑ | outline |
| Component/Button/Ghost | `VDsXn` | button | ↑ | ghost |
| Component/Button/Destructive | `tibBu` | button | ↑ | destructive |
| Component/Input/Default | `F7L51P` | input | `src/components/ui/input.tsx` | + label + error |
| Component/Card | `h62450` | card | `src/components/ui/card.tsx` | — |
| Component/Badge/Success | `o7UmW` | badge | `src/components/ui/badge.tsx` | success |
| Component/Badge/Error | `GSTlC` | ↑ | ↑ | error/destructive |
| Component/Badge/Warn | `lXuzr` | ↑ | ↑ | warn |

**shadcn add cmd**: `npx shadcn@latest add button input card badge dialog dropdown-menu label separator skeleton tabs sonner`

### 1b. Domain — custom code, no shadcn equivalent

| Pencil Component | id | Target file | Notes |
|---|---|---|---|
| Component/ScoreRing/Lg | `lHEAG` | `src/components/domain/score-ring.tsx` | 160×160 svg + center text + classify color |
| Component/ScoreDelta | `scoreDeltaC` | `src/components/domain/score-delta.tsx` | pill +X.X / -X.X with arrow icon |
| Component/RuleResultRow | `ruleRowC` | `src/components/domain/rule-result-row.tsx` | collapsible row, status icon + name + weight + chevron |
| Component/CwvCard | `cwvCardC` | `src/components/domain/cwv-card.tsx` | 3 metrics inline (LCP/CLS/INP) + threshold color |
| Component/KeywordTable | `kwTableC` | `src/components/domain/keyword-table.tsx` | table + 4 boolean badge columns |
| Component/CategoryRadar | `catRadarC` | `src/components/domain/category-radar.tsx` | 6-axis spider chart 280×280 (Recharts `RadarChart`) |
| Component/CategoryBars/Lg | `catBarsLgC` | `src/components/domain/category-bars.tsx` | 6 horizontal bars with label + bar + score |
| Component/StatusPipeline | `statusPipelineC` | `src/components/domain/status-pipeline.tsx` | crawling → analyzing → reporting steps |

### 1c. Toast — 4 variants

| Pencil Component | id | Approach |
|---|---|---|
| Component/Toast/Success | `toastSuccess` | sonner `toast.success(msg)` with custom token styling |
| Component/Toast/Warning | `toastWarning` | `toast.warning(msg)` |
| Component/Toast/Error | `toastError` | `toast.error(msg)` |
| Component/Toast/Info | `toastInfo` | `toast.info(msg)` |

All 4 styled via `<Toaster theme="..." toastOptions={{ classNames }}>`.

### 1d. AppShell — layout components

| Pencil Component | id | Target file |
|---|---|---|
| Component/AppShell/Sidebar/Header | `sidebarHeaderC` | `src/components/layout/sidebar/header.tsx` |
| Component/AppShell/Sidebar/NavItem | `navItemC` | `src/components/layout/sidebar/nav-item.tsx` |
| Component/AppShell/Sidebar/Footer | `sidebarFooterC` | `src/components/layout/sidebar/footer.tsx` |
| Component/AppShell/Sidebar/Container | `sidebarContC` | `src/components/layout/sidebar/index.tsx` (compose Header + Nav + Footer) |
| Component/AppShell/Topbar | `topbarC` | `src/components/layout/topbar.tsx` |
| Component/AppShell/Wrapper | `appShellC` | `src/components/layout/app-shell.tsx` (Sidebar + Topbar + slot) |

**Collapsed sidebar variant**: per `AppShell/SidebarCollapsed` demo → controlled by `sidebarCollapsed` state in `useUiPrefs` zustand (lib/ui/prefs.ts).

### 1e. AppShell internal demos (Phase 4 task G)

| Frame | Purpose |
|---|---|
| AppShell/WithToastStack | Reference for toast positioning (top-right, 24px from edge, 12px gap) → bake into `<Toaster>` config |
| AppShell/SidebarCollapsed | Reference for collapsed 64w state |

---

## 2. Page Inventory (15 pages × 53 states → Next.js routes)

### Auth (public) — `src/app/(auth)/`

| Route | Pencil state frames | Files |
|---|---|---|
| `/login` | Default, Loading, Error/Validation, Error/RateLimit, Error/AccountLocked | `(auth)/login/page.tsx` + use `Modal/AccountLocked` + `Modal/RateLimit` from globals |
| `/register` | Default, PasswordTyping, PasswordValid, Success, Error/EmailTaken | `(auth)/register/page.tsx` (5 states via component state) |
| `/forgot-password` | Default, Loading, Success, Error/Validation, Error/RateLimit | `(auth)/forgot-password/page.tsx` |
| `/reset-password/[token]` | Default, PasswordValid, MismatchError, Success, Error/InvalidToken, Error/MissingToken | `(auth)/reset-password/[token]/page.tsx` |
| `/auth/oauth-success` | Loading, Success, Error/MissingToken, Error/InvalidToken | `auth/oauth-success/page.tsx` |

### App shell (authenticated) — `src/app/(app)/`

| Route | Pencil state frames | Files |
|---|---|---|
| `/dashboard` *(implied)* | — | optional landing redirect or stat overview |
| `/audits` | Default, Loading, Empty, Error500 | `(app)/audits/page.tsx` + `loading.tsx` + `error.tsx` + `empty` rendered conditionally |
| `/audits/new` | Default | `(app)/audits/new/page.tsx` |
| `/audits/[id]` | Completed, Completed/AltView, InProgress/Crawling, InProgress/Analyzing, InProgress/Reporting, Failed, Empty (404), Modal/Share, Modal/Delete | `(app)/audits/[id]/page.tsx` + `loading.tsx` + `not-found.tsx` + `error.tsx` + `share-modal.tsx` + `delete-modal.tsx` |
| `/audits/compare` | Default | `(app)/audits/compare/page.tsx` |
| `/scheduled` | Default, Empty | `(app)/scheduled/page.tsx` |
| `/settings/profile` | Default | `(app)/settings/profile/page.tsx` |
| `/settings/password` | Default | `(app)/settings/password/page.tsx` |

### Admin — `src/app/(app)/admin/`

| Route | Pencil state frames | Files |
|---|---|---|
| `/admin/stats` | Default | `admin/stats/page.tsx` |
| `/admin/users` | Default, Empty | `admin/users/page.tsx` |
| `/admin/rules` | Default | `admin/rules/page.tsx` |

### Public — `src/app/shared/`

| Route | Pencil state frames | Files |
|---|---|---|
| `/shared/[token]` | Default, LowScore, Error/NotFound | `shared/[token]/page.tsx` + `not-found.tsx` |

### Global modals (rendered via `<Dialog>` portal, not routed pages)

| Modal | Trigger source | File |
|---|---|---|
| Modal/AccountLocked | 403 on auth ops | `src/components/modals/account-locked.tsx` |
| Modal/RateLimit | 429 anywhere | `src/components/modals/rate-limit.tsx` |
| AuditDetail/Modal/Share | `POST /audits/:id/share` button | `(app)/audits/[id]/share-modal.tsx` |
| AuditDetail/Modal/Delete | Delete button confirm | `(app)/audits/[id]/delete-modal.tsx` |

### Counts

- **15 pages** (auth 5 + app 8 + admin 3 + public 1 minus dashboard which is optional) actually 16 if dashboard counts
- **53 state frames** → most via React state inside single page.tsx; only `loading.tsx`/`not-found.tsx`/`error.tsx` use Next.js route segment files
- **4 global modals** — Dialog portals

---

## 3. API Contract (BACKEND-API.md → query/mutation hooks)

> Already mapped in `src/lib/api/{auth,audits}.ts` + `src/lib/auth/mutations.ts` + `src/lib/queries/use-audits.ts`.
> Below: gaps + what Phase 5+ needs to add.

### Auth (already in lib/auth/) ✓

| Endpoint | Hook |
|---|---|
| POST /auth/register | `useRegister` ✓ |
| POST /auth/login | `useLogin` ✓ |
| POST /auth/refresh | `tryRefresh` (client.ts singleton) ✓ |
| POST /auth/logout | `useLogout` ✓ |
| GET /auth/me | `useAuth` boot ✓ |
| POST /auth/verify-email | `useVerifyEmail` ✓ |
| POST /auth/forgot-password | `useForgotPassword` ✓ |
| POST /auth/reset-password | `useResetPassword` ✓ |

### Audits (lib/queries/ partial) — Phase 5 needs

| Endpoint | Hook (to build) | File |
|---|---|---|
| POST /audits | `useCreateAudit()` | `lib/queries/use-audits.ts` (add) |
| GET /audits | `useAuditsList(filters)` | ↑ (add — has `useRecentAudits`) |
| GET /audits/:id | `useAudit(id)` | ↑ |
| GET /audits/:id/status | `useAuditStatus(id, opts)` | ↑ (poll fallback when WS down) |
| GET /audits/:id/wait | rarely; only SSR fallback | n/a |
| DELETE /audits/:id | `useDeleteAudit()` | ↑ |
| GET /audits/:id/export | `<a href={REPORT_HTTP_URL}/audits/:id/export>` | direct link |
| POST /audits/:id/share | `useCreateShareLink()` | ↑ |
| DELETE /audits/:id/share | `useRevokeShareLink()` | ↑ |
| GET /audits/compare | `useCompareAudits(a1, a2)` | `lib/queries/use-compare.ts` |

### Scheduled audits — Phase 5

| Endpoint | Hook | File |
|---|---|---|
| POST /scheduled-audits | `useCreateScheduledAudit()` | `lib/queries/use-scheduled.ts` |
| GET /scheduled-audits | `useScheduledAudits()` | ↑ |
| PATCH /scheduled-audits/:id/{pause,resume} | `usePauseSchedule`, `useResumeSchedule` | ↑ |
| DELETE /scheduled-audits/:id | `useDeleteSchedule()` | ↑ |

### Users / Settings — Phase 5

| Endpoint | Hook | File |
|---|---|---|
| PATCH /users/profile | `useUpdateProfile()` | `lib/queries/use-user.ts` |
| PATCH /users/password | `useChangePassword()` | ↑ |

### Admin (👑) — Phase 5

| Endpoint | Hook | File |
|---|---|---|
| GET /admin/users | `useAdminUsersList(query)` | `lib/queries/use-admin.ts` |
| PATCH /admin/users/:id | `useToggleUserLock()` | ↑ |
| GET/PUT /admin/rules | `useAdminRules`, `useUpdateRules` | ↑ |
| GET /admin/stats | `useAdminStats(period)` | ↑ |

### Public — Phase 5

| Endpoint | Hook | File |
|---|---|---|
| GET /shared/audits/:token | `useSharedReport(token)` | `lib/queries/use-shared.ts` (server component, no auth) |

### WebSocket (`/ws`) — Phase 5

Already has `lib/ws/client.ts` singleton. Need:
- `useAuditRealtime(auditId)` — `audit:subscribe` + listen `audit:progress` + `audit:completed`/`audit:failed`. File: `lib/ws/use-audit-realtime.ts`

---

## 4. Decisions

### 4.1 i18n — hard-code Vietnamese ✓

**Reason**: Pencil content 100% Vietnamese. INTENT.md targets Vietnamese SMB SEO market. Adding `next-intl` adds bundle weight + DX friction with no near-term EN/multilingual requirement.

**How to apply**: All copy lives inline in JSX. Reserve `src/i18n/` empty for future. If EN needed later → migrate via `next-intl` + extract messages.

### 4.2 Page state variants — React state, not separate route files

**Reason**: Pencil shows 53 state frames but most are visual states of the same page (form errors, loading, success). Splitting into routes inflates URL surface + breaks back-button UX.

**How to apply**:
- Use `loading.tsx` only for top-level route segment loading (`audits/[id]/loading.tsx`)
- Use `error.tsx` only for unhandled exceptions
- Use `not-found.tsx` for 404 (`audits/[id]` empty state when ID invalid)
- All other states (Validation errors, RateLimit, AccountLocked, Empty list with action, etc.) → React state inside `page.tsx` driven by query/mutation results

### 4.3 Theme switching — `data-theme` attribute on `<html>`

**Reason**: Pencil ships dual theme dark/light. Both must be reachable from UI. Token system uses `:root[data-theme='dark']` to override (already in tokens.css).

**How to apply**:
- `lib/ui/theme.ts` Zustand store: `{ theme: 'light' | 'dark' | 'system' }`
- `<html data-theme={resolvedTheme}>` in client root
- System mode → `prefers-color-scheme` media query (already CSS-side fallback)
- Toggle in Sidebar Footer (per Pencil sidebarFooter design)

### 4.4 Charts — Recharts (already in package.json)

ScoreRing → custom SVG (cleaner than gauge libs).
CategoryRadar → Recharts `RadarChart`.
Score trend / stats → Recharts `LineChart` / `BarChart`.

### 4.5 Realtime fallback strategy

WebSocket primary. If `socket.disconnected` for >10s OR initial connect fails → fall back to polling `/audits/:id/status` every 2s. Surface "Mất kết nối realtime" toast.

---

## 5. Phase 5+ Breakdown (proposed)

| Phase | Scope | Effort | Dependencies |
|---|---|---|---|
| **5a** | Tokens + Tailwind + globals.css + shadcn primitives re-add (button/input/card/badge/dialog/tabs/dropdown/skeleton/separator/label/sonner) | 30 min | none |
| **5b** | Domain components (8 custom: ScoreRing, ScoreDelta, RuleResultRow, CwvCard, KeywordTable, CategoryRadar, CategoryBars, StatusPipeline) | 90 min | 5a |
| **5c** | AppShell (Sidebar Header/NavItem/Footer/Container + Topbar + Wrapper + Theme toggle + Collapsed mode) | 60 min | 5a |
| **5d** | Auth pages reskin (login/register/forgot/reset/oauth-success — 5 routes, 25 state frames) | 90 min | 5a, 5b, 5c |
| **6a** | Dashboard + audits list page (`/audits`) + filters + skeleton + empty + error500 | 60 min | 5b, 5c |
| **6b** | Audits create (`/audits/new`) + scheduled list (`/scheduled`) | 45 min | 5c |
| **6c** | Audit detail (`/audits/[id]`) — heaviest: 9 state frames, WS realtime, share/delete modals | 120 min | 5b, 5c, ws hook |
| **6d** | Compare (`/audits/compare`) | 45 min | 5b |
| **6e** | Public shared (`/shared/[token]`) — 3 state frames | 45 min | 5b |
| **7a** | Settings profile + password | 45 min | 5c |
| **7b** | Admin stats + users + rules (3 routes, role-guarded) | 75 min | 5c |
| **8** | Global modals (AccountLocked / RateLimit) wired to 403/429 interceptor | 30 min | 5a |
| **9** | E2E + integration tests (use fe-test-harness + fe-be-integration skills) | 90 min | all |

**Total estimate**: ~14 hours of focused implementation across 9 sub-phases.

---

## 6. File Tree Preview (post-Phase-9)

```
apps/web/src/
├── app/
│   ├── layout.tsx                      ✓ stripped (current)
│   ├── providers.tsx                   ✓ stripped (current)
│   ├── page.tsx                        Phase 5d (landing or redirect /dashboard)
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   ├── auth/oauth-success/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                  AppShell wrap
│   │   ├── dashboard/page.tsx
│   │   ├── audits/
│   │   │   ├── page.tsx + loading + error
│   │   │   ├── new/page.tsx
│   │   │   ├── compare/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx + loading + error + not-found
│   │   │       ├── share-modal.tsx
│   │   │       └── delete-modal.tsx
│   │   ├── scheduled/page.tsx
│   │   ├── settings/
│   │   │   ├── profile/page.tsx
│   │   │   └── password/page.tsx
│   │   └── admin/
│   │       ├── stats/page.tsx
│   │       ├── users/page.tsx
│   │       └── rules/page.tsx
│   └── shared/[token]/
│       ├── page.tsx + not-found
├── components/
│   ├── ui/                             shadcn primitives
│   ├── domain/                         8 custom domain components
│   ├── layout/                         AppShell + Sidebar + Topbar
│   └── modals/                         AccountLocked + RateLimit (global)
├── lib/
│   ├── api/                            ✓ kept
│   ├── auth/                           ✓ kept (minus guard.tsx — rebuilt)
│   ├── queries/                        Phase 5+ adds 5 new hook files
│   ├── ws/                             ✓ kept + add use-audit-realtime
│   ├── ui/                             new: theme.ts + prefs.ts (collapsed sidebar)
│   ├── utils/                          ✓ kept
│   └── constants.ts                    ✓ kept
└── styles/
    ├── tokens.css                      Phase 5a (generated from Pencil)
    └── globals.css                     Phase 5a (Tailwind directives + tokens import)
```
