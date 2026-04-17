# Workflow: Small Task

> <= 2 files, no arch change, bug fix / config / typo / small refactor

## Pre-flight impact check (MANDATORY before starting)

```
Before coding, confirm the change is TRULY single-service + ≤2 files:

☐ Does it touch packages/proto/** ?    → YES: STOP, escalate to LARGE (proto-breaking)
☐ Does it touch ≥2 apps/* dirs ?       → YES: STOP, escalate to MEDIUM
☐ Does it touch prisma/schema.prisma ? → YES: STOP, escalate to MEDIUM
☐ Does it touch @repo/shared ?         → YES: STOP, escalate to MEDIUM

All NO → proceed with SMALL.
```

## Phases Active

```
skip ──> skip ──> CODE ──> KIEM DINH ──> skip
                  SP:TDD   SP:verify
```

## Step-by-step

### 1. CODE (Superpowers TDD)

```
1. Write test that reproduces the bug / verifies the change
2. Run test → confirm it FAILS (RED)
3. Implement the fix / change
4. Run test → confirm it PASSES (GREEN)
5. Refactor if needed
```

**Domain skill:** Use relevant skill (backend/, frontend/, etc.) for patterns.

### 2. KIEM DINH (Superpowers verify)

> **Note:** Small tasks use SP:verify instead of GStack. GStack /review + /qa overhead not justified for <= 2 file changes.

```
1. Run full test suite → all pass
2. Check no regressions introduced
3. Done
```

### Failure Handling

```
SP:verify fail → return to CODE → fix → re-verify
Max 2 retries. If still fails → STOP, ask user.
```

### Size Escalation

```
If during CODE you discover scope > 2 files or needs arch change:
→ STOP → re-classify as Medium or Large
→ Restart from THIET KE (/office-hours)
→ Code already written is KEPT
```

## Example: Fix title analyzer returning wrong score

```
Task: Title analyzer returns 0 instead of penalty score when title > 60 chars
Service: seo-analyzer (single-service, 1 file)

1. CODE:
   - Load domain skill: seo-rules
   - Write test: expect(analyzeTitle("a".repeat(61))).toEqual({ score: 70, ... })
   - Run → FAILS (returns score: 0)
   - Fix: apps/seo-analyzer/src/analyzer/domain/rules/meta/title-tag.rule.ts
   - Run → PASSES: npm run test --filter=seo-analyzer

2. KIEM DINH:
   - Run: npm run test --filter=seo-analyzer → all pass
   - Run: npm run lint --filter=seo-analyzer → clean
   - Done
```

## Cheat Sheet

```
impact-check → load domain skill → SP:TDD → SP:verify → commit → done
```
