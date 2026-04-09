# Workflow: Large Task

> 7+ files, 2+ modules, architecture/data model change, needs research, multi-step with dependencies

## All 5 Phases Active

```
THIET KE ──────> CHIA NHO ────> CODE ──────────> KIEM DINH ──────> SHIP
/office-hours     gsd:discuss    SP:TDD +          /review +         /ship +
/plan-ceo-review  gsd:plan       gsd:execute       /cso +            /land +
/plan-eng-review                 (waves)           /qa               /canary
```

## Step-by-step

### Phase 1: THIET KE (GStack owns)

```
/office-hours
```
- PM role: 6 forcing questions — what, who, why, constraints, risks, success criteria

```
/plan-ceo-review
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

## Conflict Handling in CODE Phase

When SP:TDD + GSD:execute both active:

```
GSD decides:          SP decides:
- Task order          - TDD cycle inside each task
- Wave parallelism    - Test first, then implement
- Fresh context       - RED → GREEN → REFACTOR
- Atomic commits      - Domain skill selection
```

## Cheat Sheet

```
/office-hours + /plan-eng-review
  -> gsd:discuss + gsd:plan
  -> SP:TDD + gsd:execute (waves)
  -> /review + /cso + /qa
  -> /ship + /land-and-deploy + /canary
  -> done
```
