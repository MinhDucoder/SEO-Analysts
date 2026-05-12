# apps/web STATE — Phase 6b complete, Phase 6c pending

> **Last update**: 2026-05-12
> **Branch**: `feat/web-fresh` HEAD `49dd0ce`
> **Dev URL**: http://localhost:3001 (`npm run dev --workspace=@seo/web`)

---

## ✅ Phase 6b — DONE (3 commits)

| Commit | What |
|---|---|
| `b5d676f` | API + hooks foundation: `api/scheduled` CRUD, `api/audits.createAudit`, `queryKeys.scheduled`, `useCreateAudit`, full `use-scheduled` hook set (list + create + pause/resume + delete with optimistic patches), zod `createAuditFormSchema` + `createScheduledAuditFormSchema`, vi/en i18n for `audits.create` + full `scheduled` namespace |
| `1a79800` | `/audits/new` page — full form (URL + keyword + mode segmented control + max-pages when site) → POST /audits → success card with auditId mono + View detail + Create another |
| `49dd0ce` | `/scheduled` page + 6 components — table (URL/cron mono/mode/lastRun/lastScore/status pill/actions) + create dialog (with cron 5-field validation) + skeleton + empty + error |

### Phase 6b routes shipped
- `/audits/new` — single-page form for `POST /audits`. Renders an inline success state with the new auditId (`/audits/:id` link will work once Phase 6c lands the detail page).
- `/scheduled` — list with pause/resume toggle (optimistic) + delete + Create-schedule dialog. Empty state CTAs the dialog; error state offers retry.

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (same 2 pre-existing input.tsx warnings)
- `vitest run`: **66/66 PASS** (unchanged)
- `next build`: PASS — **21 static routes** (vi/en × 10 + dynamic reset-password + 404). New bundle sizes: `/audits/new` 5.28KB, `/scheduled` 12.6KB.

### Outstanding gaps after Phase 6b
1. `/audits/:id` detail (heaviest page) — Phase 6c. Form's "View detail" link 404s until then.
2. Scheduled-audit detail (`GET /scheduled-audits/:id`) endpoint exists but is not yet wired — no UI consumer needs it yet.
3. Cron preview ("next run at X") — not implemented; could enhance dialog UX later.

### Pickup hints for Phase 6c (`/audits/[id]` — 9 states + WS realtime + modals)
- Add hooks: `useAudit(id)` + `useAuditStatus(id)` + `useAuditRealtime(id)` (lib/ws/use-audit-realtime.ts) + `useCreateShareLink`/`useRevokeShareLink`.
- Reuse `StatusPipeline` domain component for In-Progress states (Phase 5b shipped it).
- Wire Pencil AuditDetail modal flows: Share + Delete (Pencil frames exist as overlays).
- 9 states: Completed, Completed/AltView (radar swap), 3× InProgress (Crawling/Analyzing/Reporting), Failed, Empty (404), Modal/Share, Modal/Delete.

---

## ✅ Phase 6a — DONE (4 commits)

| Commit | What |
|---|---|
| `232f117` | app shell layout (`(app)/layout.tsx`) + auth bootstrap gating (`bootstrapped` flag on store, AuthGuard + landing wait for it) + delete /showcase smoke routes + AppShellRouted breadcrumb auto-derive |
| `210b22b` | `useAuditsList` + `useDeleteAudit` query hooks, `api/audits.deleteAudit`, AuditStatusBadge, i18n keys (nav/auditStatus/dashboard/audits), `useDebouncedValue` |
| `498e0b5` | `/dashboard` page + 7 components (StatCard, ScoreGaugeHero, ScoreTrendChart, RecentAuditsCard, DashboardEmpty, DashboardError, DashboardSkeleton) |
| `2bf710e` | `/audits` list page + 7 components (AuditFilterBar, AuditTable, AuditTableSkeleton, AuditsEmpty, AuditsError, AuditsPagination) + Suspense wrap on OAuthSuccessPage so prerender works |

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (same 2 pre-existing input.tsx warnings)
- `vitest run`: **66/66 PASS** (8 test files — unchanged)
- `next build`: PASS — 17 static routes (vi/en × {landing, audits, oauth-success, dashboard, forgot-password, login, register} + dynamic reset-password + 404). Dashboard bundle: ~105KB (recharts).

