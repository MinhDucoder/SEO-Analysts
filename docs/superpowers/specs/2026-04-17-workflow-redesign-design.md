# Workflow Redesign for SEO-Analysts Microservices

**Date**: 2026-04-17
**Author**: Claude (via `/auto-decide` + superpowers:brainstorming)
**Status**: Approved (user: auto-decide)
**Scope**: Approach B (Tier × Impact matrix)

---

## Problem

`.claude/workflow/` currently ships with `WORKFLOW-AVADA.md` as the declared primary workflow. That file describes a different product (Avada SEO Suite — Shopify/Firebase/Koa/Polaris/GitLab) and is entirely irrelevant to this repo. In parallel, `.claude/CLAUDE.md` and `.claude/context/index.md` still describe the pre-refactor monolith (`apps/web` + `apps/api`), whereas the repo has moved to 5 NestJS microservices (gateway, crawler, seo-analyzer, keyword-analyzer, report) talking over gRPC + BullMQ + Redis pub/sub, with 3 separate Postgres databases and `@repo/{shared,proto,ui,…}` workspace packages.

Result: any task routed through the current workflow loads wrong domain skills, references dead paths, and misses the two risks that actually hurt this project:

1. **Proto contract changes** cascade silently through gRPC consumers.
2. **Cross-service work** (≥2 `apps/*`) skips integration smoke and lands half-broken.

## Goals

1. Replace `WORKFLOW-AVADA.md` with a project-native primary workflow.
2. Keep the familiar SMALL / MEDIUM / LARGE tiering from the existing framework.
3. Add an orthogonal **Scope Impact** axis (single-service / cross-service / proto-breaking) that can force tier escalation.
4. Re-map the 7 existing domain skills (`backend/`, `frontend/`, `database/`, `crawler/`, `seo-rules/`, `testing/`, `deployment/`) to per-service ownership.
5. Insert microservices-specific gates into KIEM DINH (proto typecheck, gRPC smoke, DB migration order, BullMQ payload compat).
6. Refresh `.claude/CLAUDE.md` and `.claude/context/index.md` so the system brain matches the microservices reality.

## Non-Goals

- Full rewrite of `context/architecture.md`, `context/data-flow.md`, `context/tech-stack.md` (user chose Approach B, not C). These get a stale banner pointing to `apps/CLAUDE.md` as the current-state source of truth.
- Changing phase ownership (THIET KE / CHIA NHO / CODE / KIEM DINH / SHIP stays owned by GStack / GSD / Superpowers / GStack / GStack respectively).
- Adding new commands or skills outside what's already installed.

## Design

### § 1. File plan

| File | Action | Rationale |
|---|---|---|
| `.claude/workflow/WORKFLOW-AVADA.md` | **DELETE** | Wrong project entirely |
| `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md` | **CREATE** | New primary project workflow (microservices-aware) |
| `.claude/workflow/WORKFLOW.md` | **UPDATE** | Redirect banner → SEO-ANALYSTS; keep as framework-agnostic reference |
| `.claude/workflow/WORKFLOW-SMALL.md` | **UPDATE** | Fix example paths to `apps/seo-analyzer/src/...`; add impact checklist |
| `.claude/workflow/WORKFLOW-MEDIUM.md` | **UPDATE** | Fix example paths; add cross-service gate |
| `.claude/workflow/WORKFLOW-LARGE.md` | **UPDATE** | Fix example paths; add proto-breaking protocol |
| `docs/workflow/WORKFLOW.md` | **UPDATE** | Mirror `.claude/` version (human-readable copy) |
| `docs/workflow/WORKFLOW-SMALL.md` | **UPDATE** | Mirror |
| `docs/workflow/WORKFLOW-MEDIUM.md` | **UPDATE** | Mirror |
| `docs/workflow/WORKFLOW-LARGE.md` | **UPDATE** | Mirror |
| `docs/workflow/WORKFLOW-SEO-ANALYSTS.md` | **CREATE** | Mirror of `.claude/` primary |
| `.claude/CLAUDE.md` | **UPDATE** | Refresh Project Overview, Key Paths, skill triggers |
| `.claude/context/index.md` | **UPDATE** | Quick reference: 5 services, ports, DBs, `@repo/*` |
| `.claude/context/architecture.md` | **BANNER** | Prepend stale-notice pointing to `apps/CLAUDE.md` |
| `.claude/context/data-flow.md` | **BANNER** | Prepend stale-notice |
| `.claude/context/tech-stack.md` | **BANNER** | Prepend stale-notice (mostly accurate except monolith references) |

