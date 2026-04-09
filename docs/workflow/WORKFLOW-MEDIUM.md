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
/office-hours -> gsd:quick --discuss -> SP:TDD -> /review -> done
```