### Phase 6a routes shipped
- `/dashboard` — bento grid (hero + 4 stat cards + trend chart + recent audits) with skeleton/empty/error states.
- `/audits` — filter bar (search/status/sort/order/clear) + 7-column table + pagination + skeleton/empty/no-results/error500 states.
- `/` → redirects to `/dashboard` (authed) or `/login` (guest); both wait for AuthBootstrap to complete.
- `(app)/layout.tsx` wraps every authed page with `AuthGuard` + `AppShellRouted`. Breadcrumbs auto-derive from the pathname against the `nav` i18n namespace.

### Pickup hints for Phase 6b
- New routes: `/audits/new` + `/scheduled` (list + create + pause/resume/delete).
- Add query hooks: `useCreateAudit`, `useScheduledAudits`, `useCreateScheduledAudit`, `usePauseSchedule`, `useResumeSchedule`, `useDeleteSchedule`.
- BACKEND-API has CreateAuditDto + CreateScheduledAuditDto specs.

---

## ✅ Phase 5 — DONE (6 commits)

| Commit | Phase | What |
|---|---|---|
| `1f45cba` | **5a** | Tokens (58 vars) + Tailwind config + globals.css + 11 shadcn primitives |
| `480b32b` | **5a-i18n** | next-intl v4 (VN+EN, `[locale]` segment, `as-needed` prefix) |
| `32dde88` | **5b** | 8 domain components + `/showcase` smoke route |
| `a102cf3` | tests | classify.ts unit tests updated to Pencil tokens |
| `1e872c3` | **5c** | AppShell — Sidebar/Topbar/Wrapper + theme toggle + locale switcher + collapsed mode |
| `929a92e` | **5d** | 5 auth pages + auth i18n strings + AuthBootstrap + AuthGuard |

### Backup branches
- `feat/web-legacy-snapshot` (pushed to origin) — pre-wipe rollback point

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (2 prop-types warnings on input.tsx — harmless TS forwardRef)
- `vitest run`: **66/66 PASS** (8 test files)
- `next build`: PASS — 7 static routes (vi/en × {/, /showcase} + 404), middleware 36.2KB

---

## File inventory — 72 source files

### `src/styles/`
- `tokens.css` — generated from Pencil 58 vars (RGB triplets, dark via `:root[data-theme='dark']`)
- `globals.css` — Tailwind directives + shadcn-compat aliases mapped to tokens

### `src/i18n/`
- `routing.ts` — locales=['vi','en'], defaultLocale='en' (user-flipped from 'vi'), localePrefix='as-needed'
- `request.ts` — getRequestConfig with hasLocale validation
- `navigation.ts` — locale-aware Link/useRouter/usePathname/redirect/getPathname

### `src/messages/`
- `vi.json` + `en.json` — namespaces: app, common, nav, theme, locale, auth.{common,login,register,forgot,reset,oauth}

### `src/middleware.ts` — createMiddleware(routing)

### `src/components/ui/` — 11 shadcn primitives
button.tsx · input.tsx · label.tsx · card.tsx · badge.tsx · separator.tsx · skeleton.tsx · dialog.tsx · dropdown-menu.tsx · tabs.tsx · sonner.tsx

### `src/components/domain/` — 8 Pencil reusables
score-ring.tsx · score-delta.tsx · category-bars.tsx · category-radar.tsx · cwv-card.tsx · rule-result-row.tsx · keyword-table.tsx · status-pipeline.tsx · index.ts (barrel)

### `src/components/layout/`
- `sidebar/{header,nav-item,footer,index}.tsx`
- `topbar.tsx`, `app-shell.tsx`
- `theme-toggle.tsx`, `locale-switcher.tsx`