Total: 2 creates, 13 updates, 1 delete.

### § 2. Size × Impact matrix

```
               single-service      cross-service          proto-breaking
┌──────────────┬───────────────────┬──────────────────────┬──────────────────┐
│ SMALL        │ SP:TDD + verify   │ → MEDIUM (forced)    │ → LARGE (forced) │
├──────────────┼───────────────────┼──────────────────────┼──────────────────┤
│ MEDIUM       │ office + quick +  │ office + quick +     │ → LARGE (forced) │
│              │ TDD + review      │ TDD + integration    │                  │
│              │                   │ smoke + review       │                  │
├──────────────┼───────────────────┼──────────────────────┼──────────────────┤
│ LARGE        │ full 5 phases     │ full + contract test │ full + proto     │
│              │                   │ + cross-svc QA       │ contract audit + │
│              │                   │                      │ staged rollout   │
└──────────────┴───────────────────┴──────────────────────┴──────────────────┘
```

**Forcing rules** (evaluated in order):

1. Change touches `packages/proto/**` (non-comment) → **LARGE + proto-breaking track**, no override.
2. Change touches ≥2 `apps/*` directories → **MEDIUM minimum** (upgrade from SMALL).
3. Change touches any Prisma `schema.prisma` or `migrations/` → **MEDIUM minimum** (migration review mandatory).
4. Change touches `@repo/shared` (constants, enums, interfaces) → **MEDIUM minimum** (consumers may break).
5. Otherwise use standard file-count tier (SMALL ≤2, MEDIUM 3–7, LARGE >7 or >2 modules).

Unsure → pick higher tier. Overlap → pick highest.

### § 3. Domain skill → service map

| Skill | Applicable services | Primary when |
|---|---|---|
| `backend/` | gateway, crawler, seo-analyzer, keyword-analyzer, report | Controllers / services / DI / guards / pipes / gRPC handlers / BullMQ processors |
| `database/` | gateway (User, Audit, RefreshToken), seo-analyzer (SeoRule, RuleResult), report (Report, ShareLink) | Prisma schema edits, migrations, indexes, queries |
| `crawler/` | **crawler only** | Playwright / Cheerio / robots.txt / Lighthouse runs |
| `seo-rules/` | **seo-analyzer only** | New rule, scoring change, analyzer interface |
| `frontend/` | (not yet applicable — apps/web not scaffolded) | Next.js 14 App Router work once landed |
| `testing/` | all services | Vitest unit/integration, e2e:smoke pipeline test |
| `deployment/` | monorepo root + per-service Dockerfile | docker-compose, Turborepo task graph, CI/CD |

Rule: **1 task = 1 primary domain skill + `superpowers:test-driven-development`**. Cross-service task → load skill for the service that initiates the change (usually the one that owns the new behaviour); treat downstream services as consumers and exercise them via integration smoke.

### § 4. Microservices gates in KIEM DINH

Standard KIEM DINH order (from existing workflow): `/review` → `/cso` → `/qa`.

New gates inserted between `/review` and `/cso`, conditional on impact level:

| Gate | When | Command |
|---|---|---|
| **Proto typecheck** | proto-breaking or cross-service | `npm run build --filter=@repo/proto && npm run type-check` (all workspaces) |
| **gRPC smoke** | cross-service or proto-breaking | `npm run e2e:smoke` — happy path gateway → crawler → seo-analyzer → keyword-analyzer → report |
| **Migration order check** | any Prisma change | Inspect `docker-entrypoint.sh` order; run `npx prisma migrate deploy` in local docker to verify |
| **BullMQ payload compat** | any BullMQ queue / `@repo/shared` change | Additive fields only; old worker must deserialize new payload |
| **Redis pub/sub compat** | any change to channel names / payloads in `@repo/shared` `REDIS_KEYS` | No collisions; versioned channel names preferred |

All gates blocking. Failure → back to CODE, re-run only the failed gate. Max 2 retries.

### § 5. Proto-breaking change protocol

Mandatory when `packages/proto/**` schema changes:

```
PR 1 — additive:
  1. Add new field as OPTIONAL in .proto (never replace / reorder tags)
  2. npm run build --filter=@repo/proto → regenerate compiled .d.ts (commit artifacts)
  3. Producer writes BOTH old and new field
  4. Consumer reads new field with fallback to old
  5. e2e:smoke passes with both old and new consumer running
  6. Deploy consumer first (via per-service Dockerfile), producer second

PR 2 — cleanup (≥1 release cycle later):
  7. Remove old field
  8. Regenerate @repo/proto, commit
  9. Producer stops writing old field
  10. Deploy in single wave (safe — no consumer still reads old)
```

