# Workflow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `.claude/workflow/WORKFLOW-AVADA.md` (wrong project) with an SEO-Analysts-native microservices workflow; add Size × Impact matrix; refresh `.claude/CLAUDE.md` + `.claude/context/index.md`; banner stale context docs.

**Architecture:** Documentation-only change. 1 delete, 2 creates, 13 updates. Each file gets its own atomic commit with grep-based validation (no runtime tests apply). `.claude/workflow/` and `docs/workflow/` are kept in sync — each tier file is edited in both places in the same commit.

**Tech Stack:** Markdown only. Validation via `rg` (ripgrep) / `grep` and manual inspection.

**Spec:** `docs/superpowers/specs/2026-04-17-workflow-redesign-design.md`

---

## File structure (what this plan produces)

| File | Action |
|---|---|
| `.claude/workflow/WORKFLOW-AVADA.md` | DELETE |
| `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md` | CREATE |
| `docs/workflow/WORKFLOW-SEO-ANALYSTS.md` | CREATE (mirror) |
| `.claude/workflow/WORKFLOW.md` | UPDATE (redirect banner) |
| `docs/workflow/WORKFLOW.md` | UPDATE (mirror) |
| `.claude/workflow/WORKFLOW-SMALL.md` | UPDATE (paths + impact checklist) |
| `docs/workflow/WORKFLOW-SMALL.md` | UPDATE (mirror) |
| `.claude/workflow/WORKFLOW-MEDIUM.md` | UPDATE (paths + cross-service gate) |
| `docs/workflow/WORKFLOW-MEDIUM.md` | UPDATE (mirror) |
| `.claude/workflow/WORKFLOW-LARGE.md` | UPDATE (paths + proto-breaking) |
| `docs/workflow/WORKFLOW-LARGE.md` | UPDATE (mirror) |
| `.claude/CLAUDE.md` | UPDATE (system brain refresh) |
| `.claude/context/index.md` | UPDATE (5-service quick ref) |
| `.claude/context/architecture.md` | UPDATE (stale banner) |
| `.claude/context/data-flow.md` | UPDATE (stale banner) |
| `.claude/context/tech-stack.md` | UPDATE (stale banner) |

---

### Task 1: Delete WORKFLOW-AVADA.md

**Files:**
- Delete: `.claude/workflow/WORKFLOW-AVADA.md`

- [ ] **Step 1: Verify file exists**

Run: `ls -la /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-AVADA.md`
Expected: file listed (~13 KB)

- [ ] **Step 2: Delete file**

Run: `rm /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-AVADA.md`
Expected: no output

- [ ] **Step 3: Verify deletion + no stale references anywhere**

Run: `rg -l "WORKFLOW-AVADA" /Users/minhducoder/SEO-Analysts/.claude/ /Users/minhducoder/SEO-Analysts/docs/ || echo "NO REFERENCES"`
Expected: `NO REFERENCES`. If any file listed, note paths — they will be cleaned up in later tasks (WORKFLOW.md in Task 6 is the known one).

Known: `.claude/workflow/WORKFLOW.md` has a banner line referencing AVADA; that is fixed in Task 6. This grep is a sanity probe for OTHER files we didn't expect.

- [ ] **Step 4: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add -A .claude/workflow/
git commit -m "$(cat <<'EOF'
chore(workflow): remove WORKFLOW-AVADA.md (wrong project)

This file described Avada SEO Suite (Shopify/Firebase/Koa/Polaris)
and was never applicable to SEO-Analysts. Replaced in next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Create WORKFLOW-SEO-ANALYSTS.md (primary)

**Files:**
- Create: `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md`
- Create: `docs/workflow/WORKFLOW-SEO-ANALYSTS.md` (mirror — identical content)

- [ ] **Step 1: Write content to `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md`**

Use Write tool with the following exact content:

````markdown
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

**DDD per service**: `controllers/` + `services/` + `domain/` + `persistence/` + `infra/`

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
````

- [ ] **Step 2: Mirror content to `docs/workflow/WORKFLOW-SEO-ANALYSTS.md`**

Run: `cp /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SEO-ANALYSTS.md`

- [ ] **Step 3: Validate content**

Run (expected output after each `|`):
```bash
rg "Avada|Shopify|Firebase|Polaris|Koa|Firestore" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SEO-ANALYSTS.md || echo CLEAN
```
Expected: `CLEAN`

```bash
rg "apps/(web|api)/" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SEO-ANALYSTS.md || echo CLEAN
```
Expected: `CLEAN` (apps/web mentioned only in "pending apps/web scaffold", which is OK — verify manually)

Actually, the string "apps/web" DOES appear in "pending apps/web scaffold". Adjust:
```bash
rg "apps/(web|api)/" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md
```
Expected: 0 matches (the file uses `apps/web` without trailing slash for the pending note, and `apps/<service>/` for services).

```bash
rg "packages/proto|@repo/shared|gRPC|BullMQ|Redis pub/sub" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md | wc -l
```
Expected: ≥8 matches

- [ ] **Step 4: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/workflow/WORKFLOW-SEO-ANALYSTS.md docs/workflow/WORKFLOW-SEO-ANALYSTS.md
git commit -m "$(cat <<'EOF'
docs(workflow): add WORKFLOW-SEO-ANALYSTS primary workflow

Microservices-aware workflow with Size × Impact matrix, proto-breaking
change protocol, per-service domain skill map, and microservices gates
(proto typecheck, gRPC smoke, migration order, BullMQ compat, pub/sub
compat) for KIEM DINH phase.

Mirrored to docs/workflow/ for human reading.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update WORKFLOW.md (redirect banner)

**Files:**
- Modify: `.claude/workflow/WORKFLOW.md` (lines 1–6)
- Modify: `docs/workflow/WORKFLOW.md` (lines 1–3)

- [ ] **Step 1: Update `.claude/workflow/WORKFLOW.md`**

