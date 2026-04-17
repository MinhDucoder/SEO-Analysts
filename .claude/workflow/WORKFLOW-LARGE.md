# Workflow: Large Task

> 7+ files, 2+ modules, architecture/data model change, needs research, multi-step with dependencies

## All 5 Phases Active

```
THIET KE ──────> CHIA NHO ────> CODE ──────────> KIEM DINH ──────> SHIP
/office-hours     gsd:discuss    SP:TDD +          /review +         /ship +
/plan-ceo-review  gsd:plan       gsd:execute       /cso +            /land +
 (optional)                      (waves)           /qa               /canary
/plan-eng-review
 (required)

FAILURE LOOP: KIEM DINH fail ──> CODE fix ──> re-run failed checks (max 2)
```

## Step-by-step

### Phase 1: THIET KE (GStack owns)

```
/office-hours
```
- PM role: 6 forcing questions — what, who, why, constraints, risks, success criteria

```
/plan-ceo-review (OPTIONAL — only when task involves strategic scope decisions)
```
- Strategic challenge: scope expansion vs reduction, 4 modes

```
/plan-eng-review
```
- Architecture lock-in: data schema, API endpoints, diagrams, data flow, edge cases
- Output: architecture.md, data-flow.md updates

### Phase 2: CHIA NHO (GSD owns)

```
gsd:discuss-phase N
```
- Capture implementation decisions, gray areas → CONTEXT.md
- Lock design choices before planning

```
gsd:plan-phase N
```
- Research implementation approaches
- Create atomic task plans (XML format)
- Dependency-aware waves (parallel where independent)
- Each task < 50% context window
- Verify plans against requirements
- Output: N-X-PLAN.md files, ROADMAP.md

### Phase 3: CODE (Superpowers owns + GSD orchestrates)

```
gsd:execute-phase N
```

GSD orchestrates:
- Fresh context window per task (prevents context rot)
- Parallel waves (independent tasks run simultaneously)
- Atomic commits per task

Inside each task, Superpowers TDD:
```
1. Write test → verify FAILS (RED)
2. Implement → verify PASSES (GREEN)
3. Refactor
4. Atomic commit
```

Domain skills used as tools:
- `backend/` — NestJS patterns
- `frontend/` — Next.js 14 patterns
- `database/` — Prisma ORM patterns
- `crawler/` — Cheerio/Playwright patterns
- `seo-rules/` — Rule engine patterns
- `testing/` — Vitest patterns, Playwright E2E
- `deployment/` — Docker, Vercel, Railway, Supabase, CI/CD

### Phase 4: KIEM DINH (GStack owns)

```
/review
```
- Staff-engineer code review
- Auto-fix obvious issues, flag gaps

```
/cso
```
- OWASP Top 10 security check
- STRIDE threat modeling
- Flag vulnerabilities

```
/qa
```
- Open real Chromium browser
- Click through user flows
- Test edge cases, responsive layouts
- Find visual/functional bugs

### Phase 5: SHIP (GStack owns)

```
/ship
```
- Sync main, run tests, audit coverage
- Create PR with summary

```
/land-and-deploy
```
- Merge PR, verify CI
- Health-check production

```
/canary
```
- Post-deploy SRE monitoring
- Watch for errors and regressions

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
     Task 2: TDD apps/seo-analyzer/src/analyzer/controllers/analyze.controller.ts → add @GrpcMethod
  → Wave 2:
     Task 3: TDD apps/gateway/src/infra/grpc/analyzer.client.ts → call new method
     Task 4: TDD apps/gateway/src/audits/controllers/audits.controller.ts → add POST /batch
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

## Conflict Handling in CODE Phase

When SP:TDD + GSD:execute both active:

```
GSD decides:          SP decides:
- Task order          - TDD cycle inside each task
- Wave parallelism    - Test first, then implement
- Fresh context       - RED → GREEN → REFACTOR
- Atomic commits      - Domain skill selection
```

## Failure Handling

```
KIEM DINH fail → return to CODE → fix issues found
Re-run ONLY the failed checks (not all 3)
Max 2 retries. If still fails → STOP, report to user:
  - Remaining issues list
  - Options: continue fixing / skip / abandon
```

## Cross-Phase Context Passing

```
THIET KE output (architecture.md) → CHIA NHO must read before planning
CHIA NHO output (task plans)      → CODE must read before implementing
CODE output (test results)        → KIEM DINH must read before reviewing
KIEM DINH output (review results) → SHIP must read before shipping

If conflict → earlier phase's locked decisions win.
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
