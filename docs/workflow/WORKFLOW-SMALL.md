# Workflow: Small Task

> <= 2 files, no arch change, bug fix / config / typo / small refactor

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

```
1. Run full test suite → all pass
2. Check no regressions introduced
3. Done
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

## Cheat Sheet

```
SP:TDD (test -> fail -> implement -> pass) -> SP:verify -> done
```