Current top of file (lines 1–7):
```
# 3-Framework Workflow

> **→ For Avada SEO Suite: read [WORKFLOW-AVADA.md](WORKFLOW-AVADA.md) first (domain skills map + project rules + CI/CD).**
> This file is the framework-agnostic reference.
>
> Superpowers + GSD + GStack — unified development workflow

```

Replace with:
```
# 3-Framework Workflow

> **→ For SEO-Analysts: read [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) first (microservices workflow + domain skill map + proto-breaking protocol).**
> This file is the framework-agnostic reference.
>
> Superpowers + GSD + GStack — unified development workflow

```

Use Edit tool with the full 7-line block as `old_string` and the new 7-line block as `new_string`.

- [ ] **Step 2: Update `docs/workflow/WORKFLOW.md`**

This file is missing the AVADA banner — it only needs a new banner added. Current top (lines 1–3):
```
# 3-Framework Workflow

> Superpowers + GSD + GStack — unified development workflow
```

Replace with:
```
# 3-Framework Workflow

> **→ For SEO-Analysts: read [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) first (microservices workflow + domain skill map + proto-breaking protocol).**
> This file is the framework-agnostic reference.
>
> Superpowers + GSD + GStack — unified development workflow
```

- [ ] **Step 3: Validate both files now reference SEO-ANALYSTS and not AVADA**

Run:
```bash
rg "WORKFLOW-AVADA" /Users/minhducoder/SEO-Analysts/.claude/workflow/ /Users/minhducoder/SEO-Analysts/docs/workflow/ || echo CLEAN
rg "WORKFLOW-SEO-ANALYSTS" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW.md
```
Expected:
- First: `CLEAN`
- Second: both files show the `WORKFLOW-SEO-ANALYSTS.md` reference

- [ ] **Step 4: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/workflow/WORKFLOW.md docs/workflow/WORKFLOW.md
git commit -m "$(cat <<'EOF'
docs(workflow): redirect WORKFLOW.md banner to SEO-ANALYSTS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Update WORKFLOW-SMALL.md (paths + impact checklist)

**Files:**
- Modify: `.claude/workflow/WORKFLOW-SMALL.md`
- Modify: `docs/workflow/WORKFLOW-SMALL.md` (identical edits)

- [ ] **Step 1: Edit `.claude/workflow/WORKFLOW-SMALL.md`**

**Edit A** — Fix example path. Current lines 52–66:

```
## Example: Fix title analyzer returning wrong score

```
Task: Title analyzer returns 0 instead of penalty score when title > 60 chars

1. CODE:
   - Write test: expect(analyzeTitle("a".repeat(61))).toEqual({ score: 70, ... })
   - Run → FAILS (returns score: 0)
   - Fix: src/seo-engine/rules/on-page/title.analyzer.ts line 42
   - Run → PASSES

2. KIEM DINH:
   - Run: npm run test → all pass
   - Done
```
```

Replace with:
```
## Example: Fix title analyzer returning wrong score

```
Task: Title analyzer returns 0 instead of penalty score when title > 60 chars
Service: seo-analyzer (single-service, 1 file)

1. CODE:
   - Load domain skill: seo-rules
   - Write test: expect(analyzeTitle("a".repeat(61))).toEqual({ score: 70, ... })
   - Run → FAILS (returns score: 0)
   - Fix: apps/seo-analyzer/src/domain/analyzers/on-page/title.analyzer.ts
   - Run → PASSES: npm run test --filter=seo-analyzer

2. KIEM DINH:
   - Run: npm run test --filter=seo-analyzer → all pass
   - Run: npm run lint --filter=seo-analyzer → clean
   - Done
```
```

**Edit B** — Add impact pre-check section before the existing "Phases Active" section. Insert after line 4 (before `## Phases Active`):

```
## Pre-flight impact check (MANDATORY before starting)

```
Before coding, confirm the change is TRULY single-service + ≤2 files:

