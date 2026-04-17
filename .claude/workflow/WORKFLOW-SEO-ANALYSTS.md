# Workflow SEO Analysts — Primary Project Workflow

> Adaptation of `WORKFLOW.md` (Superpowers + GSD + GStack) to the SEO-Analysts microservices monorepo.
> Read this BEFORE starting any non-trivial task.

## Stack thực tế

```
apps/
  gateway/           → NestJS, public HTTP+WS, auth, orchestrator   (3000 HTTP, 50051 gRPC)
  crawler/           → Playwright + Cheerio + Lighthouse            (50052 gRPC only)
  seo-analyzer/      → 20 SEO rules + Prisma                        (50053 gRPC only)
  keyword-analyzer/  → TF + placement + density, stateless          (50054 gRPC only)
  report/            → Aggregate + PDF + compare                    (3004 HTTP, 50055 gRPC)
packages/
  @repo/shared              → constants, enums, interfaces
  @repo/proto               → .proto + compiled .d.ts
  @repo/ui                  → shadcn/ui shared components
  @repo/typescript-config   → tsconfig bases (nestjs, nextjs)
  @repo/eslint-config       → shared ESLint configs
```

**DDD per feature-module** (nested inside each service):
```
apps/<service>/src/<feature>/
  ├── controllers/    → HTTP + gRPC handlers
  ├── services/       → Application use cases
  ├── domain/         → Entities, value objects, rules
  └── persistence/    → Repositories (Prisma) — when feature owns data
apps/<service>/src/infra/   → Shared cross-feature infra (prisma, grpc clients, redis, websocket)
```
Concrete examples:
- `apps/seo-analyzer/src/analyzer/{controllers,services,domain}/`
- `apps/gateway/src/{audits,auth,admin,health}/{controllers,services,dto}/` + `apps/gateway/src/infra/{grpc,redis,websocket,prisma}/`
- `apps/crawler/src/crawler/{controllers,services,domain,persistence,infra}/`
- `apps/report/src/report/{controllers,services,domain,persistence}/` + `apps/report/src/infra/{prisma,redis,pdf}/`

**Inter-service communication**:
- **gRPC** — synchronous request/response (gateway → other services)
- **BullMQ** — async fan-out jobs (`crawl.start`, `analyze.start`, `keyword.start`, `report.start`)
- **Redis pub/sub** — progress/choreography events (`audit.progress`, `analyze.done`, `keyword.done`, `report.done`, …)

**3 Postgres DBs** (per-service boundary): `seo_gateway`, `seo_analyzer`, `seo_report`. No service reads another's DB.

**CI/CD**: GitHub Actions. Deploy target: Vercel (future apps/web) + Railway (services) + Supabase (DBs). Cost target <$40/month.

## Framework & Phase Ownership

```
THIET KE ──> CHIA NHO ──> CODE ──────────> KIEM DINH ─────> SHIP
 GStack       GSD          Superpowers      GStack            GStack
```

| Framework | Phase Owned | Installed |
|---|---|---|
| GStack | THIET KE, KIEM DINH, SHIP | Global: `~/.claude/skills/gstack/` |
| GSD | CHIA NHO | Plugin |
| Superpowers | CODE (TDD inside each task) | Plugin v5.0.7 |

**Phase owner decides HOW. Co-owner decides WHEN/ORDER.**
**Output phase N = mandatory input phase N+1. Conflict → earlier phase wins.**

