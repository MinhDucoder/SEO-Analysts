# apps/web STATE — Phase 9 complete, FE feature work landed

> **Last update**: 2026-05-12
> **Branch**: `feat/web-fresh` HEAD `Phase 9` (just committed)
> **Dev URL**: http://localhost:3001 (`npm run dev --workspace=@seo/web`)
> **All Phase 1–9 features shipped.** The branch is feature-complete pending
> the L4 `fe-be-integration` pass (requires a running gateway + DB).

---

## ✅ Phase 9 — Test harness hardening — DONE

| File | What |
|---|---|
| `tests/unit/user-schemas.test.ts` | 8 tests covering `updateProfileSchema` (2–100 char fullName) + `changePasswordSchema` (new ≠ current, confirm matches, ≥8 chars, empty current rejected). |
| `tests/unit/global-modal-store.test.ts` | 7 tests: open/close, default + custom `contactEmail`, Retry-After clamp/floor, latest-wins ordering. |
| `tests/unit/ky-interceptor.test.ts` | 5 tests via MSW: 403 `code='ACCOUNT_LOCKED'` opens AccountLocked; 403 with message `'locked'` (without 'verify') also opens it; 403 with `'verify'` does NOT (it's the unverified-email signal, surfaced as toast); 429 Retry-After honoured; 429 missing header → 60s default. |
| `tests/unit/auth-admin-selector.test.ts` | 4 tests covering `isAdmin()` across no-user / role=user / role=admin / post-`clearAuth()`. |

**Test totals**: 66 → **90** tests (8 files → 12 files). All pass in 2.5s.

**L4 status (per project memory `feedback_fe_be_integration_skill`)**: deferred until a running gateway + Postgres docker stack is available. The slugs that would qualify (`auth/session`, `oauth`, `rate-limit`, `admin`) are now all implemented and ready for the L4 pass.

---

## ✅ Phase 8 — Global 403/429 modals — DONE

| File | What |
|---|---|
| `lib/ui/global-modal-store.ts` | Zustand store, single-modal-at-a-time invariant. State `{ kind, retryAfterSec, contactEmail }`. `open()` overload for either modal kind. Negative `Retry-After` clamps to 0; fractional values floor. |
| `lib/api/client.ts` | ky `afterResponse` expanded — 401 path unchanged (silent refresh + replay). 403: inspects body `code === 'ACCOUNT_LOCKED'` first, falls back to message-contains-`locked` minus the `verify` false-positive. 429: reads `Retry-After` header, defaults to 60s. Both call `useGlobalModalStore.getState().open(...)`. |
| `components/global/account-locked-modal.tsx` | Ban icon hero + contact-email mono + Sign-out CTA (clearAuth + `router.replace(/login)`). |
| `components/global/rate-limit-modal.tsx` | Clock hero + per-second countdown driven by `setInterval`. |
| `app/providers.tsx` | Both modals mounted once at root inside `QueryClientProvider`. |
| `messages/{vi,en}.json` | `globalModal.accountLocked` + `globalModal.rateLimit` namespaces. |

### Trap caught
The gateway also surfaces `403 EMAIL_NOT_VERIFIED` on login. The interceptor must NOT open AccountLocked for that case (mutations.ts already toasts a different message). The fix: gate the message-substring fallback on `!message.includes('verify')`. Tested in `tests/unit/ky-interceptor.test.ts`.

---

## ✅ Phase 7b — Admin pages — DONE

| File | What |
|---|---|
| `lib/api/admin.ts` | `listAdminUsers`, `updateUserLock`, `getAdminStats`, `listAdminRules`, `updateAdminRules`. |
| `lib/api/types.ts` | `AdminUser`, `AdminStats`, `SeoRule`, `ListAdminUsersQuery`, `UpdateRulesDto`, `AdminPaginated<T>` (meta wrapper distinct from `Paginated<T>`). |
| `lib/queries/use-admin.ts` | `useAdminStats(period)`, `useAdminUsers(filters)` with `placeholderData: prev`, `useUpdateUserLock` with optimistic-rollback (snapshots every cached users-list query before flipping), `useAdminRules`, `useUpdateAdminRules`. All gated on `accessToken !== null && role === 'admin'` so a stale non-admin session never triggers 403 noise. |
| `lib/auth/admin-guard.tsx` | Role gate composed inside the outer `AuthGuard` — non-admin → `/dashboard`. |
| `lib/constants.ts` | Sidebar "Quản trị" now points at `ROUTES.adminStats` (was `adminUsers`). |
| `messages/{vi,en}.json` | `admin.stats`, `admin.users`, `admin.rules` namespaces. |
| `components/admin/admin-stats-cards.tsx` | 5 overview cards + 2 today cards + top-5 domains card. |
| `components/admin/admin-users-filters.tsx` | Search + role + lock filter + clear. |
| `components/admin/admin-users-table.tsx` | 7-col table with `Lock/Unlock` action gated against self-lock (`isSelf = me?.id === row.id`). |
| `components/admin/admin-rules-table.tsx` | Per-row weight input (1–10), batch save sending only dirty rules; visual dirty marker via border colour. |
| `(app)/admin/{layout,page,stats,users,rules}/page.tsx` | Routes + AdminGuard wrap + redirect index. |

### Phase 7b routes shipped (+4)
- `/admin` (299 B redirect → `/admin/stats`)
- `/admin/stats` (6.6 KB / 142 KB)
- `/admin/users` (7.37 KB / 143 KB)
- `/admin/rules` (2.04 KB / 138 KB)

---

## ✅ Phase 7a — DONE

| File | What |
|---|---|
| `lib/api/user.ts` | `updateProfile(dto)` → `PATCH /users/profile`, `changePassword(dto)` → `PATCH /users/password`. Both use the authed `api` client. |
| `lib/auth/schemas.ts` | Added `updateProfileSchema` (fullName 2–100) + `changePasswordSchema` (current required, new ≥8, confirm matches, new ≠ current). |
| `lib/queries/use-user.ts` | `useUpdateProfile` mirrors the new fullName into the auth store + invalidates `auth.me`. `useChangePassword` clears the auth store + flushes the entire query cache on success, since the gateway revokes every refresh token (including the current session). Vietnamese-aware `describeUserError` maps 400/401/403/429. |
| `lib/constants.ts` | `ROUTES.settingsSecurity` → `ROUTES.settingsPassword` (path is now `/settings/password`). `PAGE_TITLE_MAP` updated. |
| `messages/{vi,en}.json` | `settings` namespace: title/subtitle, tabs.{profile,password}, profile.* (form labels + role/createdAt callout), password.* (warning banner + 3 fields). |
| `components/settings/settings-shell.tsx` | Header (title + subtitle) + tab nav. Tabs are Link-based (each tab is a route), styled to match the shadcn `TabsTrigger` token visually (underline on active state). |
| `components/settings/profile-form.tsx` | RHF + zod form. Editable `fullName`, read-only `email` (mono, disabled), role badge + createdAt callout in a muted strip. Save button gated by `isDirty`; reset to the new payload on success. `useEffect` re-syncs the form when AuthBootstrap finishes after first mount. |
| `components/settings/password-form.tsx` | Current + new + confirm fields, all with eye toggles. Live 4-rule `<PasswordRules>` reused from auth slug. Amber warning callout ("All sessions will be signed out"). On success: toast + reset + `router.push(ROUTES.login)` (the mutation already cleared the store). |
| `app/[locale]/(app)/settings/page.tsx` | Server component that `redirect()`s `/settings` → `/settings/profile` per locale. |
| `app/[locale]/(app)/settings/profile/page.tsx` | `<SettingsShell active="profile"><ProfileForm /></SettingsShell>`. |
| `app/[locale]/(app)/settings/password/page.tsx` | `<SettingsShell active="password"><PasswordForm /></SettingsShell>`. |

### Phase 7a routes shipped
- `/settings`             — redirect index → `/settings/profile`
- `/settings/profile`     — RHF form: fullName + read-only email + role/createdAt callout
- `/settings/password`    — RHF form: current + new + confirm + live 4-rule checklist + amber callout

Tabs share the same header so navigating between tabs keeps the page chrome stable. AppShellRouted breadcrumb auto-derives ("Cài đặt > Hồ sơ" / "Cài đặt > Mật khẩu") off the existing `nav.{settings,profile,password}` i18n keys.

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (same 2 pre-existing input.tsx warnings)
- `vitest run`: 66/66 PASS
- `next build`: PASS — **26 routes** total. Bundles: `/settings` 297B, `/settings/password` 1.62KB / 168KB, `/settings/profile` 5.49KB / 172KB (heavier because of the dayjs format + Badge import for the role/createdAt strip).

### Browser smoke (no backend)
- `/{vi,en}/settings`, `/settings/profile`, `/settings/password` — all three routes are wrapped by the `(app)/layout.tsx` AuthGuard and redirect unauthed visitors to `/login`. No 404s, no client crashes.
- Forms render path verified at build time + via tsc/vitest. End-to-end happy-path (Save changes → store hydration, Update password → /login bounce) requires a live gateway and will be exercised by Phase 9 `fe-be-integration` (L4).

### Outstanding gaps after Phase 7a
1. Avatar upload not wired — the `UpdateProfileDto.avatarUrl` field is in the API surface but the form has no upload widget. Defer until Pencil ships the avatar drawer (or until S3/uploads is in scope).
2. `/settings/password` deletes the auth state but does not call `POST /auth/logout` server-side — the gateway already revokes everything on `PATCH /users/password` so it's redundant. Keeping the note in case the contract changes.
3. No specific success animation between Save → store hydration; the form just becomes `!isDirty` and the toast fires. Acceptable for now.

### Pickup hints for Phase 7b (`/admin/{stats,users,rules}`)
- Role-guarded: wrap inside an `AdminGuard` (or reuse `AuthGuard` + a `useAuthStore.isAdmin()` check at the route segment level).
- New hooks: `useAdminStats`, `useAdminUsers`, `useAdminRules`, `useUpdateRule`, `useUpdateUserRole`, `useDeleteUser`.
- Pencil frames: `AdminStats/Default`, `AdminUsers/Default`, `AdminRules/Default`.

---

## ✅ Phase 6e — DONE

| File | What |
|---|---|
| `lib/api/shared.ts` | New `publicApi` ky instance (no auth interceptor, no refresh hook) + `getSharedReport(token)` calling `GET /shared/audits/:token`. |
| `lib/queries/use-shared.ts` | `useSharedReport(token)` — react-query v5 hook. `networkMode: 'always'` so the query surfaces network errors instead of pausing (default `'online'` would otherwise stick on `fetchStatus: 'paused'` whenever the gateway is unreachable, never reaching `isError`). 404 short-circuits retry. 5-minute staleTime. |
| `lib/queries/keys.ts` | Added `queryKeys.shared.detail(token)`. |
| `messages/{vi,en}.json` | New `sharedReport` namespace — header badge, public notice, classification labels, low-score notice, section titles, target-keyword copy, loading / not-found / error / retry, CTA card. |
| `components/shared-report/public-header.tsx` | Slim public header — logo + product name + "Public report" badge + theme toggle + locale switcher. No user controls. |
| `components/shared-report/shared-skeleton.tsx` | 4-card loading skeleton matching hero / categories / CWV / rules layout. |
| `components/shared-report/shared-not-found.tsx` | `Ban` icon 96 + "Report not available" copy + CTA to `/`. Used for HTTP 404 (revoked/unknown token). |
| `components/shared-report/shared-error.tsx` | `TriangleAlert` + generic error copy + manual `Retry` button. Used for non-404 failures including the react-query paused state. |
| `components/shared-report/shared-report-view.tsx` | Full report renderer — hero (ScoreRing 160 + URL + domain + classification badge + `createdAt` relative), category breakdown (Bars ↔ Radar toggle), CwvCard, rule list grouped by `CATEGORY_ORDER`, target keyword card, KeywordTable. Low-score variant is data-driven from `report.classification` ∈ `{fair, poor}` (warn-coloured banner + warn badge). |
| `app/[locale]/shared/[token]/page.tsx` | Orchestrator. **Outside `(app)` route group → no AuthGuard, no AppShell.** State branches: missing token / loading (incl. `fetchStatus === 'fetching'`) / HTTPError 404 / any other failure (incl. `paused` catchall) / success. Renders `PublicHeader` + body + persistent `Open SEO Analyst` CTA card. |

### Phase 6e route shipped
- `/shared/[token]` — public report view. `/{vi,en}/shared/:token` paths both work, locale-aware. Page is dynamic (ƒ) in the build manifest: 5.33KB / First Load 276KB (heavy because of recharts + category-bars + keyword-table).

### Browser smoke (no backend)
- `/{vi,en}/shared/{invalid-token-test, fresh-restart-token}` render the SharedError card after retries exhaust → "Couldn't load the report" / "Không tải được báo cáo" + Retry button.
- PublicHeader shows logo + theme toggle + locale switcher in both locales.
- Persistent CTA card "Want to audit your own site? Open SEO Analyst" survives state changes.
- No console errors. AuthBootstrap silently fails over (gateway off) without leaking onto the public route.

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (same 2 pre-existing input.tsx warnings)
- `vitest run`: 66/66 PASS
- `next build`: PASS — **23 routes**, `/[locale]/shared/[token]` dynamic (ƒ) 5.33KB / First Load 276KB.

### Trap encountered (worth remembering)
react-query v5 defaults to `networkMode: 'online'`. On a network-level fetch failure (`CONNECTION_REFUSED`, etc.) it transitions the query to `fetchStatus: 'paused'` instead of error, even with `navigator.onLine === true`. The page must either pass `networkMode: 'always'` on the hook (we do) **AND** treat the paused fetchStatus as a non-loading state in the orchestrator (we did this too in the catchall — `query.isError || !query.data` after the loading branch). Without both, the page renders SharedNotFound forever in dev when the gateway is off.

### Outstanding gaps after Phase 6e
1. With backend off we cannot verify the SUCCESS branch end-to-end. The render path is unit-test-clean (tsc + vitest pass) and the build artifact is the same shape as the other Phase 6 pages. Will need an L4 fe-be-integration test once Phase 9 lands.
2. The `report.targetKeyword.verdict` arrives as an English-only string from the gateway. Phase 7+ may want a translation map for the common verdicts.
3. The CTA card sits below every state including the loading skeleton — harmless but slightly noisy. Could be hidden during initial load if it visually competes with the skeleton; deferring as polish.

### Pickup hints for Phase 7a (`/settings/profile` + `/settings/password`)
- Re-use the existing tab pattern (shadcn `Tabs`).
- New hooks: `useMe()` (already in store via AuthBootstrap), `useUpdateProfile()`, `useChangePassword()`.
- Pencil frames: `Settings/Profile`, `Settings/Password` (with the 4-rule live checklist already shipped in Phase 5d via `<PasswordRules>`).
- All routes go back under `(app)/settings/...` so they're guarded.

---

## ✅ Phase 6d — DONE (3 commits)

| Commit | What |
|---|---|
| `ab6aa2b` | `compareAudits(a1, a2)` + `CompareResult`/`CompareRuleDelta` types, `queryKeys.audits.compare`, `useCompareAudits`, `auditCompare` i18n namespace (vi + en) |
| `66f66ca` | 4 components: `AuditPicker` (search + select, two-state card), `CompareSummary` (twin ScoreRings + ScoreDelta), `CompareRuleDeltaRow` (statusBefore → statusAfter badges + delta pill), `CompareIssues` (Fixed / Newly-failed lists) |
| `340af33` | `/audits/compare` page — URL-synced picks (`?audit1=&audit2=`), exclusive picks, Suspense wrap for prerender, instructional / loading / error / loaded branches |

### Phase 6d route shipped
- `/audits/compare?audit1=&audit2=` — pick 2 completed audits, see scoreDelta + rule changes + fixed/new issues. Pickers exclude each other so the same audit can't be picked twice. URL state means the comparison is shareable.

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (same 2 pre-existing input.tsx warnings)
- `vitest run`: 66/66 PASS
- `next build`: PASS — **23 routes**, `/audits/compare` static (●) at 3.99KB First Load 150KB.

### Outstanding gaps after Phase 6d
1. Picker pulls the recent 20 COMPLETED audits per query. Filtering still works (search input + debounce), but if a user picks an audit older than the most recent 20 via URL deep-link, the picker shows only the auditId mono until the URL audit appears in a later list page. Acceptable for now — Phase 6e/7 can add a direct lookup if needed.
2. The page assumes both audits are completed; the server returns an error otherwise. The retry button + error banner cover this case.

### Pickup hints for Phase 6e (`/shared/[token]`)
- Public route (no AuthGuard). Server component preferred — drop the `(app)` route group, place under `[locale]/shared/[token]/page.tsx`.
- Add `getSharedReport(token)` api + `useSharedReport(token)` (no auth header).
- 3 states per Pencil: Default (full report) · LowScore variant · Error/NotFound (revoked or expired).
- Reuse the existing CompletedReport-like sections but with the public header instead of AppShell.

---

## ✅ Phase 6c — DONE (4 commits)

| Commit | What |
|---|---|
| `7be071b` | API + types + WS hook: `AuditDetail`/`ReportDetail` types (proto-style enums kept verbatim), `getAudit`/`getAuditStatus`/`createShareLink`/`revokeShareLink` + `auditExportUrl`, `useAudit`/`useAuditStatus` (auto-poll until terminal) + `useCreateShareLink`/`useRevokeShareLink`, `useAuditRealtime` (Socket.IO subscribe + cache patching on `audit:progress`/`completed`/`failed`), `lib/audits/proto-map.ts`, full `auditDetail` i18n namespace (vi + en) |
| `20fd645` | 5 state components: `CompletedReport` (hero + Bars/Radar toggle + CWV + grouped rules + target keyword + KeywordTable), `InProgressState` (StatusPipeline + progress bar + stage messages), `FailedState`, `NotFoundState`, `AuditDetailSkeleton` |
| `e70c942` | 2 modals: `ShareDialog` (mint link → Copy / Revoke, resets state on re-open), `DeleteDialog` (confirm + cache invalidate + bounce to /audits) |
| `fd2fc5b` | `/audits/[id]` page wiring header + status-driven body + WS subscription + Share/Delete modals |

### Phase 6c route shipped
- `/audits/[id]` — 9 states covered:
  1. Loading (skeleton)
  2. NotFound (404 from `useAudit`)
  3. Pending / Crawling / Analyzing / Reporting → `InProgressState`
  4. Failed → `FailedState`
  5. Completed → `CompletedReport`
  6. Modal/Share (overlay)
  7. Modal/Delete (overlay)

### Quality gates
- `tsc --noEmit`: PASS
- `eslint .`: PASS (same 2 pre-existing input.tsx warnings)
- `vitest run`: 66/66 PASS
- `next build`: PASS — **22 routes**, `/audits/[id]` is dynamic (ƒ) at 29.3KB First Load 288KB (heavy because of recharts radar + recharts line for trends).

### WebSocket wiring
`useAuditRealtime(auditId)` subscribes on mount, listens for `audit:progress` (patches `queryKeys.audits.status` cache), `audit:completed` + `audit:failed` (invalidates the detail query), and unsubscribes + emits `audit:unsubscribe` on unmount. The fallback `useAuditStatus` 3-second poll is gated off once the WS ack arrives so we don't double-fetch.

### Outstanding gaps after Phase 6c
1. Audit `errorMessage` arrives via the audit row; if a Failed audit's row hasn't been refetched yet the FailedState shows the i18n fallback message. The WS `audit:failed` event invalidation handles the common case.
2. Share dialog stores the minted token only in component state — re-opening the dialog after a successful share but without minting again shows the "Generate" CTA. A future `GET /audits/:id/share/status` endpoint could surface the live token.
3. Rerun button uses the same URL + targetKeyword but loses mode + maxUrls (not stored on the audit row). Acceptable: most rerun cases are single-page audits.

### Pickup hints for Phase 6d (`/audits/compare`)
- Add `useCompareAudits(audit1, audit2)` hook (`GET /audits/compare?audit1=&audit2=`).
- Reuse `CategoryBars` + `ScoreDelta` + `RuleResultRow` for delta display.
- 2× audit selector (typeahead off the existing `useAuditsList(search)`).
- `CompareResult` from BACKEND-API §5 — proto-style enum quirk applies (reuse `proto-map.ts`).

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