☐ Does it touch packages/proto/** ?   → YES: STOP, escalate to LARGE (proto-breaking)
☐ Does it touch ≥2 apps/* dirs ?      → YES: STOP, escalate to MEDIUM
☐ Does it touch prisma/schema.prisma ? → YES: STOP, escalate to MEDIUM
☐ Does it touch @repo/shared ?         → YES: STOP, escalate to MEDIUM

All NO → proceed with SMALL.
```

```

**Edit C** — Update "Cheat Sheet" at end. Current lines 68–72:
```
## Cheat Sheet

```
SP:TDD (test -> fail -> implement -> pass) -> SP:verify -> done
```
```

Replace with:
```
## Cheat Sheet

```
impact-check → load domain skill → SP:TDD → SP:verify → commit → done
```
```

- [ ] **Step 2: Mirror edits to `docs/workflow/WORKFLOW-SMALL.md`**

Run: `cp /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SMALL.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SMALL.md`

- [ ] **Step 3: Validate**

Run:
```bash
rg "src/seo-engine" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SMALL.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SMALL.md || echo CLEAN
rg "apps/seo-analyzer/src/domain/analyzers" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SMALL.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SMALL.md
rg "Pre-flight impact check" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SMALL.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-SMALL.md
```
Expected:
- First: `CLEAN`
- Second: both files match
- Third: both files match

- [ ] **Step 4: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/workflow/WORKFLOW-SMALL.md docs/workflow/WORKFLOW-SMALL.md
git commit -m "$(cat <<'EOF'
docs(workflow): update SMALL tier with impact pre-check + correct paths

- Add mandatory pre-flight impact checklist (proto / ≥2 apps / prisma / @repo/shared)
- Fix example path from src/seo-engine/ to apps/seo-analyzer/src/domain/analyzers/
- Update cheat sheet to include impact-check step

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Update WORKFLOW-MEDIUM.md (paths + cross-service gate)

**Files:**
- Modify: `.claude/workflow/WORKFLOW-MEDIUM.md`
- Modify: `docs/workflow/WORKFLOW-MEDIUM.md` (identical edits)

- [ ] **Step 1: Edit `.claude/workflow/WORKFLOW-MEDIUM.md`**

**Edit A** — Fix example (lines 58–79). Current:

```
## Example: Add new SEO rule — check Open Graph tags

```
Task: Add og:title, og:description, og:image analyzer

1. THIET KE:
   /office-hours
   → Clarify: which OG tags, scoring weight, penalty logic

2. CHIA NHO:
   gsd:quick --discuss
   → Task 1: Create og-tags.analyzer.ts with interface
   → Task 2: Register in rule-registry, add weight
   → Task 3: Add to frontend display

3. CODE (per task):
   → Task 1: write og-tags.analyzer.spec.ts → RED → implement → GREEN
   → Task 2: write registry.spec.ts update → RED → implement → GREEN
   → Task 3: write component test → RED → implement → GREEN

4. KIEM DINH:
   /review → staff-engineer review, auto-fix issues
```
```

Replace with:

```
## Example: Add new SEO rule — check Open Graph tags

```
Task: Add og:title, og:description, og:image analyzer
Service: seo-analyzer (single-service — frontend display pending apps/web)
Impact: single-service (no proto, no cross-service, no shared schema)

1. THIET KE:
   /office-hours
   → Clarify: which OG tags, scoring weight, penalty logic, integration with registry

2. CHIA NHO:
   gsd:quick --discuss
   → Task 1: Create apps/seo-analyzer/src/domain/analyzers/on-page/og-tags.analyzer.ts + interface
   → Task 2: Register in apps/seo-analyzer/src/services/rule-registry.service.ts, add weight
   → Task 3: Add DB entry via Prisma seed (apps/seo-analyzer/prisma/seed.ts)

3. CODE (per task) — load domain skill: seo-rules
   → Task 1: write og-tags.analyzer.spec.ts → RED → implement → GREEN → commit
   → Task 2: write registry integration test → RED → update registry → GREEN → commit
   → Task 3: update seed + run `npx prisma db seed` → verify inserted → commit

4. KIEM DINH:
   /review → staff-engineer review, auto-fix issues
   npm run test --filter=seo-analyzer → all pass
   npm run lint --filter=seo-analyzer → clean
   (No cross-service gates — impact = single-service)
```
```

**Edit B** — Add "Cross-service variant" section before `## Failure Handling` (new section). Find the line `## Failure Handling` and insert BEFORE it:

```
## Cross-service variant (when change touches ≥2 services)

Same 4 steps above, PLUS between steps 3 and 4:

```
3.5 Integration smoke:
    npm run build --filter=@repo/proto       (regen if proto touched)
    npm run type-check                        (all workspaces — catch consumer breaks)
    npm run e2e:smoke                         (happy-path pipeline test)
```

KIEM DINH step 4 adds the microservices gates for cross-service impact:
- Proto typecheck (if proto touched or consumer changed)
- gRPC smoke (e2e:smoke)
- BullMQ payload compat check (if @repo/shared or queue payload changed)

Fail any gate → back to CODE → fix → re-run ONLY failed gate. Max 2 retries.

```

**Edit C** — Update Cheat Sheet (end of file). Current lines 98–102:
```
## Cheat Sheet

```
/office-hours -> gsd:quick --discuss -> SP:TDD -> /review -> done
```
```

Replace with:

```
## Cheat Sheet

```
Single-service:  /office-hours -> gsd:quick --discuss -> SP:TDD -> /review -> commit
Cross-service:   /office-hours -> gsd:quick --discuss -> SP:TDD -> proto typecheck + e2e:smoke -> /review -> commit
```
```

- [ ] **Step 2: Mirror**

Run: `cp /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-MEDIUM.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-MEDIUM.md`

- [ ] **Step 3: Validate**

Run:
```bash
rg "rule-registry, add weight" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-MEDIUM.md  # old content should be gone
rg "apps/seo-analyzer/src/domain/analyzers/on-page/og-tags" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-MEDIUM.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-MEDIUM.md
rg "Cross-service variant" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-MEDIUM.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-MEDIUM.md
rg "e2e:smoke" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-MEDIUM.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-MEDIUM.md
```
Expected:
- First: no match (old line is gone)
- Second: matches in both files
- Third: matches in both files
- Fourth: ≥2 matches per file

- [ ] **Step 4: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/workflow/WORKFLOW-MEDIUM.md docs/workflow/WORKFLOW-MEDIUM.md
git commit -m "$(cat <<'EOF'
docs(workflow): update MEDIUM tier with cross-service variant + correct paths

- Add Cross-service variant section with integration smoke + microservices gates
- Fix example paths to apps/seo-analyzer/src/...
- Update cheat sheet with single-service vs cross-service routes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Update WORKFLOW-LARGE.md (paths + proto-breaking protocol)

**Files:**
- Modify: `.claude/workflow/WORKFLOW-LARGE.md`
- Modify: `docs/workflow/WORKFLOW-LARGE.md` (identical edits)

- [ ] **Step 1: Edit `.claude/workflow/WORKFLOW-LARGE.md`**

**Edit A** — Update example PDF report block (lines 128–173). The current example already mentions NestJS/Puppeteer which still fits. Update service names / paths to match current arch. Current lines 128–173:

```
## Example: Build PDF Report Module

```
Task: Add PDF report generation for audit results

PHASE 1 — THIET KE:
  /office-hours
  → Who needs PDF? What data? What layout? File size constraints?
  
  /plan-eng-review
  → Data: Audit + Issues + Scores + Recommendations
  → API: GET /api/audits/:id/report/pdf
  → Lib: @react-pdf/renderer or puppeteer
  → Output: architecture.md updated with report module

PHASE 2 — CHIA NHO:
  gsd:discuss-phase 3
  → Decision: use puppeteer (already have Playwright dep)
  → Decision: generate HTML template → convert to PDF
  
  gsd:plan-phase 3
  → Wave 1 (parallel):
     Task 1: PDF template service (HTML → PDF)
     Task 2: Report data aggregator service
  → Wave 2 (depends on wave 1):
     Task 3: Report controller + endpoint
     Task 4: Frontend download button

PHASE 3 — CODE:
  gsd:execute-phase 3
  → Wave 1:
     Task 1: TDD pdf.generator.ts (test → fail → implement → pass)
     Task 2: TDD report.service.ts (test → fail → implement → pass)
  → Wave 2:
     Task 3: TDD report.controller.ts (test → fail → implement → pass)
     Task 4: TDD DownloadButton component (test → fail → implement → pass)

PHASE 4 — KIEM DINH:
  /review → code quality check all 4 tasks
  /cso → check file injection, path traversal in PDF endpoint
  /qa → open browser, trigger audit, click download, verify PDF opens

PHASE 5 — SHIP:
  /ship → PR with 4 atomic commits
  /land-and-deploy → merge, verify deploy
  /canary → monitor PDF endpoint errors for 30min
```
```

Replace with:

```
## Example: Add new gRPC method `AnalyzeBatch` to seo-analyzer

```
Task: Add batch-mode analyzer gRPC method (single-URL → N-URL at once)
Impact: proto-breaking (new method in packages/proto/analyzer/*.proto)
Services affected: seo-analyzer (producer), gateway (consumer)

PHASE 1 — THIET KE:
  /office-hours
  → Who calls batch mode? What batch size limit? Timeout semantics?

  /plan-eng-review
  → Proto contract: AnalyzeBatchRequest { urls: repeated string; max_parallel: int32 }
                    AnalyzeBatchResponse { results: repeated AnalyzeResponse }
  → Data flow: gateway receives POST /audits/batch → fan out via new gRPC method
  → Additive change: new method, no existing method modified

PHASE 2 — CHIA NHO:
  gsd:discuss-phase 8
  → Decision: add method as additive (packages/proto version stays backwards-compatible)
  → Decision: BullMQ NOT involved (synchronous gRPC for MVP, async in future)

  gsd:plan-phase 8
  → Wave 1 (parallel):
     Task 1: Update packages/proto/analyzer/analyzer.proto + regenerate
     Task 2: Implement seo-analyzer gRPC handler (new method)
  → Wave 2 (depends on wave 1):
     Task 3: gateway calls new gRPC method via ClientGrpc
     Task 4: gateway exposes POST /audits/batch endpoint
  → Wave 3: e2e:smoke covering batch flow

PHASE 3 — CODE:
  gsd:execute-phase 8
  → Wave 1:
     Task 1: Edit packages/proto/analyzer/analyzer.proto; npm run build --filter=@repo/proto
     Task 2: TDD apps/seo-analyzer/src/controllers/analyze.controller.ts → add @GrpcMethod
  → Wave 2:
     Task 3: TDD apps/gateway/src/infra/grpc/analyzer.client.ts → call new method
     Task 4: TDD apps/gateway/src/controllers/audit.controller.ts → add POST /batch
  → Wave 3:
     Task 5: Update test/e2e/smoke.e2e-spec.ts → add batch flow

PHASE 4 — KIEM DINH:
  /review → code quality check all 5 tasks
  /cso → check input validation (batch size DoS, URL allowlist)
  /qa → (skipped — no UI; rely on integration smoke)

  MICROSERVICES GATES:
    npm run build --filter=@repo/proto && npm run type-check  (proto typecheck)
    npm run e2e:smoke                                          (gRPC smoke)
    (No Prisma / BullMQ / pub/sub changes → those gates skipped)

PHASE 5 — SHIP:
  /ship → PR with 5 atomic commits
  /land-and-deploy → merge, verify Railway CI
  /canary → monitor seo-analyzer error rate for 30min
  Staged rollout: deploy seo-analyzer (producer) first, gateway (consumer) second
     → so gateway calling new method always hits an updated producer
```
```

**Edit B** — Add proto-breaking section before `## Conflict Handling in CODE Phase`. Insert BEFORE that heading:

```
## Proto-breaking change protocol (mandatory when packages/proto/** schema changes)

```
PR 1 — additive (expand):
  1. Add new field as OPTIONAL in .proto (never replace / reorder tags)
  2. npm run build --filter=@repo/proto → commit regenerated .d.ts
  3. Producer writes BOTH old + new field
  4. Consumer reads new field with fallback to old
  5. npm run e2e:smoke passes with mixed-version consumers
  6. Deploy consumer first, producer second

PR 2 — cleanup (contract), ≥1 release cycle later:
  7. Remove old field from .proto
  8. Regenerate @repo/proto, commit
  9. Producer stops writing old field
  10. Deploy in single wave (safe: no consumer still reads old)
```

Emergency (security patch requiring breaking change in one PR) → escalate to user + DECISIONS log.

```

**Edit C** — Update cheat sheet (end of file). Current:
```
## Cheat Sheet

```
/office-hours + /plan-eng-review
  -> gsd:discuss + gsd:plan
  -> SP:TDD + gsd:execute (waves)
  -> /review + /cso + /qa (fail? → fix → retry, max 2)
  -> /ship + /land-and-deploy + /canary
  -> done
```
```

Replace with:

```
## Cheat Sheet

```
Standard Large:
  /office-hours + /plan-eng-review
  → gsd:discuss + gsd:plan
  → gsd:execute (SP:TDD inside each task, waves)
  → /review + /cso + /qa + applicable microservices gates
  → /ship + /land-and-deploy + /canary

Proto-breaking Large:
  standard-large + proto-breaking protocol PR 1 (additive expand)
  → staged rollout (consumer first, producer second)
  → PR 2 cleanup ≥1 release later (remove old field)
```
```

- [ ] **Step 2: Mirror**

Run: `cp /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-LARGE.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-LARGE.md`

- [ ] **Step 3: Validate**

Run:
```bash
rg "Build PDF Report Module" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-LARGE.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-LARGE.md || echo CLEAN  # old example gone
rg "AnalyzeBatch" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-LARGE.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-LARGE.md
rg "Proto-breaking change protocol" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-LARGE.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-LARGE.md
rg "packages/proto" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-LARGE.md /Users/minhducoder/SEO-Analysts/docs/workflow/WORKFLOW-LARGE.md | wc -l
```
Expected:
- First: `CLEAN`
- Second: matches in both files
- Third: matches in both files
- Fourth: ≥4

- [ ] **Step 4: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/workflow/WORKFLOW-LARGE.md docs/workflow/WORKFLOW-LARGE.md
git commit -m "$(cat <<'EOF'
docs(workflow): update LARGE tier with proto-breaking protocol + gRPC example

- Add Proto-breaking change protocol (additive PR 1 → cleanup PR 2, ≥1 cycle)
- Replace PDF Report example with AnalyzeBatch gRPC example (matches current arch)
- Add microservices gates to KIEM DINH
- Update cheat sheet with standard vs proto-breaking paths

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Update `.claude/CLAUDE.md` (system brain refresh)

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Read current file to confirm baseline**

Run: `wc -l /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md`
Expected: ~155 lines

- [ ] **Step 2: Replace "Project Overview" section**

Find (current lines 63–76):
```
## Project Overview

- **Dự án**: SEO Analysis Platform (Đồ Án)
- **Mục tiêu**: Công cụ phân tích SEO cho URL, thay thế Ahrefs/SEMrush ở mức cá nhân
- **Kiến trúc**: Monorepo (Turborepo) - microservice-ready modules
- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS + shadcn/ui
- **Backend**: NestJS 10 (modules, DI, guards, pipes, interceptors)
- **Database**: PostgreSQL 16 (Supabase) + Prisma 5 ORM + Redis 7 (BullMQ + cache)
- **Crawling**: Cheerio (HTTP) + Playwright (JS rendering fallback)
- **Analysis**: Lighthouse CI + Custom SEO Rule Engine (20 rules)
- **Real-time**: Socket.IO via @nestjs/websockets
- **Deployment**: Vercel (frontend) + Railway (backend) + Supabase (DB)
- **Cost target**: < $40/month
```

Replace with:
```
## Project Overview

- **Dự án**: SEO Analysis Platform (Đồ Án)
- **Mục tiêu**: Công cụ phân tích SEO cho URL, thay thế Ahrefs/SEMrush ở mức cá nhân
- **Kiến trúc**: Monorepo (Turborepo) — **5 NestJS microservices** với DDD per service
  - `gateway` (3000 HTTP, 50051 gRPC) — public API, auth, orchestrator
  - `crawler` (50052 gRPC) — Playwright + Cheerio + Lighthouse
  - `seo-analyzer` (50053 gRPC) — 20 SEO rules + Prisma
  - `keyword-analyzer` (50054 gRPC) — TF + density, stateless
  - `report` (3004 HTTP, 50055 gRPC) — aggregate + PDF + compare
- **Inter-service**: gRPC (sync) + BullMQ (async jobs) + Redis pub/sub (events)
- **Shared packages**: `@repo/shared`, `@repo/proto`, `@repo/ui`, `@repo/typescript-config`, `@repo/eslint-config`
- **Frontend**: Next.js 14 + React 18 + Tailwind + shadcn/ui — **pending scaffold** (use `@repo/ui` as primitive library)
- **Database**: PostgreSQL 16 × 3 DBs (`seo_gateway`, `seo_analyzer`, `seo_report`) + Prisma 5 + Redis 7
- **Crawling**: Cheerio (default) + Playwright (JS fallback)
- **Analysis**: Lighthouse (programmatic) + Custom SEO Rule Engine (20 rules)
- **Real-time**: Socket.IO @ gateway + Redis pub/sub choreography
- **Deployment**: Vercel (future apps/web) + Railway (services) + Supabase (DBs)
- **Cost target**: < $40/month

> **Current service truth**: `apps/CLAUDE.md` (cross-service map) + `apps/<service>/CLAUDE.md` (per-service DDD layout).
```

- [ ] **Step 3: Replace "Skills Quick Reference" section (add microservice triggers)**

Find (current lines 44–54):
```
## Skills Quick Reference

| Skill | Trigger Keywords | Domain |
|-------|-----------------|--------|
| backend | NestJS, module, guard, pipe, interceptor, BullMQ, Socket.IO, gateway | NestJS Backend |
| frontend | Next.js, React, TanStack Query, shadcn/ui, Tailwind, App Router | Next.js Frontend |
| database | PostgreSQL, Prisma, Redis, migration, query, caching, transaction | Database |
| crawler | web crawler, Playwright, Cheerio, robots.txt, crawl, scrape | Web Crawling |
| seo-rules | SEO rule, analyzer, score, issue, audit, Core Web Vitals | SEO Engine |
| testing | Vitest, unit test, E2E, Playwright test, mock, coverage | Testing |
| deployment | Docker, Vercel, Railway, Supabase, CI/CD, GitHub Actions | DevOps |
```

Replace with:
```
## Skills Quick Reference

| Skill | Trigger Keywords | Applies to |
|-------|-----------------|--------|
| backend | NestJS, module, guard, pipe, interceptor, BullMQ, Socket.IO, **gRPC**, **proto**, **service boundary**, **choreography** | All 5 services |
| frontend | Next.js, React, TanStack Query, shadcn/ui, Tailwind, App Router, `@repo/ui` | (pending apps/web) |
| database | PostgreSQL, Prisma, Redis, migration, query, caching, transaction, **3-DB boundary** | gateway, seo-analyzer, report |
| crawler | web crawler, Playwright, Cheerio, robots.txt, crawl, scrape, Lighthouse | crawler only |
| seo-rules | SEO rule, analyzer, score, issue, audit, Core Web Vitals | seo-analyzer only |
| testing | Vitest, unit test, E2E, **e2e:smoke**, Playwright test, mock, coverage | All services |
| deployment | Docker, **docker-compose**, Vercel, Railway, Supabase, CI/CD, GitHub Actions, **Turborepo** | Monorepo root |
```

- [ ] **Step 4: Update workflow rules section — replace tier routes**

Find (current lines 107–110):
```
### Quick Route
- **Small:** SP:TDD -> SP:verify -> done
- **Medium:** /office-hours -> gsd:quick -> SP:TDD -> /review -> done
- **Large:** /office-hours + /plan-eng-review -> gsd:discuss + gsd:plan -> SP:TDD + gsd:execute -> /review + /cso + /qa -> /ship -> done
```

Replace with:
```
### Quick Route (per tier × impact)
- **Small (single-service):** SP:TDD → SP:verify → commit
- **Medium (single-service):** /office-hours → gsd:quick → SP:TDD → /review → commit
- **Medium (cross-service):** above + proto typecheck + e2e:smoke before /review
- **Large (standard):** /office-hours + /plan-eng-review → gsd:discuss + gsd:plan → gsd:execute (TDD waves) → /review + /cso + /qa + microservices gates → /ship + /land-and-deploy + /canary
- **Large (proto-breaking):** standard-large + proto-breaking protocol (PR 1 additive → PR 2 cleanup ≥1 cycle later) + staged rollout (consumer first)

### Forcing escalations (auto-detect)
- Any `packages/proto/**` change → **LARGE + proto-breaking**
- Any ≥2 `apps/*` touched → **MEDIUM minimum**
- Any Prisma schema/migrations change → **MEDIUM minimum**
- Any `@repo/shared` change → **MEDIUM minimum**
```

- [ ] **Step 5: Update Domain Skills reference**

Find (current line 113):
```
### Domain Skills (tools in CODE phase)
backend/ frontend/ database/ crawler/ seo-rules/ testing/ deployment/
```

Replace with:
```
### Domain Skills (tools in CODE phase)
`backend/` (all services) · `database/` (gateway, seo-analyzer, report) · `crawler/` (crawler) · `seo-rules/` (seo-analyzer) · `testing/` (all) · `deployment/` (root) · `frontend/` (pending apps/web)
```

- [ ] **Step 6: Update the `Ref: docs/workflow/` line**

Find (current line 115):
```
### Ref: docs/workflow/ for detailed guides
```

Replace with:
```
### Ref
- Primary: `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md` (microservices-aware)
- Framework-agnostic: `.claude/workflow/WORKFLOW.md`
- Tier guides: `.claude/workflow/WORKFLOW-{SMALL,MEDIUM,LARGE}.md`
- Mirrors for human reading: `docs/workflow/`
- Current service truth: `apps/CLAUDE.md` + `apps/<service>/CLAUDE.md`
```

- [ ] **Step 7: Validate**

Run:
```bash
rg "apps/api|monolith|microservice-ready" /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md || echo CLEAN
rg "5 NestJS microservices|gRPC|@repo/proto" /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md | wc -l
rg "WORKFLOW-SEO-ANALYSTS" /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md
```
Expected:
- First: `CLEAN`
- Second: ≥3
- Third: ≥1 match

- [ ] **Step 8: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(claude): refresh system brain for microservices arch

- Project Overview: 5 NestJS microservices with ports, DDD structure
- Skills Quick Reference: add gRPC/proto/boundary triggers; mark frontend pending
- Workflow Quick Route: tier × impact matrix
- Forcing escalations for proto / ≥2 apps / prisma / @repo/shared
- Domain Skills mapped to service ownership
- Ref: point to WORKFLOW-SEO-ANALYSTS.md as primary

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Update `.claude/context/index.md` (quick reference refresh)

**Files:**
- Modify: `.claude/context/index.md`

- [ ] **Step 1: Replace the Quick Reference block (everything after "## Quick Reference" up to end of file)**

Find the block starting at line 13 (`## Quick Reference`) through end of file and replace entire body (13 to end).

New content (from line 13 onwards):

```
## Quick Reference

### Project: SEO Analysis Platform (Đồ Án)
- **Type**: Full-stack SEO audit tool
- **Monorepo**: Turborepo (pnpm workspaces)
- **Node.js**: 20
- **Architecture**: 5 NestJS microservices with DDD per service; gRPC + BullMQ + Redis pub/sub
- **DB boundary**: 3 separate Postgres (no cross-service DB reads)

### Services

| Service | Purpose | Ports | Stack |
|---|---|---|---|
| `gateway` | Public HTTP+WS API, auth, orchestrator | 3000 HTTP, 50051 gRPC | NestJS + Prisma + Socket.IO |
| `crawler` | Fetch HTML + Lighthouse CWV | 50052 gRPC | Playwright + Cheerio |
| `seo-analyzer` | 20 SEO rules → scores | 50053 gRPC | NestJS + Prisma |
| `keyword-analyzer` | TF + placement + density | 50054 gRPC | NestJS (stateless) |
| `report` | Aggregate + PDF + compare | 3004 HTTP, 50055 gRPC | NestJS + Prisma + Playwright |

### Shared Packages

| Package | Purpose |
|---|---|
| `@repo/shared` | Constants (`BULLMQ_QUEUES`, `REDIS_KEYS`, `JWT_CONFIG`, `RATE_LIMIT`), enums (`AuditStatus`, `CheckStatus`, `UserRole`), interfaces (`PageData`, `CoreWebVitals`, `ImageInfo`) |
| `@repo/proto` | gRPC .proto + compiled .d.ts for all service contracts |
| `@repo/ui` | Shared UI components (shadcn/ui) — consumed by future `apps/web` |
| `@repo/typescript-config` | Base tsconfig variants (nestjs, nextjs) |
| `@repo/eslint-config` | Shared ESLint configs |

### Databases (3 × Postgres, per-service boundary)

| DB | Service | Key tables |
|---|---|---|
| `seo_gateway` | gateway | User, Audit, RefreshToken |
| `seo_analyzer` | seo-analyzer | SeoRule, RuleResult |
| `seo_report` | report | Report, ShareLink |

Prisma clients generated into `apps/<service>/src/infra/prisma/generated/` (committed to git).

### Redis usage

- **BullMQ queues**: `crawl.start`, `analyze.start`, `keyword.start`, `report.start`
- **Pub/sub channels**: `audit.progress`, `audit.completed`, `audit.failed`, `crawl.done`, `crawl.failed`, `analyze.done`, `keyword.done`, `report.done`
- **Cache**: `crawl:<hash>`, `lighthouse:<hash>` (crawler, 1h TTL)
- **Counters/state**: `audit:<id>:progress`, `audit:<id>:stage`, rate-limiter buckets, verification tokens
- All Redis usage protected by `REDIS_PASSWORD` (see `.env.docker.example`)

### Key Paths

| Path | Description |
|---|---|
| `apps/<service>/src/controllers/` | NestJS controllers (HTTP + gRPC handlers) |
| `apps/<service>/src/services/` | Application services (use cases) |
| `apps/<service>/src/domain/` | Domain entities, value objects, domain services |
| `apps/<service>/src/persistence/` | Repository implementations (Prisma) |
| `apps/<service>/src/infra/` | gRPC clients, BullMQ, Redis, external integrations |
| `apps/<service>/prisma/` | Per-service schema + migrations |
| `packages/proto/<domain>/*.proto` | gRPC contracts (analyzer, crawler, keyword, report, common) |
| `packages/shared/src/` | Cross-service constants + types |

### Entry Points (per service)

| Service | File | Notes |
|---|---|---|
| gateway | `apps/gateway/src/main.ts` | Express HTTP + gRPC client bootstrap + Socket.IO |
| crawler | `apps/crawler/src/main.ts` | gRPC-only microservice bootstrap |
| seo-analyzer | `apps/seo-analyzer/src/main.ts` | gRPC-only |
| keyword-analyzer | `apps/keyword-analyzer/src/main.ts` | gRPC-only |
| report | `apps/report/src/main.ts` | Express HTTP + gRPC |

### Running locally

- `npm run docker:up` — full stack via docker-compose (uses `.env.docker`)
- `npm run dev:<service>` — single service watch mode (requires docker:up)
- `npm run e2e:smoke` — pipeline smoke test
- `npm run test --filter=<service>` — unit tests per service

### Authoritative service docs

- `apps/CLAUDE.md` — cross-service map + data flow + architecture rules
- `apps/<service>/CLAUDE.md` — per-service DDD layout + conventions

### Architecture rules (cross-service)

1. Service boundary = Postgres DB boundary. No service reads another's DB.
2. Inter-service: gRPC (sync req/resp) + BullMQ (async fan-out) + Redis pub/sub (choreography).
3. Only gateway is publicly exposed. All others backend-only.
4. Each service owns its Prisma schema; migrations run via `docker-entrypoint.sh`.
5. Proto changes follow the proto-breaking change protocol (see `WORKFLOW-SEO-ANALYSTS.md`).
```

- [ ] **Step 2: Validate**

Run:
```bash
rg "apps/web|apps/api|7 NestJS modules" /Users/minhducoder/SEO-Analysts/.claude/context/index.md || echo CLEAN
rg "gateway|crawler|seo-analyzer|keyword-analyzer|report" /Users/minhducoder/SEO-Analysts/.claude/context/index.md | wc -l
rg "@repo/proto|@repo/shared|@repo/ui" /Users/minhducoder/SEO-Analysts/.claude/context/index.md | wc -l
rg "50051|50052|50053|50054|50055" /Users/minhducoder/SEO-Analysts/.claude/context/index.md | wc -l
```
Expected:
- First: `CLEAN`
- Second: ≥5
- Third: ≥3
- Fourth: ≥5

- [ ] **Step 3: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/context/index.md
git commit -m "$(cat <<'EOF'
docs(context): refresh index.md for 5-microservice architecture

- Replace 7-module table with 5-service table (ports, stack)
- Add Shared Packages section (@repo/*)
- Add Database boundary section (3 Postgres DBs)
- Add Redis usage section (BullMQ queues + pub/sub channels)
- Replace key paths with DDD layout
- Add architecture rules (service boundary, inter-service comms)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Add stale banners to context architecture/data-flow/tech-stack

**Files:**
- Modify: `.claude/context/architecture.md` (prepend)
- Modify: `.claude/context/data-flow.md` (prepend)
- Modify: `.claude/context/tech-stack.md` (prepend)

- [ ] **Step 1: Prepend banner to `architecture.md`**

Current line 1: `# Architecture Overview`

Replace with:
```
> **⚠ STALE (as of 2026-04-17)**: This file describes the pre-refactor monolith (`apps/web` + `apps/api`).
> The repo is now 5 NestJS microservices. For current-state truth, read:
> - `apps/CLAUDE.md` — cross-service map + data flow
> - `apps/<service>/CLAUDE.md` — per-service DDD layout
> - `.claude/context/index.md` — quick reference
>
> This file is retained for historical context only; **do NOT use for planning decisions**.

---

# Architecture Overview
```

- [ ] **Step 2: Prepend banner to `data-flow.md`**

Current line 1: `# Data Flow`

Replace with:
```
> **⚠ STALE (as of 2026-04-17)**: This file describes the pre-refactor monolith. Real data flow crosses 5 microservices via gRPC + BullMQ + Redis pub/sub.
>
> Current-state truth: `apps/CLAUDE.md` section "Data flow for one audit (happy path)".
>
> This file is retained for historical context only; **do NOT use for planning decisions**.

---

# Data Flow
```

- [ ] **Step 3: Prepend banner to `tech-stack.md`**

Current line 1: `# Tech Stack Details`

Replace with:
```
> **⚠ PARTIALLY STALE (as of 2026-04-17)**: Versions/libs still mostly accurate, but arch references `apps/web` / `apps/api` monolith. Current arch = 5 NestJS microservices.
>
> For service layout: `apps/CLAUDE.md`. For ports/DBs/packages: `.claude/context/index.md`.
>
> This file kept for dependency versions reference. Architecture sections superseded.

---

# Tech Stack Details
```

- [ ] **Step 4: Validate**

Run:
```bash
rg "STALE \(as of 2026-04-17\)" /Users/minhducoder/SEO-Analysts/.claude/context/*.md | wc -l
head -1 /Users/minhducoder/SEO-Analysts/.claude/context/architecture.md
head -1 /Users/minhducoder/SEO-Analysts/.claude/context/data-flow.md
head -1 /Users/minhducoder/SEO-Analysts/.claude/context/tech-stack.md
```
Expected:
- First: `3`
- Next three: each starts with `> **⚠ ...STALE...**`

- [ ] **Step 5: Commit**

```bash
cd /Users/minhducoder/SEO-Analysts
git add .claude/context/architecture.md .claude/context/data-flow.md .claude/context/tech-stack.md
git commit -m "$(cat <<'EOF'
docs(context): add stale banners to pre-refactor context docs

architecture.md + data-flow.md describe monolith (apps/web + apps/api).
tech-stack.md mostly accurate but arch references outdated.

Banner redirects to apps/CLAUDE.md + .claude/context/index.md as
authoritative sources. Files kept for historical context.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Final validation — spec success criteria

- [ ] **Step 1: Zero references to Avada/Shopify/Firebase/Polaris/Koa**

Run:
```bash
rg "Avada|Shopify|Firebase|Polaris|Koa|Firestore|scripttag|shopify-admin|shopify-api" /Users/minhducoder/SEO-Analysts/.claude/workflow/ /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md /Users/minhducoder/SEO-Analysts/.claude/context/index.md || echo CLEAN
```
Expected: `CLEAN`

- [ ] **Step 2: All example paths resolve to real files (spot-check)**

Run:
```bash
ls /Users/minhducoder/SEO-Analysts/apps/seo-analyzer/src/ 2>&1 | head -10
ls /Users/minhducoder/SEO-Analysts/apps/gateway/src/ 2>&1 | head -10
ls /Users/minhducoder/SEO-Analysts/packages/proto/ 2>&1 | head -10
```
Expected: each listing shows the expected DDD dirs (`controllers`, `services`, `domain`, `persistence`, `infra`) or proto domain dirs.

Note: specific paths like `apps/seo-analyzer/src/domain/analyzers/on-page/og-tags.analyzer.ts` are EXAMPLE paths (not required to exist today — they describe the target location for hypothetical work). The structural prefix (`apps/seo-analyzer/src/domain/`) should exist.

Run:
```bash
test -d /Users/minhducoder/SEO-Analysts/apps/seo-analyzer/src/domain && echo OK || echo MISSING
test -d /Users/minhducoder/SEO-Analysts/apps/gateway/src/controllers && echo OK || echo MISSING
test -d /Users/minhducoder/SEO-Analysts/packages/proto/analyzer && echo OK || echo MISSING
```
Expected: all three `OK`. If any `MISSING`, STOP and revise the example paths in the affected workflow file.

- [ ] **Step 3: Size detection rules mention proto/shared/prisma triggers**

Run:
```bash
rg "packages/proto|@repo/shared|prisma" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md | wc -l
rg "Forcing (rules|escalations)" /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md
```
Expected:
- First: ≥4
- Second: 1 match

- [ ] **Step 4: KIEM DINH documents 5 microservices gates**

Run:
```bash
rg "Proto typecheck|gRPC smoke|Migration order|BullMQ payload compat|Redis pub/sub compat" /Users/minhducoder/SEO-Analysts/.claude/workflow/WORKFLOW-SEO-ANALYSTS.md | wc -l
```
Expected: `5`

- [ ] **Step 5: Cross-reference consistency — `.claude/CLAUDE.md` and `context/index.md` describe same service set**

Run:
```bash
rg "gateway.*3000|gateway.*50051" /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md /Users/minhducoder/SEO-Analysts/.claude/context/index.md | wc -l
rg "report.*3004|report.*50055" /Users/minhducoder/SEO-Analysts/.claude/CLAUDE.md /Users/minhducoder/SEO-Analysts/.claude/context/index.md | wc -l
```
Expected: each ≥2 (one match per file).

- [ ] **Step 6: Git status clean, history readable**

Run:
```bash
cd /Users/minhducoder/SEO-Analysts
git status
git log --oneline -15
```
Expected:
- `git status`: working tree clean
- `git log`: 9 new commits (Task 1–9) plus prior `docs(spec)` commit, in order.

- [ ] **Step 7: No final commit needed — validation is inspection only**

If all checks pass, plan complete. If any check fails, note failure and revisit the relevant task.

---

## Self-Review (run after plan authored)

Spec coverage:
- Spec § 1 (file plan) → Tasks 1–9 ✓
- Spec § 2 (Size × Impact matrix) → Task 2 (primary file) + Task 7 (CLAUDE.md) ✓
- Spec § 3 (domain skill map) → Task 2 + Task 7 ✓
- Spec § 4 (microservices gates) → Task 2 (primary) + Task 5 (MEDIUM cross-service) + Task 6 (LARGE) ✓
- Spec § 5 (proto-breaking protocol) → Task 2 + Task 6 ✓
- Spec § 6 (system brain refresh) → Tasks 7 + 8 ✓
- Spec § 7 (stale banner) → Task 9 ✓

Placeholder scan: no TBD/TODO/placeholder text. All edits have complete old→new content shown.

Type consistency: file paths consistent (`apps/seo-analyzer/src/domain/analyzers/...`) across Tasks 4, 5, 6. Skill names consistent (`backend`, `database`, `crawler`, `seo-rules`, `testing`, `deployment`, `frontend`).

Size check: plan is long (≈700 lines) because each edit shows complete old→new content. That is correct per writing-plans discipline.