Emergency deviations (e.g. security patch requiring breaking change in one PR) must be escalated to user and logged in DECISIONS log.

### § 6. System brain refresh

**`.claude/CLAUDE.md`** — changes:

- Project Overview: replace `apps/web` + `apps/api` monolith prose with "5 NestJS microservices + gRPC + BullMQ + Redis pub/sub; 3 Postgres DBs per service; DDD structure per service"
- Skills Quick Reference table: add trigger keywords `gRPC`, `proto`, `BullMQ queue`, `Redis pub/sub`, `service boundary`, `@repo/proto`, `@repo/shared`, `choreography`
- Remove stale reference to `/Users/minhducoder/SEO-Analysts/.claude/claude.md` self-link (lowercase typo preserved currently)
- Add pointer: "For current service layout + data flow, read `apps/CLAUDE.md` (authoritative)"

**`.claude/context/index.md`** — changes:

- Replace Project key paths table with 5-service table (gateway:3000+50051, crawler:50052, seo-analyzer:50053, keyword-analyzer:50054, report:3004+50055)
- Replace "Feature Modules (7 NestJS modules)" with "Services (5 NestJS microservices)"
- Add Shared Packages section (`@repo/shared`, `@repo/proto`, `@repo/ui`, `@repo/typescript-config`, `@repo/eslint-config`)
- Add Database Boundary section: 3 DBs (`seo_gateway`, `seo_analyzer`, `seo_report`)
- Add Redis Usage section (BullMQ queues, pub/sub channels, caches)

### § 7. Stale banner template

For `context/architecture.md`, `context/data-flow.md`, `context/tech-stack.md`:

```markdown
> **⚠ STALE (as of 2026-04-17)**: This file describes the pre-refactor monolith (`apps/web` + `apps/api`).
> The repo is now 5 NestJS microservices. For current-state truth, read:
> - `apps/CLAUDE.md` — cross-service map + data flow
> - `apps/<service>/CLAUDE.md` — per-service DDD layout
> - `.claude/context/index.md` — quick reference
> This file retained for historical context only; do NOT use for planning decisions.
```

Banner is 1st line block of each file; existing content kept below untouched.

## Alternatives Considered

- **A. Minimal rewrite (AVADA → SEO-ANALYSTS 1:1 style)** — rejected: doesn't address proto / cross-service risk which is the real reason for the redesign.
- **C. Pipeline-native rewrite (abandon tier naming)** — rejected: too much mental-model churn for a solo graduation project; breaks continuity with the superpowers/GSD/GStack phase taxonomy.

## Open Questions

None blocking. Documented choices:

- **OQ-1**: Keep `docs/workflow/` mirror of `.claude/workflow/` for human reading? **Decided: yes, auto-mirror.** Both get updated together in the plan.
- **OQ-2**: Rewrite `context/*.md` fully or banner? **Decided: banner only (Approach B scope).**
- **OQ-3**: Add `frontend/` skill activation to workflow now? **Decided: no — note "pending apps/web scaffold" in domain map. Reactivate when Next.js app lands.**

## Testing / Validation

This is a documentation change; validation is inspection-based:

1. Grep for any remaining reference to `WORKFLOW-AVADA.md` after changes — should return zero.
2. Grep for `apps/web/` and `apps/api/` in workflow files — should only appear in banners or historical context.
3. Manual smoke: re-invoke `/vi` or `/auto-decide` on a hypothetical task and verify Claude loads correct domain skill based on the new map.
4. `.claude/CLAUDE.md` + `context/index.md` describe same service set (5) — no drift.

## Rollout

Single atomic commit containing all file changes. No runtime impact (docs only). If a future task proves the workflow wrong, file-level reversible via `git revert`.

## Success Criteria

- Zero references to Avada / Shopify / Firebase / Polaris / Koa anywhere in `.claude/workflow/` or `.claude/CLAUDE.md`.
- All example paths in WORKFLOW-SMALL/MEDIUM/LARGE resolve to files that actually exist today (or clearly marked "future / apps/web pending").
- Size detection rules explicitly mention `packages/proto/**`, `@repo/shared`, and Prisma schema as escalation triggers.
- KIEM DINH phase documents the 5 microservices gates with concrete commands.
- A developer (human or AI) reading `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md` cold can identify correct tier + gates for: (a) a title-analyzer tweak (SMALL / single-service), (b) a new rule requiring a new crawler field (MEDIUM / cross-service, no proto change), (c) adding a new gRPC method to the analyzer service (LARGE / proto-breaking).
