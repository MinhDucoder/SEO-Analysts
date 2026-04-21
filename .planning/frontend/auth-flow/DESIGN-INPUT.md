---
phase: 0
feature_slug: auth-flow
tier: large
status: approved
date: 2026-04-18
---

# Phase 0 — Design Input Digest

## Sources consumed

| File | Sections used |
|---|---|
| [docs/design/auth-flow/PRD.md](../../../docs/design/auth-flow/PRD.md) | All — 16 acceptance criteria, 9 user stories |
| [docs/design/auth-flow/DESIGN.md](../../../docs/design/auth-flow/DESIGN.md) | All — folder delta, components, data flow, routes, decisions |
| [docs/design/auth-flow/mockups/REFERENCES.md](../../../docs/design/auth-flow/mockups/REFERENCES.md) | Layout spec (no image mockup needed) |
| [docs/design/30-frontend-architecture.md](../../../docs/design/30-frontend-architecture.md) | §5 auth module (store, client, guard), §6.3 mutation patterns |
| [docs/design/31-page-specs.md](../../../docs/design/31-page-specs.md) | §2 login, §3 register, §4 verify, §5 forgot, §6 reset, §7 oauth callback |

## Requirements (from PRD)

**Goal:** Wire the 6 public auth pages + real token refresh + route guards so
that `/login → /dashboard` works end-to-end against the gateway.

**16 acceptance criteria** (summary):

1. `(auth)` route group with centered-card layout (logo + form).
2-7. 6 page implementations (login, register, verify-email, forgot-password,
   reset-password, oauth-success) each with RHF + zod + TanStack mutation +
   Vietnamese UI + correct error handling.
8. `tryRefresh()` real impl calling `POST /auth/refresh`.
9. `lib/auth/hooks.ts`: `useAuth`, `useLogout`, `useAuthBootstrap`.
10. `lib/auth/guard.tsx`: `<AuthGuard>`, `<AdminGuard>`.
11. `queryKeys.auth.me` populated.
12. `<AuthBootstrap>` mounted inside providers before children.
13. `lib/auth/schemas.ts` exports 4 zod schemas.
14. Unit (RTL) + at least one E2E smoke test.
15. Full Vietnamese localization.
16. Submit buttons disabled + spinning while pending.

## Technical direction (from DESIGN)

- **Framework:** Next.js 14 App Router route group `(auth)`.
- **Forms:** `react-hook-form` + `@hookform/resolvers/zod`.
- **State:** Zustand auth store (already shipped slug 1, unchanged shape).
- **Mutations:** TanStack Query mutation hooks in `lib/auth/mutations.ts`.
- **Guards:** Client components wrapping `(app)` future route groups.
- **OAuth:** Full-page redirect to `gateway/auth/google`, callback to
  `/oauth-success?token=<jwt>`.
- **Refresh strategy:** on app mount (via `<AuthBootstrap>`) + on 401
  response (interceptor in `api/client.ts`).

## Visual references

- No dedicated mockup. Card layout derivable from
  [32-design-system.md §7.3](../../../docs/design/32-design-system.md) + logo
  from web-bootstrap.

## Tier classification

| Trigger | Match? |
|---|---|
| Touches authentication | ✅ (directly wires real auth) |
| Multi-page | ✅ (6 pages) |
| New API / proto / BullMQ | ❌ (all endpoints EXIST) |

→ **Tier = Large** (locked).
→ **Impact = auth-wiring** (no backend touch; replaces slug 1 stubs).

## Phase 0 status

✅ PRD + DESIGN + mockup refs present. Ready for Phase 1.