## Size × Impact Matrix

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
│              │                   │ + cross-svc QA       │ audit + staged   │
│              │                   │                      │ rollout          │
└──────────────┴───────────────────┴──────────────────────┴──────────────────┘
```

**Forcing rules** (evaluate in order — first match wins):

1. Change to `packages/proto/**` (non-comment-only) → **LARGE + proto-breaking**. No override.
2. Change touches ≥2 `apps/*` directories → **MEDIUM minimum**.
3. Change to any `prisma/schema.prisma` or `prisma/migrations/` → **MEDIUM minimum**.
4. Change to `@repo/shared` (constants, enums, interfaces) → **MEDIUM minimum**.
5. Else, standard file-count tier: SMALL ≤2, MEDIUM 3–7, LARGE >7 files or >2 modules.

**Overlap → pick highest tier. Unsure → pick higher.**

## Domain Skill → Service Map

| Skill | Applicable services | Primary when |
|---|---|---|
| `backend/` | gateway, crawler, seo-analyzer, keyword-analyzer, report | Controllers, services, DI, gRPC handlers, BullMQ processors, Socket.IO gateways |
| `database/` | gateway (User, Audit, RefreshToken), seo-analyzer (SeoRule, RuleResult), report (Report, ShareLink) | Prisma schema edits, migrations, indexes, queries, transactions |
| `crawler/` | **crawler** only | Playwright, Cheerio, robots.txt, Lighthouse programmatic runs |
| `seo-rules/` | **seo-analyzer** only | New SEO rule, scoring logic, analyzer interface |
| `frontend/` | (pending `apps/web` scaffold) | Next.js 14 App Router work once web app lands |
| `testing/` | all services | Vitest unit/integration, `npm run e2e:smoke` pipeline test |
| `deployment/` | monorepo root + per-service Dockerfile | docker-compose, Turborepo task graph, GitHub Actions CI/CD |

**Rule**: 1 task = 1 primary domain skill + `superpowers:test-driven-development`. Cross-service task → skill loads for the **initiating** service (the one that owns the new behaviour); downstream services exercised via integration smoke.

## Project security rules (blocking in KIEM DINH)

- **No `console.log`** in production code
- **No hardcoded credentials** — env vars / `.env.docker` only
- **`REDIS_PASSWORD`** required for Redis access
- **JWT verification** on all public endpoints (gateway)
- **No `eval()`, no `dangerouslySetInnerHTML`** with unsanitized user input
- **Rate limit** public endpoints (`@nestjs/throttler`)
- **Default DENY** service-to-service (only gateway exposed publicly)
- **No secrets** committed: `.env*`, `*.pem`, `*.key` in `.gitignore`

Check via `/cso` + `code-reviewer` agent.

## Microservices gates in KIEM DINH

Inserted between `/review` and `/cso` when impact ≠ single-service:

| Gate | When | Command |
|---|---|---|
| Proto typecheck | proto-breaking or cross-service | `npm run build --filter=@repo/proto && npm run type-check` |
| gRPC smoke | cross-service or proto-breaking | `npm run e2e:smoke` |
| Migration order | any Prisma change | Inspect `apps/<service>/docker-entrypoint.sh`; run `docker compose up` locally |
| BullMQ payload compat | queue / `@repo/shared` change | Additive fields only — old worker must deserialize new payload |
| Redis pub/sub compat | channel name / payload change | No collisions; versioned channel names preferred |

Blocking. Fail → back to CODE, re-run only the failed gate. Max 2 retries → STOP, escalate.

## Proto-breaking change protocol

Mandatory when `packages/proto/**` schema changes:

```
PR 1 — additive:
  1. Add new field as OPTIONAL in .proto (never replace / reorder tags)
  2. npm run build --filter=@repo/proto  → regenerate compiled artifacts (commit)
  3. Producer writes BOTH old + new field
  4. Consumer reads new field with fallback to old
  5. npm run e2e:smoke passes with old + new consumer mixed
  6. Deploy consumer first, producer second

PR 2 — cleanup (≥1 release cycle later):
  7. Remove old field from .proto
  8. Regenerate @repo/proto, commit
  9. Producer stops writing old field
  10. Deploy in single wave (safe — no consumer still reads old)
```

Emergency (security patch requiring breaking change in one PR) → escalate to user + log in `docs/auto-decide/DECISIONS-*.md`.

## Step-by-step per tier

### SMALL — single-service, ≤2 files, no arch change

```
1. Load domain skill (backend / database / crawler / seo-rules / testing / deployment)
2. superpowers:test-driven-development
   - Write failing Vitest test
   - Run → RED: `npm run test --filter=<service>`
   - Implement minimal code
   - Run → GREEN
3. superpowers:verification-before-completion
   - Full suite: `npm run test --filter=<service>`
   - Lint: `npm run lint --filter=<service>`
4. git commit + done
```

Skip THIET KE, CHIA NHO, SHIP.

### MEDIUM — 3–7 files, 1 module (single-service or cross-service)

```
1. THIET KE (GStack light):
   /office-hours  → 6 forcing questions (what, who, edges, constraints, success)

2. CHIA NHO (GSD quick):
   gsd:quick --discuss  → 2–4 atomic tasks

3. CODE (per task):
   - Load domain skill for initiating service
   - superpowers:test-driven-development:
     RED → GREEN → REFACTOR → atomic commit
   - Cross-service? Also update integration smoke (e2e:smoke) if new flow

4. KIEM DINH:
   /review  → staff-engineer review, auto-fix obvious
   Conditional microservices gates (if cross-service): proto typecheck + e2e:smoke
   Fail? Back to CODE. Max 2 retries.

5. git commit + done
```

Skip SHIP (push to feature branch, no PR ceremony).

### LARGE — multi-module, arch change, OR proto-breaking

```
1. THIET KE:
   /office-hours                          (mandatory)
   /plan-eng-review                       (mandatory — arch lock-in)
   /plan-ceo-review                       (optional — strategic scope)
   If proto-breaking: write impact doc → which consumers break, rollout order

2. CHIA NHO:
   gsd:discuss-phase N                    (capture decisions → CONTEXT.md)
   gsd:plan-phase N                       (atomic XML plans, wave-based)

3. CODE:
   gsd:execute-phase N                    (waves, fresh context per task)
   Inside each task: superpowers:test-driven-development
   If proto change → follow proto-breaking protocol (PR 1 additive FIRST)

4. KIEM DINH:
   /review  +  /cso  +  /qa
   All applicable microservices gates (proto + gRPC smoke + migration + BullMQ + pub/sub)
   Full e2e:smoke

5. SHIP:
   /ship                  (sync main, tests, create PR)
   /land-and-deploy       (merge, verify CI + Railway deploy)
   /canary                (post-deploy monitoring)
   Proto-breaking → staged Docker rollout (consumer first, then producer)
```

## Failure handling

```
KIEM DINH fail → back to CODE → fix → re-run ONLY failed check
Max 2 retries → STOP, escalate to user:
  - Remaining issues list
  - Options: continue fixing / skip / abandon
```

## Size escalation mid-task

```
Scope grows beyond current tier during CODE →
  STOP → re-classify → restart from first skipped phase
  Code already written is KEPT
```

Specific triggers (auto-escalate):
- Discover change touches `packages/proto/` during SMALL/MEDIUM → **force LARGE**
- Discover change touches ≥2 `apps/*` during SMALL → **force MEDIUM minimum**
- Discover Prisma schema needs change → **force MEDIUM minimum** (migration review)

## Cross-phase context

```
THIET KE (arch notes)      → CHIA NHO reads before planning
CHIA NHO (task plans)      → CODE reads before implementing
CODE (test results + ctx)  → KIEM DINH reads before reviewing
KIEM DINH (review results) → SHIP reads before shipping

Conflict → earlier phase's locked decisions win.
```

## Specialized agents (this project)

| Agent | Use case | Phase |
|---|---|---|
| `code-reviewer` | Code quality + security + best practices | KIEM DINH |
| `debugger` | Bug diagnosis, stack traces, race conditions | CODE (fix loop) |
| `db-reader` | Read-only Postgres investigation | Discover / THIET KE |
| `data-scientist` | Data analysis + metrics + SEO perf | Discover / THIET KE |
| `backend-architect` | NestJS module design + API boundaries | THIET KE |
| `Explore` / `Plan` | Codebase exploration / architecture planning | Any |

## Cheat sheets

**Small (single-service):**
`SP:TDD → SP:verify → commit`

**Medium (single-service):**
`/office-hours → gsd:quick → SP:TDD → /review → commit`

**Medium (cross-service):**
`/office-hours → gsd:quick → SP:TDD → proto typecheck + e2e:smoke → /review → commit`

**Large (proto-breaking):**
`/office-hours + /plan-eng-review → gsd:discuss + gsd:plan → gsd:execute (TDD + proto PR 1 additive) → /review + /cso + /qa + all microservices gates → /ship + /land-and-deploy + /canary`

## See also

- Framework-agnostic reference: [WORKFLOW.md](WORKFLOW.md)
- Detailed tier guides: [WORKFLOW-SMALL.md](WORKFLOW-SMALL.md) · [WORKFLOW-MEDIUM.md](WORKFLOW-MEDIUM.md) · [WORKFLOW-LARGE.md](WORKFLOW-LARGE.md)
- Current service truth: `apps/CLAUDE.md` (cross-service map) + `apps/<service>/CLAUDE.md` (per-service)
- System brain: [.claude/CLAUDE.md](../CLAUDE.md)
- Context quick reference: [.claude/context/index.md](../context/index.md)
