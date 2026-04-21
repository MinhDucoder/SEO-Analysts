---
phase: 0
feature_slug: dashboard-shell
tier: large
status: approved
---

# Phase 0 — Design Source Validation

## Sources consumed

- **PRD**: [docs/design/dashboard-shell/PRD.md](../../../docs/design/dashboard-shell/PRD.md)
  (130 lines, 18 AC, 8 user stories)
- **DESIGN**: [docs/design/dashboard-shell/DESIGN.md](../../../docs/design/dashboard-shell/DESIGN.md)
  (folder delta + 12 components + data flow + API table + decisions)
- **Mockups**: [docs/design/dashboard-shell/mockups/REFERENCES.md](../../../docs/design/dashboard-shell/mockups/REFERENCES.md)
  pointing to `docs/design/stitch_d_n_m_i/dashboard/{code.html,screen.png}`
- Cross-refs:
  - [docs/design/30-frontend-architecture.md](../../../docs/design/30-frontend-architecture.md) §2, §3.1, §4, §5
  - [docs/design/31-page-specs.md](../../../docs/design/31-page-specs.md) §8 (Dashboard)
  - [docs/design/32-design-system.md](../../../docs/design/32-design-system.md) §2.7 (Sidebar dark), §7.8 (Sidebar component), §7.9 (ProgressBar), §7.10 (ScoreGauge)

## Requirements (from PRD)

**Must ship:**

1. `(app)` route group layout — `<AuthGuard><DashboardShell>{children}</DashboardShell></AuthGuard>`.
2. `<Sidebar>` — dark fixed w-64, 5 nav items (Dashboard, Audit, So sánh, Quản trị*, Cài đặt), active-state, UserMenuCard footer.
3. `<MobileNav>` — hamburger + drawer (< lg).
4. `<Header>` — page title map + search stub + bell stub + "+ Audit mới" CTA.
5. `/dashboard` page — 4 StatCards + ScoreGaugeHero + RecentAudits list + ScoreTrendChart (30d), all computed from single `useRecentAudits()` query.
6. `<DashboardEmpty>` — shown when 0 audits.
7. Loading skeleton at page level.
8. Tests (pay via `fe-test-harness` skill): RTL per widget + page smoke + e2e happy-path.

**Not shipping (out-of-scope):**

- `/audits/*`, `/settings/*`, `/admin/*` pages (slugs 4-8).
- Notification drawer logic, search backend wiring (stubs only).
- Dark-mode toggle.
- Realtime audit progress (slug 5).

## Technical direction (from DESIGN)

- **Folder delta** — adds `app/(app)/{layout,dashboard/page}`, `components/{layout,dashboard,common}/*`, `lib/dashboard/{aggregates,chart-data}.ts`, `lib/api/audits.ts`, `lib/queries/use-audits.ts`.
- **Components** — 18 new (7 layout, 7 dashboard, 3 common, 1 hero).
- **Data flow** — single `useRecentAudits({ limit: 30 })` → client-side aggregate via `computeStats(audits, now)` + `buildTrendSeries(audits)`.
- **API consumed** — `GET /audits?limit=30` (EXISTS), `POST /auth/logout` (shipped slug 2), `GET /auth/me` (shipped slug 2).
- **No WebSocket** in slug 3.
- **No proto impact**.
- **New dependency** — `recharts` (sanctioned in 30 §1 as "Recharts hoặc Tremor"; auto-decide pick = Recharts per bundle-size).
- **Reuse from slug 2** — `<AuthGuard>`, `useAuth`, `useLogout`, `useMeQuery`, `ROUTES`, `queryKeys.auth.me`.
- **Reuse from slug 1** — all shadcn primitives, tokens, logo.svg, `classify()` from `@repo/shared`.

## Visual references

- `docs/design/stitch_d_n_m_i/dashboard/code.html` — bento grid layout
- `docs/design/stitch_d_n_m_i/dashboard/screen.png` — pixel reference

Adaptations (noted in REFERENCES.md):
- Material Symbols → lucide-react.
- "Analytica Pro" wordmark → "SEO Analyst".
- 8+ sidebar nav items → 5 (only routes our project owns).
- Drop Top Keywords table + Priority Issues (belong to slug 5/6).
- Drop FAB (header CTA sufficient).

## Tier classification

**Large** — justified by:
- Multi-file feature (18+ components, 2+ hooks, 2+ utils).
- Layout shell consumed by 4 future slugs (blast radius high).
- Adds new dependency (`recharts`) that affects bundle size.
- Auth-wired (reuses slug 2 guard / hooks).
- Needs full gate suite (type-check, lint, test, /review, /design-review, /qa) per Phase 5 table.

Confidence on tier: **high** (no ambiguity — clearly > Medium scope).
