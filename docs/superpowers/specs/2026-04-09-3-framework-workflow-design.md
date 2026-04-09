# 3-Framework Workflow Design

> Combining Superpowers + GSD + GStack into a unified, lane-independent workflow for the SEO Analysis Platform.

## Design Decisions

- **Approach:** Phase-Owner + Escalation (Approach C)
- **Lane independence:** Each framework owns specific phases, no overlap in ownership
- **Size routing:** Claude auto-detects task size, activates appropriate number of phases
- **Domain skills:** Used as tools during CODE phase, not part of any framework
- **Conflict rule:** Phase owner decides HOW, co-owner decides WHEN/ORDER
- **Phase priority by context:** THIET KE: GStack wins, CHIA NHO: GSD wins, CODE: SP wins, KIEM DINH: GStack wins, SHIP: GStack wins

## 1. Size Detection

Claude auto-classifies every incoming task:

### Small — ALL must be true:
- Affects <= 2 files
- No architecture or data model change
- Bug fix, typo, config change, small refactor
- No research needed

### Medium — ANY one true:
- Affects 3-7 files
- New feature within 1 module
- Needs discuss to clarify approach
- Has edge cases to consider

### Large — ANY one true:
- Affects > 7 files or > 2 modules
- Changes architecture, data model, or API contract
- Needs research on external lib/pattern
- Multi-step with dependencies between steps

### Fallback: When unsure, pick higher tier.

## 2. Phase Ownership

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ THIET KE │───>│ CHIA NHO │───>│   CODE   │───>│ KIEM DINH│───>│   SHIP   │
│          │    │          │    │          │    │          │    │ optional │
│GStack own│    │ GSD owns │    │ SP owns  │    │GStack own│    │GStack own│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Phase 1 — THIET KE (GStack wins)
- `/office-hours` — clarify requirements, 6 forcing questions (Medium + Large)
- `/plan-ceo-review` — strategic scope challenge (Large only)
- `/plan-eng-review` — architecture lock-in, data schema, API endpoints (Large only)
- Output: architecture.md, data-flow.md (Large only)

### Phase 2 — CHIA NHO (GSD wins)
- `gsd:discuss-phase` — capture decisions, gray areas
- `gsd:plan-phase` — atomic tasks XML, dependency waves
- Rule: each task < 50% context window
- Output: task plans, ROADMAP.md

### Phase 3 — CODE (Superpowers wins)
- SP:TDD — write test -> fail -> implement -> pass -> refactor
- `gsd:execute-phase` — fresh context per task, parallel waves (large only)
- Domain skills — backend/, frontend/, database/... for patterns
- Output: code + tests passing

### Phase 4 — KIEM DINH (GStack wins)
- `/review` — staff-engineer code review
- `/cso` — OWASP + STRIDE security audit
- `/qa` — real browser testing (Playwright)
- Output: clean, secure, tested feature

### Phase 5 — SHIP (GStack wins, optional)
- `/ship` — PR + coverage audit
- `/land-and-deploy` — merge + health check
- `/canary` — post-deploy monitoring

## 3. Size Routing Table

```
┌─────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  SIZE   │ THIET KE │ CHIA NHO │   CODE   │ KIEM DINH│   SHIP   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Small   │   skip   │   skip   │  SP:TDD  │ SP:verify│   skip   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Medium  │ /office- │ gsd:quick│  SP:TDD  │ /review  │   skip   │
│         │ hours    │ --discuss│          │          │          │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Large   │ /office- │ gsd:     │ SP:TDD + │ /qa +    │ /ship +  │
│         │ hours +  │ discuss +│ gsd:     │ /cso +   │ /land +  │
│         │ /plan-   │ gsd:plan │ execute  │ /review  │ /canary  │
│         │ eng-     │          │ (waves)  │          │          │
│         │ review   │          │          │          │          │
└─────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

## 4. Conflict Resolution

### Core rule: Phase owner decides HOW. Co-owner decides WHEN/ORDER.

### Per-phase specifics:

1. **THIET KE** — GStack methodology wins
   - GStack /plan-eng-review says "diagram before code" -> make diagram
   - Even if GSD wants to jump straight to planning

2. **CHIA NHO** — GSD methodology wins
   - GSD says "task must be < 50% context, use XML format" -> follow GSD format
   - Even if Superpowers wants markdown plan format

3. **CODE** — Superpowers methodology wins
   - SP says "write test FIRST, verify it FAILS, then implement" -> test first
   - Even if GSD executor wants to code first

4. **KIEM DINH** — GStack methodology wins
   - GStack /qa says "open real browser, click through" -> real browser test
   - Even if SP only needs unit test pass

5. **SHIP** — GStack methodology wins
   - GStack /ship says "audit coverage before PR" -> audit first
   - Even if GSD:ship wants PR immediately

### Edge case — CODE phase (large tasks):
When both SP:TDD + GSD:execute-phase are active:
- SP owns methodology (TDD cycle within each task)
- GSD owns orchestration (fresh context, waves, atomic commits)
- Inside each GSD execution wave, code MUST follow SP:TDD cycle

## 5. Decision Tree

```
USER TASK IN
    │
    ▼
CLASSIFY SIZE (Small/Medium/Large)
    │
    ├── SMALL ──────────────────────> SP:TDD -> SP:verify -> done
    │
    ├── MEDIUM -> /office-hours -> gsd:quick --discuss -> SP:TDD -> /review -> done
    │
    └── LARGE -> /office-hours + /plan-eng-review
                  -> gsd:discuss + gsd:plan
                  -> SP:TDD + gsd:execute (waves)
                  -> /review + /cso + /qa
                  -> /ship + /land-and-deploy + /canary
                  -> done
```

## 6. Domain Skills (used in CODE phase as tools)

| Skill | When to use |
|-------|-------------|
| backend/ | NestJS modules, guards, pipes, BullMQ, Socket.IO |
| frontend/ | Next.js 14, TanStack Query, shadcn/ui, Tailwind |
| database/ | Prisma ORM, PostgreSQL, Redis, migrations |
| crawler/ | Cheerio, Playwright, robots.txt, data extraction |
| seo-rules/ | SEO rule engine, analyzers, weighted scoring |
| testing/ | Vitest patterns, Playwright E2E |
| deployment/ | Docker, Vercel, Railway, Supabase, CI/CD |

## 7. Quick Reference (Cheat Sheet)

```
SMALL:  SP:TDD -> SP:verify -> done
MEDIUM: /office-hours -> gsd:quick -> SP:TDD -> /review -> done
LARGE:  /office-hours + /plan-eng-review -> gsd:discuss + gsd:plan
        -> SP:TDD + gsd:execute -> /review + /cso + /qa -> /ship -> done
```
