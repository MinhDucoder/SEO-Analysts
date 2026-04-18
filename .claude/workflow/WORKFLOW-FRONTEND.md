# Workflow: Frontend Lane (DO_AN `apps/web/`)

> The FE lane runs **parallel** to the backend tiers in [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md). Backend lanes (SMALL / MEDIUM / LARGE) stay unchanged for microservices work. Choose this lane whenever the primary change target is `apps/web/**` or `packages/ui/**`.

## Two-command handoff

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│  /prepare-design <feature>  │ ───> │  /claude-design <slug>      │
│                             │      │                             │
│  Interactive Q&A (PRD +     │      │  NO feature Q&A             │
│  DESIGN + mockups)          │      │  Reads design source,       │
│  Writes docs/design/<slug>/ │      │  builds code file-by-file   │
└─────────────────────────────┘      └─────────────────────────────┘
      upstream (optional)                  downstream (required)
```

Upstream `/prepare-design` is optional — you can hand-author design files in `docs/design/<slug>/` if you prefer. The handoff contract is purely file-based: if the artifacts required by the tier (§ Tier × Design matrix) exist at the right path, `/claude-design` proceeds without asking feature questions.

## Tier × Design-artifact matrix

| Tier | Triggers | Required in `docs/design/<slug>/` |
|---|---|---|
| **Small FE** | ≤ 2 files, style / copy / prop tweak, no new component, no route change | (none) |
| **Medium FE** | 1 new page OR 3–5 new components, single existing API endpoint | `PRD.md` OR `DESIGN.md` (one of two) |
| **Large FE** | Multi-page feature, new design-system primitive, OR touches new API / proto / BullMQ / auth | `PRD.md` + `DESIGN.md` + `mockups/` (all three) |

**Escalation rules (force tier up):**

- Phase 2 (Mapping) finds a gateway endpoint that does not exist → Medium becomes Large.
- Phase 2 finds a new proto RPC or new BullMQ event → any tier becomes Large + `proto-breaking`.
- Phase 2 touches authentication or multi-tenant boundary → any tier becomes Large.
- Mid-execution scope growth → STOP → re-classify → restart first skipped phase → keep code already written.

## Phase sequence

`/claude-design` runs these phases. Each produces one artifact under `.planning/frontend/<slug>/` and commits atomically before moving on.

### Phase 0 — Design Source Validation

- **Who:** Main agent (fast, local filesystem check).
- **Reads:** `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}` — whichever exist.
- **Produces:** `DESIGN-INPUT.md` (digest of the design source with extracted requirements).
- **Gate:** HALT if the tier's required artifacts are missing; emit exact `/prepare-design` remediation command.
- **No Q&A about the feature.** Phase 0 only asks for tier confirmation if ambiguous.

### Phase 1 — Onboard (subagent, read-only)

- **Who:** `Agent:Explore` subagent (keeps main context lean).
- **Reads:** `apps/web/**`, `packages/ui/src/**`, `packages/proto/src/**` (all `.proto`), `packages/shared/src/**`, `apps/gateway/src/**/controllers/**`, `apps/gateway/src/**/gateways/**`, `turbo.json`, `tsconfig.base.json`.
- **Skips:** `node_modules/`, `dist/`, `.next/`, Prisma generated, non-gateway backend apps.
- **Produces:** `ONBOARD.md` — 10 sections (folder structure, component pattern, styling, API client, state, realtime, available HTTP endpoints, available WS events, available proto RPCs, naming conventions).
- **Gate:** User approves ONBOARD summary before Phase 2.

### Phase 2 — Feature Mapping

- **Who:** Main agent (has DESIGN-INPUT + ONBOARD).
- **Input:** `DESIGN-INPUT.md` + `ONBOARD.md`.
- **Produces:** `MAPPING.md` — pages to create/modify, components to create/reuse, API endpoints marked `EXISTS` (with `file:line` reference) or `MISSING`, WS events same, proto impact (none / existing-consumer / new-rpc-needed), tier escalation decision.
- **Gate:** If any backend `MISSING` → HALT, route user to backend workflow. Else user approves MAPPING before Phase 3.

### Phase 3 — Implementation Plan

- **Who:** Main agent.
- **Input:** `ONBOARD.md` + `MAPPING.md`.
- **Produces:** `PLAN.md` — ordered file list (leaves → containers → pages), wave structure for parallel execution, per-file (path, purpose, props/types, deps, test file, est. LOC < 150).
- **Gate:** User approves PLAN before Phase 4.

### Phase 4 — File-by-File Build

- **Who:** `superpowers:test-driven-development` per file. Small/Medium sequential; Large uses `gsd:execute` waves for parallelism.
- **Per file:** Write failing test → RED → implement minimal → GREEN → refactor → commit atomically.
- **Commit convention:** `feat(web): <slug>/<file> — <one-liner>`.
- **Gate:** After each file (Small/Medium) or each wave (Large), main agent reviews commit + test output.

### Phase 5 — Quality Gates

- **Who:** Main agent orchestrates GStack skills.
- **Produces:** `REVIEW.md` summarizing each gate + fixes applied.

| # | Gate | Command | Runs when |
|---|---|---|---|
| 1 | Type check | `npm run type-check` (all workspaces) | Always |
| 2 | Lint | `npm run lint --filter=web` | Always |
| 3 | Unit tests | `npm run test --filter=web` | Always |
| 3b | **FE test harness** (MSW + Playwright + RTL wired?) | Invoke skill [`fe-test-harness`](../skills/fe-test-harness/SKILL.md) if BUILD-LOG marks tests deferred, OR `apps/web/tests/msw/` missing, OR slug introduces auth-aware page without regression test. Produces 1 atomic harness commit. | Any FE slug where Gate 3 surfaces "tests deferred" / "needs MSW" / "needs router mocks" in BUILD-LOG Deviations |
| 4 | Proto typecheck | `npm run build --filter=@repo/proto && npm run type-check` | Only if `packages/proto` touched OR `@repo/proto` consumer touched |
| 5 | gRPC + HTTP smoke | `npm run e2e:smoke` | Only if gateway controller / service touched |
| 6 | Staff-eng code review | `/review` (GStack) | Medium + Large |
| 7 | Visual / UX review | `/design-review` (GStack) | When new visual UI introduced |
| 8 | Browser QA | `/qa` (GStack) | Interactive Large tier only |
| 9 | Security audit | `/cso` (GStack) | Large + auth / PII / admin |

Fail any gate → back to Phase 4, re-run ONLY the failed gate after fix. Max 2 retries → STOP, ask user.

## Artifact layout

```
docs/design/<feature-slug>/              # Human-authored / /prepare-design output
├── PRD.md              # User stories + acceptance criteria
├── DESIGN.md           # Technical design (architecture, components, data flow)
├── mockups/            # Visual references
│   ├── desktop.png
│   ├── mobile.png
│   └── states.png
└── user-flows.md       # (optional)

.planning/frontend/<feature-slug>/       # /claude-design output (per run)
├── STATE.md            # Phase tracker — resume anchor
├── DESIGN-INPUT.md     # Phase 0 digest
├── ONBOARD.md          # Phase 1
├── MAPPING.md          # Phase 2
├── PLAN.md             # Phase 3
├── BUILD-LOG.md        # Phase 4 running log
└── REVIEW.md           # Phase 5
```

**Separation principle:** `docs/design/` is long-term (lives with the milestone). `.planning/frontend/` is per-run machine output (can be archived after ship).

## Cheat sheet

```
Small FE:      /claude-design <slug>  (skips Phase 0 precondition; runs 1-5)
Medium FE:     write PRD.md OR DESIGN.md → /claude-design <slug>
Large FE:      /prepare-design <feature> → review all 3 artifacts → /claude-design <slug>

If Phase 0 HALTs:   run the exact /prepare-design command it prints
If Phase 2 HALTs:   backend work is missing; run backend workflow for the gap first
If Phase 5 fails:   fix failing file(s), re-run only the failed gate, max 2 retries
```

## Failure handling

- **Missing design source** → Phase 0 HALT with exact `/prepare-design` remediation.
- **Missing backend** → Phase 2 HALT with pointer to backend workflow.
- **Proto break detected** → auto-upgrade tier to Large + `proto-breaking`, force gates 4+5+6 in Phase 5.
- **Gate failure** → return to Phase 4, fix only offending files, re-run only failed gate. Max 2 retries. Third failure → STOP, write blocker to REVIEW.md, ask user.
- **Tests deferred in BUILD-LOG** → Gate 3b triggers skill [`fe-test-harness`](../skills/fe-test-harness/SKILL.md) AFTER Phase 5 closes (1 harness-first commit, reusable for next slug). Do NOT defer harness into the next slug's scaffolding — must be its own debt-paying commit.
- **Mid-build scope growth** → STOP → re-classify → re-run Phase 2 with augmented description → proceed. Committed files kept.

## Interaction with other skills

**Upstream (called by `/prepare-design`):** `/office-hours`, `/design-consultation`, `/design-shotgun`.
**Downstream (called by `/claude-design`):** `Agent:Explore`, `superpowers:test-driven-development`, `gsd:execute` (Large only), `/review`, `/design-review`, `/qa`, `/cso`.
**Post-phase (debt-paying):** [`fe-test-harness`](../skills/fe-test-harness/SKILL.md) — invoked after Phase 5 when BUILD-LOG shows tests deferred OR MSW harness missing. Ships as separate atomic commit, not inside the slug's scaffolding waves. See [SKILL.md](../skills/fe-test-harness/SKILL.md) for 8-step workflow.
**NOT called** (to avoid duplicate Q&A): `gsd:discuss`, `gsd:plan`, `superpowers:brainstorming`, `gsd:explore`. User can still run them manually for edge cases.

## See also

- [claude-design.md](claude-design.md) — Original 5-phase philosophy doc (teaching reference).
- [WORKFLOW.md](WORKFLOW.md) — 3-framework overview.
- [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) — Backend microservices workflow.
