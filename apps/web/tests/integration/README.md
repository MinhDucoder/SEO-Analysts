# FE↔BE Integration Tests (Layer 4)

These Playwright specs hit a **real gateway + real Postgres + real Redis**.
They live outside `vitest` (L1/L2) and outside the mock-only Playwright
config (L3) on purpose — see `.claude/skills/fe-be-integration/SKILL.md`.

## Prerequisites

```bash
# 1. Start the backend stack (gateway + 3 Postgres + Redis + 4 worker services).
npm run docker:up

# 2. Confirm gateway is healthy.
curl http://localhost:3000/api/v1/health
# Expect: { "status": "ok", "services": { ... all true ... } }

# 3. Test users (seeded by the gateway entrypoint).
#    Password for every test user: Admin1234!
#    See tests/integration/fixtures/test-users.ts
```

## Run

```bash
# Opt-in only — env flag prevents accidental runs in CI / pre-commit.
PLAYWRIGHT_INTEGRATION=true npm run test:integration

# UI mode for debugging.
PLAYWRIGHT_INTEGRATION=true npm run test:integration:headed
```

## What we cover

| Spec | Wire-level assertion |
|---|---|
| `auth-login.spec.ts` | Cookie `refresh_token` is HttpOnly + path-scoped; access token shape matches `AuthSession` |
| `auth-locked-modal.spec.ts` | Locked user → 403 → global modal opens |
| `auth-bad-credentials.spec.ts` | Wrong password → 401, no cookie set |
| `admin-role-gate.spec.ts` | Regular user → `/admin/*` → bounced to `/dashboard` |
| `admin-stats.spec.ts` | Admin token → `/admin/stats` returns the documented shape |
| `rate-limit-login.spec.ts` | 11 rapid login attempts → 429 + RateLimit modal copy |

## What we explicitly DON'T cover here

- Full audit pipeline (crawl → analyze → report). That's the backend
  `npm run e2e:smoke` script's job.
- Google OAuth real callback (Google API flakiness + cost). The stub
  endpoint is exercised in L3 via `page.route` mocks.
- WebSocket realtime updates — Phase 6c WS hook is unit-tested at L2;
  full WS round-trip needs the audit pipeline working.