### `src/components/auth/`
- `auth-shell.tsx` (public header + centered card)
- `auth-form-field.tsx` (labeled input + error + eye toggle)
- `password-rules.tsx` (live 4-rule checklist)
- `google-button.tsx` (link to gateway /auth/google)
- `auth-bootstrap.tsx` (silent refresh on mount)

### `src/lib/` (mostly preserved from legacy)
- `api/{audits,auth,client,types}.ts` — ky + refresh logic ✓ kept
- `auth/{store,hooks,mutations,schemas}.ts` ✓ kept
- `auth/guard.tsx` — rebuilt minimal AuthGuard
- `queries/{keys,use-audits}.ts` ✓ kept
- `ws/client.ts` ✓ kept (Socket.IO singleton)
- `utils/{cn,format,classify}.ts` ✓ kept (classify class names updated)
- `dashboard/{aggregates,chart-data}.ts` ✓ kept
- `constants.ts` ✓ kept (ROUTES + API_URL/WS_URL)
- `ui/theme.ts` — new: Zustand theme store + ThemeApplier
- `ui/prefs.ts` — new: sidebarCollapsed persist

### `src/app/`
- `[locale]/layout.tsx` — html/body root + NextIntlClientProvider + Inter/JetBrains
- `[locale]/page.tsx` — temporary landing (Phase 6a will redirect to /dashboard or /login)
- `[locale]/showcase/page.tsx` — Phase 5b smoke (8 domain components)
- `[locale]/showcase/app-shell/page.tsx` — Phase 5c smoke (full AppShell)
- `[locale]/(auth)/{login,register,forgot-password,reset-password/[token]}/page.tsx`
- `[locale]/auth/oauth-success/page.tsx`
- `providers.tsx` — QueryClient + ThemeApplier + AuthBootstrap + Toaster

### `tests/`
- `setup.ts`, `msw/{handlers,server}.ts`, `helpers/render.tsx`
- `unit/{auth-schemas,auth-store,classify,cn,format,dashboard-aggregates,dashboard-chart-data,mutations}.test.{ts,tsx}` — 66 tests

---

## Routes shipped (12 functional + 2 smoke)

Public:
- `/` and `/en` — landing (temporary)
- `/login`, `/register`, `/forgot-password` — public auth forms
- `/reset-password/[token]` — 4 states: default, success, invalid, missing-token
- `/auth/oauth-success` — 4 phases: loading, success, missing, invalid

Smoke (remove in Phase 6+):
- `/showcase` — 8 domain components
- `/showcase/app-shell` — full AppShell layout

---

## Phase 6+ Roadmap

| # | Phase | Scope | Effort |
|---|---|---|---|
| 1 | **6a** | `/dashboard` overview + `/audits` list (filter + skeleton + empty + error500) | 75m |
| 2 | **6b** | `/audits/new` + `/scheduled` list/create/pause/resume/delete | 60m |
| 3 | **6c** | `/audits/[id]` — heaviest (9 states + WS realtime + share/delete modals) | 135m |
| 4 | **6d** | `/audits/compare` | 60m |
| 5 | **6e** | `/shared/[token]` public report (3 states: default/lowscore/notfound) | 60m |
| 6 | **7a** | `/settings/profile` + `/settings/password` (tab pattern) | 60m |
| 7 | **7b** | `/admin/{stats,users,rules}` (role-guarded) | 90m |
| 8 | **8** | Global modals (AccountLocked 403 + RateLimit 429) wired to ky afterResponse | 30m |
| 9 | **9** | E2E + integration tests (fe-test-harness L1-L3 + fe-be-integration L4) | 120m |

**Total remaining**: ~11 hours focused implementation.

---

## Outstanding issues / known gaps

1. **localePrefix 'as-needed' + defaultLocale change**: User flipped defaultLocale 'vi' → 'en' mid-Phase 5b. All routes work; LocaleSwitcher correctly preserves current pathname when switching.

2. **Smoke routes still public**: `/showcase` and `/showcase/app-shell` are reachable in production build. Phase 6a will delete or gate behind dev-only flag.

3. **Reset-password params**: Fixed during 5d — Next 14.2 uses sync `params`, not Promise. If we ever upgrade Next 15, revert to `params: Promise<...>`.

