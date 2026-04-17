# 3-Framework Workflow

> **→ For Avada SEO Suite: read [WORKFLOW-AVADA.md](WORKFLOW-AVADA.md) first (domain skills map + project rules + CI/CD).**
> This file is the framework-agnostic reference.
>
> Superpowers + GSD + GStack — unified development workflow

## Frameworks & Lanes

| Framework | Lane | Phase Owned | Installed |
|-----------|------|-------------|-----------|
| GStack | Design + QA + Ship | THIET KE, KIEM DINH, SHIP | Global: ~/.claude/skills/gstack/ |
| GSD | Planning + Orchestration | CHIA NHO | Project: .claude/agents/gsd-*.md |
| Superpowers | Methodology + TDD | CODE | Plugin: superpowers v5.0.7 |

## Size Detection (Auto by Claude)

**Small** — ALL true: <= 2 files, no arch change, bug fix/config/typo, no research
**Medium** — ANY true: 3-7 files, 1 module feature, needs discuss, has edge cases
**Large** — ANY true: > 7 files or > 2 modules, arch/data model change, needs research, multi-step with deps
**Overlap:** If task matches multiple tiers → pick HIGHEST tier.
**Unsure?** Pick higher tier.

## Phase Ownership

```
THIET KE ──> CHIA NHO ──> CODE ──> KIEM DINH ──> SHIP
 GStack       GSD          SP       GStack        GStack
```

## Size Routing

```
SMALL:  SP:TDD -> SP:verify -> done
MEDIUM: /office-hours -> gsd:quick -> SP:TDD -> /review -> done
LARGE:  /office-hours + /plan-eng-review -> gsd:discuss + gsd:plan
        -> SP:TDD + gsd:execute -> /review + /cso + /qa -> /ship -> done
```

## Phase Ownership Notes

- Small tasks: KIEM DINH uses SP:verify (GStack skipped — overhead not justified for <= 2 files)
- Large tasks: /plan-ceo-review is OPTIONAL (only when strategic scope decisions needed)

## Conflict Rule

**Phase owner decides HOW. Co-owner decides WHEN/ORDER.**

## Cross-Phase Rule

Output of phase N is mandatory input for phase N+1. If conflict → earlier phase's locked decisions win.

## Failure Handling

KIEM DINH fail → return to CODE → fix → re-run KIEM DINH. Max 2 retries → STOP, ask user.
Large: re-run ONLY failed checks (not all 3).

## Size Escalation

If scope grows beyond current tier mid-CODE → STOP → re-classify → restart from first skipped phase. Code already written is kept.

## Decision Tree (Mermaid)

```mermaid
flowchart TD
    A[Task In] --> B{Classify Size}
    B -->|Small| C[SP:TDD]
    C --> D[SP:verify]
    D -->|pass| E1[Done]
    D -->|fail, retry ≤2| C

    B -->|Medium| F[/office-hours]
    F --> G[gsd:quick --discuss]
    G --> H[SP:TDD]
    H --> I[/review]
    I -->|pass| E2[Done]
    I -->|fail, retry ≤2| H

    B -->|Large| J[/office-hours + /plan-eng-review]
    J --> K[gsd:discuss + gsd:plan]
    K --> L[SP:TDD + gsd:execute waves]
    L --> M[/review + /cso + /qa]
    M -->|pass| N[/ship + /land-and-deploy + /canary]
    M -->|fail, retry ≤2| L
    N --> E3[Done]

    C -.->|scope grows| SES[Size Escalation: STOP → re-classify → restart]
    H -.->|scope grows| SES
    L -.->|scope grows| SES
```

## Detailed Guides

- [WORKFLOW-SMALL.md](WORKFLOW-SMALL.md) — Bug fix, config, typo
- [WORKFLOW-MEDIUM.md](WORKFLOW-MEDIUM.md) — Single module feature
- [WORKFLOW-LARGE.md](WORKFLOW-LARGE.md) — Multi-module, architecture change
