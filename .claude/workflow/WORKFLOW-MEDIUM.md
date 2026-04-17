# Workflow: Medium Task

> 3-7 files, single module feature, needs discuss, has edge cases

## Phases Active

```
THIET KE ──> CHIA NHO ──> CODE ──> KIEM DINH ──> skip
/office-hours  gsd:quick   SP:TDD   /review
               --discuss
```

## Step-by-step

### 1. THIET KE (GStack — light)

```
/office-hours
```

- Claude acts as PM, asks 6 forcing questions
- Clarify: what exactly, for whom, edge cases, constraints
- Output: clear requirement understanding

### 2. CHIA NHO (GSD — quick mode)

```
gsd:quick --discuss
```

- Quick discuss to capture decisions
- Break into 2-4 atomic tasks
- No full roadmap needed

### 3. CODE (Superpowers TDD)

For each task from step 2:

```
1. Write test first → verify FAILS
2. Implement → verify PASSES
3. Refactor if needed
```

**Domain skill:** Use relevant skill (backend/, frontend/, database/, etc.) for patterns.

### 4. KIEM DINH (GStack — review)

```
/review
```

- Staff-engineer level code review
- Auto-fixes obvious issues
- Flags gaps and edge cases

## Example: Add new SEO rule — hreflang tag validation

```
Task: Add hreflang tag rule (detect + validate per ISO 639-1 codes)
Service: seo-analyzer (single-service)
Impact: single-service (no proto, no cross-service, no shared schema)
Note: existing rules live in apps/seo-analyzer/src/analyzer/domain/rules/ (images/, meta/, headings/, links/, performance/, technical/)

1. THIET KE:
   /office-hours
   → Clarify: which hreflang codes allowed, scoring weight, penalty for malformed

2. CHIA NHO:
   gsd:quick --discuss
   → Task 1: Create apps/seo-analyzer/src/analyzer/domain/rules/technical/hreflang.rule.ts + spec
   → Task 2: Register in apps/seo-analyzer/src/analyzer/services/rule-registry.service.ts, add weight
   → Task 3: Add DB entry via Prisma seed (apps/seo-analyzer/prisma/seed.ts)

3. CODE (per task) — load domain skill: seo-rules
   → Task 1: write hreflang.rule.spec.ts → RED → implement → GREEN → commit
   → Task 2: write registry integration test → RED → update registry → GREEN → commit
   → Task 3: update seed + run `npx prisma db seed` → verify inserted → commit

4. KIEM DINH:
   /review → staff-engineer review, auto-fix issues
   npm run test --filter=seo-analyzer → all pass
   npm run lint --filter=seo-analyzer → clean
   (No cross-service gates — impact = single-service)
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

## Failure Handling

```
/review fail → return to CODE → fix issues → /review again
Max 2 retries. If still fails → STOP, ask user.
```

## Size Escalation

```
If during CODE you discover scope > 7 files or > 2 modules:
→ STOP → re-classify as Large
→ Add /plan-eng-review to existing THIET KE output
→ Run gsd:discuss + gsd:plan for full breakdown
→ Code already written is KEPT
```

## Cheat Sheet

```
Single-service:  /office-hours -> gsd:quick --discuss -> SP:TDD -> /review -> commit
Cross-service:   /office-hours -> gsd:quick --discuss -> SP:TDD -> proto typecheck + e2e:smoke -> /review -> commit
```