4. **Domain components untested**: 8 new domain components + 8 layout components have NO unit tests. Phase 9 covers via fe-test-harness skill.

5. **WS realtime not wired**: `lib/ws/client.ts` singleton exists but no `useAuditRealtime` hook yet. Built in Phase 6c.

6. **Auth pages missing toasts**: Errors surface via `useLogin`/`useRegister` onError → toast.error. Tested loosely — verify with real gateway in Phase 6/9 (fe-be-integration L4 skill).

7. **/api hooks gap**: Per INVENTORY §3, Phase 6+ needs new hook files:
   - `lib/queries/use-audits.ts` add: `useCreateAudit`, `useAuditsList`, `useAudit`, `useAuditStatus`, `useDeleteAudit`, `useCreateShareLink`, `useRevokeShareLink`
   - `lib/queries/use-compare.ts`
   - `lib/queries/use-scheduled.ts`
   - `lib/queries/use-user.ts`
   - `lib/queries/use-admin.ts`
   - `lib/queries/use-shared.ts`
   - `lib/ws/use-audit-realtime.ts`

8. **No 403/429 global handler**: Phase 8 wires gateway's 403 (AccountLocked) and 429 (RateLimit) into modal overlays via ky afterResponse interceptor.

9. **Test stack**: Vitest runs in jsdom; Playwright e2e infra deleted in wipe. Phase 9 re-adds via fe-test-harness skill.

---

## Pickup instructions for new session

```
Resume @seo/web Phase 6.

Read apps/web/.planning/STATE.md for current status, then:
1. Verify dev server: `npm run dev --workspace=@seo/web` (port 3001)
2. Verify build: `cd apps/web && ../../node_modules/.bin/tsc --noEmit && ../../node_modules/.bin/vitest run`
3. Start Phase 6a: build /dashboard + /audits list per INVENTORY §2.
4. Source of truth for design: design/system-tokens.pen (Pencil) — open via VS Code pencil extension if visual reference needed.
5. Source of truth for API: design/BACKEND-API.md (REST + WS + DTO + enums).

INVENTORY map: apps/web/.planning/phase-5/INVENTORY.md
Token regen script: apps/web/.planning/phase-5/export-tokens.py
```

### Critical context

- Dev server cache pitfall: do NOT run `next build` while `next dev` is active — they share `.next/` and clobber each other. Stop dev → build → restart dev.
- next-intl: routes nest under `[locale]`. Use `@/i18n/navigation` for Link/useRouter so href auto-prefixes locale.
- Theme: `data-theme` attr on `<html>`, applied by ThemeApplier component reading useThemeStore. Persists in localStorage.
- Auth: AuthBootstrap calls `tryRefresh()` once on mount. If refresh succeeds, store hydrates from `/auth/me`. AuthGuard composes around any authed page.
- Toasts: `import { toast } from 'sonner'` — Toaster already mounted in providers.

### Recommended Phase 6a entry

1. Delete `/showcase` + `/showcase/app-shell` (Phase 5 smoke routes) — or move under `_dev/` if want to keep for design QA
2. Create `[locale]/(app)/layout.tsx` wrapping children with `<AuthGuard><AppShell>{children}</AppShell></AuthGuard>`
3. Update `[locale]/page.tsx` to redirect: unauthed → /login, authed → /dashboard
4. Build `[locale]/(app)/dashboard/page.tsx`:
   - Use existing `useRecentAudits` hook
   - Render Score gauge (ScoreRing) + 3 stat cards + 5 recent audit rows
   - States: loading (skeletons), empty (CTA to /audits/new), error
5. Build `[locale]/(app)/audits/page.tsx`:
   - Filter bar (status/date/score)
   - Table with 7 columns matching Pencil AuditList/Default
   - Empty + Loading (skeleton 8 rows) + Error500 (per Pencil Page/AuditList/Error500)
   - Pagination

### Commit format

`feat(web/phase-6a): <description>` — atomic per logical unit. Verify tsc + vitest before each commit.
