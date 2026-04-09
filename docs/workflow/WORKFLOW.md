# 3-Framework Workflow

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

## Conflict Rule

**Phase owner decides HOW. Co-owner decides WHEN/ORDER.**

## Decision Tree (Mermaid)

```mermaid
flowchart TD
    A[Task In] --> B{Classify Size}
    B -->|Small| C[SP:TDD]
    C --> D[SP:verify]
    D --> E1[Done]

    B -->|Medium| F[/office-hours]
    F --> G[gsd:quick --discuss]
    G --> H[SP:TDD]
    H --> I[/review]
    I --> E2[Done]

    B -->|Large| J[/office-hours + /plan-eng-review]
    J --> K[gsd:discuss + gsd:plan]
    K --> L[SP:TDD + gsd:execute waves]
    L --> M[/review + /cso + /qa]
    M --> N[/ship + /land-and-deploy + /canary]
    N --> E3[Done]
```

## Detailed Guides

- [WORKFLOW-SMALL.md](WORKFLOW-SMALL.md) — Bug fix, config, typo
- [WORKFLOW-MEDIUM.md](WORKFLOW-MEDIUM.md) — Single module feature
- [WORKFLOW-LARGE.md](WORKFLOW-LARGE.md) — Multi-module, architecture change
