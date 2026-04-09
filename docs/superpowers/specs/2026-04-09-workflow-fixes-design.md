# 3-Framework Workflow Fixes Design

> Fixes for 7 issues found by agent-team review (2 Critical, 5 Important).

## Issues Addressed

| # | Severity | Issue | Fix Type |
|---|----------|-------|----------|
| C1 | Critical | No failure handling — happy-path only | New section |
| C2 | Critical | No size escalation mid-execution | New section |
| I1 | Important | Small KIEM DINH owner contradiction | Patch |
| I2 | Important | /plan-ceo-review inconsistent across files | Patch |
| I3 | Important | Cross-phase conflict undefined | Patch |
| I4 | Important | WORKFLOW-LARGE.md missing testing/ and deployment/ | Patch |
| I5 | Important | Size boundary overlap at 7 files | Patch |

## Fix 1: Failure Handling (C1)

New rework loop for all tiers:

```
CODE ←──── KIEM DINH
  │    fail    │
  ▼            │
fix bug  ────→ re-verify

Rules:
1. KIEM DINH fail → return to CODE, fix issues found
2. Re-run KIEM DINH
3. Max 2 retries (CODE→KIEM DINH→CODE→KIEM DINH)
4. If retry 2 still fails → STOP, report to user with:
   - Remaining issues list
   - Options: continue fixing / skip / abandon

Per-tier:
- Small: SP:verify fail → fix → re-verify (max 2)
- Medium: /review fail → fix → /review (max 2)
- Large: /review+/cso+/qa fail → fix → re-run ONLY failed checks (max 2)
```

## Fix 2: Size Escalation (C2)

New mid-execution re-classification protocol:

```
Trigger signs:
- Small → touching > 2 files
- Small → needs data model / API change
- Medium → touching > 7 files or > 2 modules
- Medium → needs architecture decisions not yet discussed

Protocol:
1. STOP CODE phase immediately
2. Re-classify size based on actual scope
3. Restart from FIRST SKIPPED PHASE of new tier:
   - Small → Medium: restart from THIET KE (/office-hours)
   - Small → Large: restart from THIET KE (/office-hours + /plan-eng-review)
   - Medium → Large: add /plan-eng-review to existing THIET KE output
4. Code already written is KEPT, not reverted
5. New phases add context for existing code
```

## Fix 3: Small KIEM DINH Exception (I1)

Add footnote to Phase Ownership:

> Small tasks: KIEM DINH handled by SP:verify instead of GStack. GStack /review + /qa overhead not justified for <= 2 file changes.

## Fix 4: /plan-ceo-review Standardization (I2)

Standardize across all files:
- `/plan-ceo-review` is OPTIONAL in Large tier
- Only used when task involves strategic scope decisions
- NOT included in cheat sheets (since optional)
- `/office-hours` and `/plan-eng-review` remain required for Large

## Fix 5: Cross-Phase Context Passing (I3)

New rule:

> Output of phase N is mandatory input for phase N+1.
> Later phase MUST read output of earlier phase before starting.
> If conflict → earlier phase's locked decisions win.

Specifically:
- CHIA NHO must read architecture.md from THIET KE
- CODE must read task plans from CHIA NHO
- KIEM DINH must read test results from CODE
- SHIP must read review results from KIEM DINH

## Fix 6: Missing Domain Skills (I4)

Add to WORKFLOW-LARGE.md Phase 3 domain skills list:
- `testing/` — Vitest patterns, Playwright E2E
- `deployment/` — Docker, Vercel, Railway, Supabase, CI/CD

## Fix 7: Size Boundary Clarification (I5)

Reword size detection to include explicit overlap rule at definition:

> Overlap rule: If a task matches criteria for multiple tiers simultaneously, pick the HIGHEST tier. This rule is stated here at the definition — do not rely on the fallback rule elsewhere.

## Files Modified

| File | Changes |
|------|---------|
| `2026-04-09-3-framework-workflow-design.md` | Add sections 8 (Failure Handling) + 9 (Size Escalation), fix sections 1-4 |
| `WORKFLOW.md` | Add Failure Handling + Size Escalation, fix cheat sheet |
| `WORKFLOW-SMALL.md` | Add failure loop, KIEM DINH exception note |
| `WORKFLOW-MEDIUM.md` | Add failure loop |
| `WORKFLOW-LARGE.md` | Add failure loop, missing domain skills, /plan-ceo-review optional |
| `.claude/claude.md` | Add all new rules to Workflow Rules section |
