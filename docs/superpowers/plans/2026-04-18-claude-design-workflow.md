# Claude Design Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/prepare-design` and `/claude-design` slash commands plus a dedicated FE lane in the 3-framework workflow, so frontend work in DO_AN (`apps/web/`) follows an Onboard → Map → Plan → Build → Review pipeline with design source validated upfront.

**Architecture:** Two composable slash commands. `/prepare-design` orchestrates existing GStack skills (`/office-hours`, `/design-consultation`, `/design-shotgun`) to generate `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}`. `/claude-design` then reads that design source (Phase 0 validation, HALT if missing) and executes 5 phases consuming `Agent:Explore`, `superpowers:test-driven-development`, `gsd:execute`, and GStack review gates. WORKFLOW.md gets a third routing branch alongside the existing backend lanes.

**Tech Stack:** Markdown slash commands (Claude Code convention with `$ARGUMENTS` substitution), Mermaid diagrams, zero runtime dependencies. Mirror pattern (`.claude/` authoritative, `docs/workflow/` human-readable copy) from 2026-04-17 redesign.

**Spec reference:** [docs/superpowers/specs/2026-04-18-claude-design-workflow-design.md](../specs/2026-04-18-claude-design-workflow-design.md)

---

## File Structure

Files created / modified by this plan:

| Path | Action | Role |
|---|---|---|
| `.claude/workflow/WORKFLOW-FRONTEND.md` | CREATE | Authoritative FE-lane guide (tier × artifact matrix, phases, gates, handoff) |
| `docs/workflow/WORKFLOW-FRONTEND.md` | CREATE | Human-readable mirror of the above |
| `.claude/workflow/WORKFLOW.md` | UPDATE | Add FE lane row + Mermaid FE branch |
| `docs/workflow/WORKFLOW.md` | UPDATE | Mirror of the above |
| `.claude/commands/prepare-design.md` | CREATE | Upstream slash command — generates design source |
| `.claude/commands/claude-design.md` | CREATE | Downstream slash command — 6-phase build pipeline |

Plus trial-run artifacts (committed but deletable after verification):

| Path | Action | Role |
|---|---|---|
| `docs/design/trial-about-page/PRD.md` | CREATE (trial) | Hand-authored PRD for happy-path trial |
| `.planning/frontend/trial-about-page/` | GENERATED (trial) | Artifacts from `/claude-design` happy-path trial |

---

## Task 1: Create `.claude/workflow/WORKFLOW-FRONTEND.md`

**Files:**
- Create: `.claude/workflow/WORKFLOW-FRONTEND.md`

- [ ] **Step 1: Write the WORKFLOW-FRONTEND.md file**

Write to `.claude/workflow/WORKFLOW-FRONTEND.md`:

````markdown
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
- **Mid-build scope growth** → STOP → re-classify → re-run Phase 2 with augmented description → proceed. Committed files kept.

## Interaction with other skills

**Upstream (called by `/prepare-design`):** `/office-hours`, `/design-consultation`, `/design-shotgun`.
**Downstream (called by `/claude-design`):** `Agent:Explore`, `superpowers:test-driven-development`, `gsd:execute` (Large only), `/review`, `/design-review`, `/qa`, `/cso`.
**NOT called** (to avoid duplicate Q&A): `gsd:discuss`, `gsd:plan`, `superpowers:brainstorming`, `gsd:explore`. User can still run them manually for edge cases.

## See also

- [claude-design.md](claude-design.md) — Original 5-phase philosophy doc (teaching reference).
- [WORKFLOW.md](WORKFLOW.md) — 3-framework overview.
- [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) — Backend microservices workflow.
````

- [ ] **Step 2: Verify structure**

Run: `grep -c "^##" ".claude/workflow/WORKFLOW-FRONTEND.md"` — expect ≥ 8 section headings.
Run: `grep -c "Phase [0-5]" ".claude/workflow/WORKFLOW-FRONTEND.md"` — expect ≥ 6 phase references.
Run: `grep "docs/design/<feature-slug>/" ".claude/workflow/WORKFLOW-FRONTEND.md"` — expect match.
Run: `grep "/prepare-design" ".claude/workflow/WORKFLOW-FRONTEND.md"` — expect match.

- [ ] **Step 3: Commit**

```bash
git add .claude/workflow/WORKFLOW-FRONTEND.md
git commit -m "$(cat <<'EOF'
docs(workflow): add WORKFLOW-FRONTEND.md — FE lane guide

Documents /prepare-design → /claude-design handoff, tier × design
artifact matrix (Small=0, Medium=1-of-2, Large=3-of-3), six-phase
pipeline with per-phase gates, and skill interaction policy.
EOF
)"
```

---

## Task 2: Mirror WORKFLOW-FRONTEND.md to `docs/workflow/`

**Files:**
- Create: `docs/workflow/WORKFLOW-FRONTEND.md`

- [ ] **Step 1: Copy the file**

Run: `cp ".claude/workflow/WORKFLOW-FRONTEND.md" "docs/workflow/WORKFLOW-FRONTEND.md"`

- [ ] **Step 2: Verify parity**

Run: `diff ".claude/workflow/WORKFLOW-FRONTEND.md" "docs/workflow/WORKFLOW-FRONTEND.md"` — expect empty output (zero-byte diff).

- [ ] **Step 3: Commit**

```bash
git add docs/workflow/WORKFLOW-FRONTEND.md
git commit -m "$(cat <<'EOF'
docs(workflow): mirror WORKFLOW-FRONTEND.md to docs/workflow/

Matches the human-readable-copy pattern established 2026-04-17.
EOF
)"
```

---

## Task 3: Update `.claude/workflow/WORKFLOW.md` — add FE lane

**Files:**
- Modify: `.claude/workflow/WORKFLOW.md`

- [ ] **Step 1: Update the header pointer**

Replace the existing header block:

```markdown
> **→ For SEO-Analysts: read [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) first (microservices workflow + domain skill map + proto-breaking protocol).**
> This file is the framework-agnostic reference.
>
> Superpowers + GSD + GStack — unified development workflow
```

With:

```markdown
> **Routing:**
> - Backend / microservices work → [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) (proto-breaking protocol, gRPC gates).
> - Frontend work (`apps/web/**`) → [WORKFLOW-FRONTEND.md](WORKFLOW-FRONTEND.md) (`/prepare-design` → `/claude-design`).
> This file is the framework-agnostic reference.
>
> Superpowers + GSD + GStack — unified development workflow
```

- [ ] **Step 2: Append FE row to Size Routing block**

Replace the existing Size Routing block:

```markdown
## Size Routing

\`\`\`
SMALL:  SP:TDD -> SP:verify -> done
MEDIUM: /office-hours -> gsd:quick -> SP:TDD -> /review -> done
LARGE:  /office-hours + /plan-eng-review -> gsd:discuss + gsd:plan
        -> SP:TDD + gsd:execute -> /review + /cso + /qa -> /ship -> done
\`\`\`
```

With (adds FRONTEND line, keeps the rest identical):

```markdown
## Size Routing

\`\`\`
SMALL:    SP:TDD -> SP:verify -> done
MEDIUM:   /office-hours -> gsd:quick -> SP:TDD -> /review -> done
LARGE:    /office-hours + /plan-eng-review -> gsd:discuss + gsd:plan
          -> SP:TDD + gsd:execute -> /review + /cso + /qa -> /ship -> done
FRONTEND: [optional /prepare-design] -> /claude-design -> SP:TDD (per file)
          -> /review + /design-review [+ /qa for Large] -> done
\`\`\`

**FRONTEND branch is selected when primary change target is `apps/web/**` or `packages/ui/**`.** See [WORKFLOW-FRONTEND.md](WORKFLOW-FRONTEND.md) for the tier × design-artifact matrix.
```

- [ ] **Step 3: Update Mermaid decision tree**

Replace the existing Mermaid block with:

````markdown
## Decision Tree (Mermaid)

```mermaid
flowchart TD
    A[Task In] --> B{Classify}
    B -->|Small BE| C[SP:TDD]
    C --> D[SP:verify]
    D -->|pass| E1[Done]
    D -->|fail, retry ≤2| C

    B -->|Medium BE| F[/office-hours]
    F --> G[gsd:quick --discuss]
    G --> H[SP:TDD]
    H --> I[/review]
    I -->|pass| E2[Done]
    I -->|fail, retry ≤2| H

    B -->|Large BE| J[/office-hours + /plan-eng-review]
    J --> K[gsd:discuss + gsd:plan]
    K --> L[SP:TDD + gsd:execute waves]
    L --> M[/review + /cso + /qa]
    M -->|pass| N[/ship + /land-and-deploy + /canary]
    M -->|fail, retry ≤2| L
    N --> E3[Done]

    B -->|Frontend| FE0{design source exists?}
    FE0 -->|no| FEP[/prepare-design]
    FEP --> FE0
    FE0 -->|yes| FE1[/claude-design Phase 0-3]
    FE1 --> FE2[SP:TDD per file]
    FE2 --> FE3[/review + /design-review]
    FE3 -->|pass| E4[Done]
    FE3 -->|fail, retry ≤2| FE2

    C -.->|scope grows| SES[Size Escalation: STOP → re-classify → restart]
    H -.->|scope grows| SES
    L -.->|scope grows| SES
    FE2 -.->|scope grows| SES
```
````

- [ ] **Step 4: Append WORKFLOW-FRONTEND.md to Detailed Guides list**

Replace:

```markdown
## Detailed Guides

- [WORKFLOW-SMALL.md](WORKFLOW-SMALL.md) — Bug fix, config, typo
- [WORKFLOW-MEDIUM.md](WORKFLOW-MEDIUM.md) — Single module feature
- [WORKFLOW-LARGE.md](WORKFLOW-LARGE.md) — Multi-module, architecture change
```

With:

```markdown
## Detailed Guides

- [WORKFLOW-SMALL.md](WORKFLOW-SMALL.md) — Bug fix, config, typo
- [WORKFLOW-MEDIUM.md](WORKFLOW-MEDIUM.md) — Single module feature
- [WORKFLOW-LARGE.md](WORKFLOW-LARGE.md) — Multi-module, architecture change
- [WORKFLOW-FRONTEND.md](WORKFLOW-FRONTEND.md) — Frontend lane (`apps/web/`), `/prepare-design` → `/claude-design` pipeline
- [WORKFLOW-SEO-ANALYSTS.md](WORKFLOW-SEO-ANALYSTS.md) — Microservices domain workflow + proto-breaking protocol
```

- [ ] **Step 5: Verify structure**

Run: `grep "WORKFLOW-FRONTEND.md" ".claude/workflow/WORKFLOW.md"` — expect ≥ 3 references (header pointer, detailed guides, internal link).
Run: `grep "Frontend" ".claude/workflow/WORKFLOW.md"` — expect ≥ 2 matches.
Run: `grep "FRONTEND:" ".claude/workflow/WORKFLOW.md"` — expect 1 match (routing block).

- [ ] **Step 6: Commit**

```bash
git add .claude/workflow/WORKFLOW.md
git commit -m "$(cat <<'EOF'
docs(workflow): add FE lane to WORKFLOW.md

Adds frontend branch to size routing + Mermaid tree, links to the new
WORKFLOW-FRONTEND.md. Backend branches (Small/Medium/Large) unchanged.
EOF
)"
```

---

## Task 4: Mirror WORKFLOW.md update to `docs/workflow/`

**Files:**
- Modify: `docs/workflow/WORKFLOW.md`

- [ ] **Step 1: Overwrite with authoritative copy**

Run: `cp ".claude/workflow/WORKFLOW.md" "docs/workflow/WORKFLOW.md"`

- [ ] **Step 2: Verify parity**

Run: `diff ".claude/workflow/WORKFLOW.md" "docs/workflow/WORKFLOW.md"` — expect empty output.

- [ ] **Step 3: Commit**

```bash
git add docs/workflow/WORKFLOW.md
git commit -m "$(cat <<'EOF'
docs(workflow): mirror WORKFLOW.md FE-lane update to docs/workflow/
EOF
)"
```

---

## Task 5: Create `.claude/commands/prepare-design.md`

**Files:**
- Create: `.claude/commands/prepare-design.md`

- [ ] **Step 1: Write the slash command file**

Write to `.claude/commands/prepare-design.md`:

````markdown
# /prepare-design $ARGUMENTS

Generate design source files for a frontend feature under `docs/design/<slug>/`
by orchestrating existing GStack design skills. Upstream of `/claude-design`.

**Your role:** product manager + tech lead running a structured design session.

---

## STEP 0 — PARSE ARGUMENTS

```
/prepare-design <feature-description>        # full flow: PRD + DESIGN + mockups
/prepare-design <slug> --prd-only             # only (re)generate PRD.md
/prepare-design <slug> --design-only          # only (re)generate DESIGN.md
/prepare-design <slug> --mockups-only         # only (re)generate mockups/
/prepare-design <slug> --status               # list what exists, what's missing
```

**Derive slug** from free-text description: kebab-case, max 6 words, drop stopwords.
Example: `"build audit history dashboard"` → `audit-history-dashboard`.

If argument is already a slug (no spaces, all lowercase + dashes), use it directly
and require a `--*-only` flag.

---

## STEP 1 — SETUP

1. Compute `<slug>` from `$ARGUMENTS`.
2. Create directory: `mkdir -p "docs/design/<slug>/mockups"`.
3. Announce: `"Using /prepare-design for: <slug>"`.
4. Print which segments will run based on flags (default = all three).

---

## STEP 2 — GENERATE PRD (unless `--design-only` or `--mockups-only`)

**Skip if `docs/design/<slug>/PRD.md` already exists** — tell user:
`"PRD.md exists. Pass --prd-only to regenerate, or skip to next segment."`

Otherwise:

1. Invoke the `/office-hours` skill with the feature description.
2. `/office-hours` will ask the user 6 forcing questions (demand reality,
   status quo, desperate specificity, narrowest wedge, observation, future-fit).
3. After the skill finishes, convert its output into `docs/design/<slug>/PRD.md`
   with this structure:

```markdown
---
type: prd
feature_slug: <slug>
date: <today>
status: draft
---

# <Feature Title> — Product Requirements

## Problem

<1-2 paragraph statement of the problem being solved, from Q1/Q2 of office-hours>

## User stories

- As a <role>, I want <capability> so that <outcome>.
- ...

## Acceptance criteria

- <testable condition 1>
- <testable condition 2>
- ...

## Out of scope

- <explicit non-goal 1>
- ...

## Open questions

- <unresolved question 1>
- ...
```

4. Show the drafted PRD.md to user, ask: `"PRD ready. Reply 'ok' to commit and move on, or comment to iterate."`
5. On `ok`: commit with `docs(design): <slug>/PRD.md — <one-line summary>`.

---

## STEP 3 — GENERATE DESIGN (unless `--prd-only` or `--mockups-only`)

**Skip if `docs/design/<slug>/DESIGN.md` already exists** — tell user same as above.

Otherwise:

1. Invoke the `/design-consultation` skill. If a PRD exists, pass its content so the consultation grounds on documented requirements.
2. After the skill finishes, convert its output into `docs/design/<slug>/DESIGN.md`:

```markdown
---
type: design
feature_slug: <slug>
date: <today>
status: draft
---

# <Feature Title> — Technical Design

## Architecture overview

<high-level shape: pages, major components, data flow>

## Components

### <ComponentName>

- Purpose: <one line>
- Location: `apps/web/components/...` or `packages/ui/...`
- Props: <type sketch>
- Deps: <list>

(repeat per component)

## Data flow

<how data moves: API calls, TanStack Query keys, WS events, state ownership>

## States

- loading: <description>
- empty: <description>
- error: <description>
- populated: <description>

## Routes

- `/path` — <purpose>

## Open technical questions

- <unresolved question 1>
```

3. Show DESIGN.md, ask for `ok` → commit with `docs(design): <slug>/DESIGN.md — <one-line summary>`.

---

## STEP 4 — GENERATE MOCKUPS (unless `--prd-only` or `--design-only`)

**Skip if `docs/design/<slug>/mockups/` has ≥ 1 file** — tell user same as above.

Otherwise:

1. Invoke `/design-shotgun` to generate 3 visual variants based on PRD + DESIGN.
2. Present the 3 variants to user, ask which to keep (may be multiple).
3. Save chosen variants as PNG/HTML under `docs/design/<slug>/mockups/`.
4. Suggested filenames: `desktop.png`, `mobile.png`, `states.png` (or `variant-a.html`, etc.).
5. Commit with `docs(design): <slug>/mockups — <chosen variant summary>`.

---

## STEP 5 — FINALIZE

1. Print a summary:

```
✓ docs/design/<slug>/PRD.md       (<N> lines)
✓ docs/design/<slug>/DESIGN.md    (<N> lines)
✓ docs/design/<slug>/mockups/     (<N> files)
```

2. Next step suggestion:

```
Design source ready. Next: run /claude-design <slug> to build.
```

3. Exit.

---

## FAILURE HANDLING

- Skill invocation fails → surface the skill's error verbatim, offer to retry or skip segment.
- User declines a segment → write a `# SKIPPED — reason: <...>` placeholder file instead of empty (so `/claude-design` Phase 0 can detect intentional vs forgotten skip).
- Interrupt mid-segment → the partial artifact is NOT committed; user can re-run `/prepare-design <slug> --<segment>-only`.

---

## NOTES FOR THE ASSISTANT

- DO NOT bypass the orchestrated skills and write PRD/DESIGN content directly from your own reasoning. The Q&A loop IS the value — it makes design decisions explicit and reviewable.
- DO NOT auto-advance between segments without user confirmation.
- DO respect the user's time: if they ask you to skip a segment, respect it — don't beg for more.
- This command is the ONLY place where feature Q&A happens. `/claude-design` must stay Q&A-free about the feature itself.
````

- [ ] **Step 2: Verify structure**

Run: `grep "^## STEP" ".claude/commands/prepare-design.md"` — expect 6 lines (STEP 0 through STEP 5).
Run: `grep "office-hours" ".claude/commands/prepare-design.md"` — expect match.
Run: `grep "design-consultation" ".claude/commands/prepare-design.md"` — expect match.
Run: `grep "design-shotgun" ".claude/commands/prepare-design.md"` — expect match.
Run: `grep '\$ARGUMENTS' ".claude/commands/prepare-design.md"` — expect match (in header).

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/prepare-design.md
git commit -m "$(cat <<'EOF'
feat(commands): add /prepare-design — design-source generator

Upstream of /claude-design. Orchestrates /office-hours (PRD),
/design-consultation (DESIGN), and /design-shotgun (mockups) into
docs/design/<slug>/. Supports --{prd,design,mockups}-only flags for
gap-filling. This is the ONLY command that runs feature Q&A.
EOF
)"
```

---

## Task 6: Create `.claude/commands/claude-design.md`

**Files:**
- Create: `.claude/commands/claude-design.md`

- [ ] **Step 1: Write the slash command file**

Write to `.claude/commands/claude-design.md`:

````markdown
# /claude-design $ARGUMENTS

Build a frontend feature in `apps/web/` from a finalized design source.
Runs a 6-phase pipeline: Design Validation → Onboard → Map → Plan → Build → Review.
Downstream of `/prepare-design`.

**Your role:** senior frontend engineer who has just onboarded — reads first,
codes second, never invents.

---

## STEP 0 — PARSE ARGUMENTS

```
/claude-design <feature-description>    # derive slug from description
/claude-design <slug>                    # use existing .planning/frontend/<slug>/
/claude-design <slug> --resume           # explicit resume at last incomplete phase
/claude-design <slug> --status           # show STATE.md, do not execute
/claude-design <slug> --tier=small       # override inferred tier (small|medium|large)
```

Derive `<slug>` from free-text: kebab-case, max 6 words. If `.planning/frontend/<slug>/STATE.md` already exists, prefer `--resume` semantics (skip completed phases).

---

## STEP 1 — SETUP

1. Compute `<slug>` from `$ARGUMENTS`.
2. `mkdir -p ".planning/frontend/<slug>"`.
3. If `STATE.md` exists and not `--status` → load it to determine resume point.
4. Else → write initial `STATE.md`:

```markdown
---
feature_slug: <slug>
created: <today>
tier: unknown     # resolved in Phase 0
impact: unknown   # resolved in Phase 2
phases:
  "0": pending
  "1": pending
  "2": pending
  "3": pending
  "4": pending
  "5": pending
---

# Phase state — <slug>

(Updated after each phase.)
```

5. Announce: `"Using /claude-design for: <slug> (resuming at Phase <N>)"` or `"(new run)"`.

---

## STEP 2 — PHASE 0: DESIGN SOURCE VALIDATION

**Goal:** confirm `docs/design/<slug>/` satisfies the tier's required artifacts.
**No feature Q&A** — only tier confirmation if ambiguous.

1. Classify tier from `$ARGUMENTS` keywords + any `--tier=` override:
   - Keywords "tweak / color / copy / typo" → Small.
   - Keywords "page / modal / form / dashboard card group" → Medium.
   - Keywords "multi-page / feature / realtime / auth / admin" → Large.
   - Default if ambiguous → Medium, but confirm with user first.

2. Check artifacts vs tier requirements:

| Tier | Required in `docs/design/<slug>/` |
|---|---|
| Small | (none) |
| Medium | `PRD.md` OR `DESIGN.md` |
| Large | `PRD.md` AND `DESIGN.md` AND `mockups/` |

3. If missing artifacts → HALT with:

```
❌ Missing design source for <Tier> FE:
   - docs/design/<slug>/PRD.md
   - docs/design/<slug>/mockups/

Fill the gap by running:
   /prepare-design <slug> --prd-only
   /prepare-design <slug> --mockups-only

Or author the files by hand, then re-run:
   /claude-design <slug>
```

Update STATE.md `phases.0` = `halted: missing-design-source`, then exit.

4. If artifacts present → read them and produce `DESIGN-INPUT.md`:

```markdown
---
phase: 0
feature_slug: <slug>
date: <today>
status: approved
tier: <small|medium|large>
---

# Phase 0 — Design Input Digest

## Sources consumed

- `docs/design/<slug>/PRD.md` (<N> lines, modified <date>)
- `docs/design/<slug>/DESIGN.md` (<N> lines, modified <date>)
- `docs/design/<slug>/mockups/` (<N> files)

## Requirements (from PRD)

**User stories:**
- <copied from PRD>

**Acceptance criteria:**
- <copied from PRD>

## Technical direction (from DESIGN)

**Components:**
- <name>: <purpose, location>

**Data flow:**
- <summary>

**States to handle:**
- <from DESIGN>

## Visual references

- `desktop.png` — <brief description>
- `mobile.png` — <brief description>
- `states.png` — <brief description>

## Tier classification

Tier: <small|medium|large>
Reasoning: <one line>
```

5. Present summary to user. Ask: `"Phase 0 complete. Tier confirmed: <tier>. Reply 'next' to run Phase 1, or 'tier=<other>' to reclassify."`

6. On `next`: update STATE.md `phases.0` = `done`, commit:

```
docs(web): <slug>/phase-0 — design source validated
```

---

## STEP 3 — PHASE 1: ONBOARD (Agent:Explore subagent)

**Goal:** understand the current codebase + available BE contracts without polluting main context.

1. Dispatch a subagent via `Agent:Explore` with this prompt (substitute `<slug>`):

```
Analyze the DO_AN monorepo frontend + API surface. Do NOT read any non-gateway backend apps. Produce a structured summary covering exactly these 10 sections:

1. FE folder structure + routing convention (scan apps/web/, list app/* directories, identify App Router vs Pages Router).
2. Component design pattern (server vs client components, what primitives exist in packages/ui/src/**).
3. Styling approach (scan apps/web/app/globals.css or equivalent, tailwind.config, design tokens).
4. API client pattern (find fetch/axios wrappers, TanStack Query setup, error handling).
5. State management (Zustand / context / URL state — whichever is present).
6. Realtime pattern (Socket.IO client code, event subscription shape).
7. Available gateway HTTP endpoints (grep apps/gateway/src/**/controllers/**/*.controller.ts for @Get/@Post/@Patch/@Delete/@Put decorators → list path + method + DTO types).
8. Available gateway WS events (grep apps/gateway/src/**/gateways/**/*.gateway.ts → list event names + payload types referenced from @repo/shared).
9. Available proto RPCs (read packages/proto/src/**/*.proto → list service + method + request/response messages).
10. Naming conventions observed (file naming, PascalCase vs camelCase, test file suffix).

SKIP: node_modules/, dist/, .next/, apps/gateway/src/infra/prisma/generated/, apps/{crawler,seo-analyzer,keyword-analyzer,report}/.

READ: apps/web/**, packages/ui/src/**, packages/proto/src/**, packages/shared/src/**, apps/gateway/src/**/controllers/**, apps/gateway/src/**/gateways/**, turbo.json, tsconfig.base.json.

Return a markdown document with exactly those 10 numbered sections. Do NOT include code generation or recommendations — this is an onboard report.
```

2. Receive subagent report. Write it to `.planning/frontend/<slug>/ONBOARD.md` with frontmatter:

```yaml
---
phase: 1
feature_slug: <slug>
date: <today>
status: draft
tier: <from STATE.md>
---
```

3. Show user a condensed summary (first 2 lines of each section). Ask: `"Phase 1 complete. Artifact: .planning/frontend/<slug>/ONBOARD.md. Reply 'next' to run Phase 2, or comment to re-scan."`

4. On `next`: update STATE.md `phases.1` = `done`, commit:

```
docs(web): <slug>/phase-1 — codebase onboard report
```

---

## STEP 4 — PHASE 2: FEATURE MAPPING

**Goal:** map the feature from DESIGN-INPUT onto real file paths and identify MISSING backend.

1. Read `DESIGN-INPUT.md` + `ONBOARD.md`.

2. For each user story in DESIGN-INPUT, determine:
   - Pages to create / modify (cite `apps/web/app/**` path).
   - Components to create / reuse (cite `packages/ui/src/...` or `apps/web/components/...`).
   - API endpoints used — mark `EXISTS` with `apps/gateway/...` file:line reference, OR `MISSING` with required shape.
   - WS events used — same EXISTS / MISSING treatment.
   - Proto impact — `none` / `existing-consumer` / `new-rpc-needed`.

3. Write `.planning/frontend/<slug>/MAPPING.md`:

```markdown
---
phase: 2
feature_slug: <slug>
date: <today>
status: draft
tier: <possibly escalated>
impact: <web-only|web+gateway-read|cross-stack|proto-breaking>
---

# Phase 2 — Feature Mapping

## Pages

| Path | Action | Purpose |
|---|---|---|
| `apps/web/app/<route>/page.tsx` | create | <purpose> |

## Components

| Path | Action | Reuses | Purpose |
|---|---|---|---|
| `apps/web/components/<name>.tsx` | create | `packages/ui/card`, `packages/ui/button` | <purpose> |

## API endpoints

| Method | Path | Status | Source |
|---|---|---|---|
| GET | /api/audits | EXISTS | apps/gateway/src/audits/controllers/audits.controller.ts:42 |
| POST | /api/audits/<id>/retry | MISSING | needs new handler |

## WS events

| Event | Status | Payload type |
|---|---|---|
| audit.completed | EXISTS | AuditCompletedEvent (@repo/shared) |

## Proto impact

- none / existing-consumer / new-rpc-needed
- (if new-rpc-needed: list required RPCs)

## Tier escalation decision

- Starting tier (from Phase 0): <tier>
- After mapping: <tier>
- Reason: <one line>
```

4. **HALT conditions:**
   - Any `MISSING` API or WS event → print: `"Backend work required first: <list>. Run backend workflow (WORKFLOW-MEDIUM.md or WORKFLOW-LARGE.md) for the gap, then resume /claude-design <slug>."` Update STATE.md `phases.2` = `halted: missing-backend`, exit.
   - Proto impact = `new-rpc-needed` → escalate tier to Large + `proto-breaking`; if design source does not satisfy new tier requirements (§ Phase 0 table), HALT with exact `/prepare-design` remediation. Else continue.

5. Else: ask user `"Phase 2 complete. Reply 'next' to run Phase 3, or comment to revise mapping."`

6. On `next`: update STATE.md `phases.2` = `done` + `impact`, commit:

```
docs(web): <slug>/phase-2 — feature-to-code mapping
```

---

## STEP 5 — PHASE 3: IMPLEMENTATION PLAN

**Goal:** ordered file list with dependency waves.

1. Read `ONBOARD.md` + `MAPPING.md`.

2. Order files: leaf components first (no FE-code deps), containers next, pages last. Within each level, group files with no mutual deps into a wave.

3. For each file, estimate LOC; if > 150, split into two files and note the split.

4. Write `.planning/frontend/<slug>/PLAN.md`:

```markdown
---
phase: 3
feature_slug: <slug>
date: <today>
status: draft
tier: <from MAPPING.md>
impact: <from MAPPING.md>
---

# Phase 3 — Implementation Plan

## Wave 1 (leaves, parallelizable)

### File: `apps/web/components/<name>.tsx`

- Purpose: <one line>
- Props: `{ x: T1; y: T2 }`
- Deps: `@repo/ui`, `react`
- Test: `apps/web/components/<name>.test.tsx`
- Est. LOC: 45

### File: ... (repeat per file in wave)

## Wave 2 (containers, depends on wave 1)

### File: `apps/web/components/<container>.tsx`

- Purpose: ...
- Deps: <from wave 1>
- Test: ...
- Est. LOC: 90

## Wave 3 (pages, depends on containers)

### File: `apps/web/app/<route>/page.tsx`

...

## Integration checklist

- Env vars required: <list, or "none">
- TanStack Query keys: <list>
- Route groups / layouts touched: <list>
- New translations needed: <list or "none">
```

5. Ask user: `"Phase 3 complete. Reply 'next' to run Phase 4 (file-by-file build), or comment to revise plan."`

6. On `next`: update STATE.md `phases.3` = `done`, commit:

```
docs(web): <slug>/phase-3 — implementation plan
```

---

## STEP 6 — PHASE 4: FILE-BY-FILE BUILD

**Goal:** implement each file via TDD with atomic commits.

1. Init `BUILD-LOG.md`:

```markdown
---
phase: 4
feature_slug: <slug>
date: <today>
status: in-progress
tier: <from PLAN.md>
impact: <from PLAN.md>
---

# Phase 4 — Build Log

| Wave | File | Tests | Commit | Status |
|---|---|---|---|---|
```

2. For each wave in PLAN.md:
   - **Small / Medium tier:** sequential — one file at a time.
   - **Large tier:** dispatch files in the same wave to parallel subagents running `superpowers:test-driven-development`.

3. Each file cycle (executed by the TDD skill):
   1. Write failing test.
   2. Run test → confirm RED.
   3. Write minimal implementation.
   4. Run test → confirm GREEN.
   5. Refactor if needed.
   6. Commit atomically: `feat(web): <slug>/<file-basename> — <one-liner>`.
   7. Append to BUILD-LOG.md: `| <wave> | <file> | <n> | <sha> | ✓ |`.

4. After each wave (Large) or each file (Small/Medium): summarize for user, ask `"Wave N complete. Reply 'next' to continue, or comment to intervene."`

5. On all waves done: update STATE.md `phases.4` = `done`, commit:

```
docs(web): <slug>/phase-4 — build log finalized
```

(Individual file commits are part of the TDD skill's atomic-commit-per-file policy.)

---

## STEP 7 — PHASE 5: QUALITY GATES

**Goal:** run gates per tier, fix failures, max 2 retries.

1. Determine which gates apply based on STATE.md tier + MAPPING.md impact:

| # | Gate | Command | Runs when |
|---|---|---|---|
| 1 | Type check | `npm run type-check` | Always |
| 2 | Lint | `npm run lint --filter=web` | Always |
| 3 | Unit tests | `npm run test --filter=web` | Always |
| 4 | Proto typecheck | `npm run build --filter=@repo/proto && npm run type-check` | Impact touches `packages/proto` |
| 5 | gRPC + HTTP smoke | `npm run e2e:smoke` | Impact touches gateway controller/service |
| 6 | `/review` (GStack) | — | Tier ≥ Medium |
| 7 | `/design-review` (GStack) | — | New visual UI introduced |
| 8 | `/qa` (GStack) | — | Large + interactive feature |
| 9 | `/cso` (GStack) | — | Large + auth / PII / admin |

2. Run gates in order. Init REVIEW.md:

```markdown
---
phase: 5
feature_slug: <slug>
date: <today>
status: in-progress
tier: <from STATE.md>
impact: <from STATE.md>
---

# Phase 5 — Review Log

| Gate | Command | Result | Retries | Notes |
|---|---|---|---|---|
```

3. For each gate:
   - Run it. Capture output.
   - If PASS → append `| <n> | <cmd> | ✓ | 0 | — |` to REVIEW.md, continue.
   - If FAIL → back to Phase 4 targeting only failing files. Re-run THIS gate only (not others).
   - Max 2 retries per gate. On 3rd failure → STOP, append `| <n> | <cmd> | ✗ | 2 | BLOCKED — ask user |` to REVIEW.md, exit with blocker notice.

4. All gates pass → update STATE.md `phases.5` = `done`, commit:

```
docs(web): <slug>/phase-5 — all gates green
```

5. Announce: `"/claude-design <slug> complete. Feature shipped across <N> files, <M> tests. Ready for /ship."`

---

## FAILURE HANDLING

- **Design-source drift** (user edits `docs/design/<slug>/` mid-build): re-run Phase 0 + Phase 2 manually with `/claude-design <slug> --resume` — existing commits are kept, MAPPING.md gets a "carried over" section.
- **Mid-build scope growth:** STOP → re-classify tier → re-run Phase 2 with augmented feature description from the newly surfaced requirement → proceed. Files already committed are kept.
- **User interrupts:** STATE.md is the source of truth. Re-run `/claude-design <slug>` resumes at first incomplete phase.

---

## NOTES FOR THE ASSISTANT

- **Phase 0 never asks about the feature.** If design source is missing, emit the `/prepare-design` command and exit — do NOT start asking feature questions.
- **Phase 1 MUST use Agent:Explore subagent**, not inline file reads. This protects main context.
- **Phase 4 MUST use superpowers:test-driven-development for each file.** Do not emit implementation code before the failing test exists.
- **Phase 5 skip logic is conditional on tier + impact**, not on user preference. If a gate applies, it runs.
- **Commits are atomic per artifact.** Never combine phase 2 and phase 3 commits.
````

- [ ] **Step 2: Verify structure**

Run: `grep "^## STEP" ".claude/commands/claude-design.md"` — expect 8 lines (STEP 0 through STEP 7).
Run: `grep "PHASE [0-5]" ".claude/commands/claude-design.md"` — expect ≥ 6 phase headers.
Run: `grep "Agent:Explore" ".claude/commands/claude-design.md"` — expect ≥ 2 matches.
Run: `grep "superpowers:test-driven-development" ".claude/commands/claude-design.md"` — expect ≥ 2 matches.
Run: `grep "/prepare-design" ".claude/commands/claude-design.md"` — expect ≥ 2 matches (HALT remediation).
Run: `grep '\$ARGUMENTS' ".claude/commands/claude-design.md"` — expect match (header).

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/claude-design.md
git commit -m "$(cat <<'EOF'
feat(commands): add /claude-design — 6-phase FE build pipeline

Downstream of /prepare-design. Phase 0 validates docs/design/<slug>/
precondition (HALT if missing) before running Onboard → Map → Plan →
Build → Review. Phase 1 uses Agent:Explore subagent to protect main
context; Phase 4 delegates each file to superpowers:test-driven-
development for atomic RED → GREEN → REFACTOR cycles. Phase 5 runs
9 conditional quality gates with retry-only-failing-gate policy.
EOF
)"
```

---

## Task 7: Trial run — happy path (pre-authored design)

**Goal:** verify `/claude-design` runs end-to-end when design source already exists. Feature is intentionally trivial so it exercises every phase without committing real `apps/web/` code (DO_AN hasn't scaffolded `apps/web/` yet, so Phase 1 onboard + Phase 2 mapping will report honestly that the FE tree is empty — that's the validation).

**Files:**
- Create: `docs/design/trial-about-page/PRD.md` (hand-authored)
- Generated (verify): `.planning/frontend/trial-about-page/{STATE,DESIGN-INPUT,ONBOARD,MAPPING}.md`

- [ ] **Step 1: Write a minimal PRD by hand**

Write to `docs/design/trial-about-page/PRD.md`:

```markdown
---
type: prd
feature_slug: trial-about-page
date: 2026-04-18
status: approved
---

# About Page — Trial PRD

## Problem

We need a verification artifact to exercise the /claude-design pipeline end-to-end
without scaffolding a real feature. An About page is minimal and representative.

## User stories

- As a visitor, I want to read about the product at /about so I understand what it does.

## Acceptance criteria

- Route /about returns 200.
- Page contains a heading and one paragraph.
- Page uses the existing layout + Tailwind tokens.

## Out of scope

- Any dynamic data.
- Analytics.
- i18n.

## Open questions

- None (intentionally minimal for pipeline trial).
```

- [ ] **Step 2: Commit the trial PRD**

```bash
git add docs/design/trial-about-page/PRD.md
git commit -m "docs(design): trial-about-page PRD for /claude-design e2e trial"
```

- [ ] **Step 3: Run /claude-design on the trial**

In a fresh conversation (so the slash command loads cleanly), run:

```
/claude-design trial-about-page --tier=small
```

Why `--tier=small`: About page fits Small FE (≤ 2 files). Small tier skips Phase 0 artifact requirements but we have a PRD anyway. Phase 1 will honestly report that `apps/web/` is empty — that's fine; Phase 2 will note the `MISSING apps/web/` scaffold and HALT, which IS the expected result until M7 creates the scaffold.

- [ ] **Step 4: Verify Phase 0 + 1 produce artifacts**

Run: `ls .planning/frontend/trial-about-page/` — expect `STATE.md`, `DESIGN-INPUT.md`, `ONBOARD.md` at minimum.
Run: `grep "^phase:" .planning/frontend/trial-about-page/STATE.md` — expect tracking present.

- [ ] **Step 5: Verify Phase 2 HALT behavior is correct**

Expected: Phase 2 HALTs with a "Backend/FE scaffold missing" notice, pointing at the M7 scaffolding work. If it proceeds anyway, that's a bug in `/claude-design` — note it in follow-up issues.

Run: `grep -i "halt\|missing" .planning/frontend/trial-about-page/STATE.md || echo "no halt recorded"` — expect a halt record.

- [ ] **Step 6: Record trial result**

Append findings to the plan file or a trial-notes.md. If the pipeline worked as expected, commit:

```bash
git add .planning/frontend/trial-about-page/
git commit -m "$(cat <<'EOF'
test(workflow): /claude-design happy-path trial — Phase 0-2 verified

Trial used pre-authored docs/design/trial-about-page/PRD.md. Pipeline
halted correctly at Phase 2 because apps/web/ does not yet exist —
this is the expected behavior until M7 scaffolds the FE app.
EOF
)"
```

If the pipeline broke at a different point, fix the command files (Task 5 or 6) and re-run this task from Step 3.

---

## Task 8: Trial run — HALT path (missing design source)

**Goal:** verify `/claude-design` refuses to proceed when required artifacts are missing, and emits the correct `/prepare-design` remediation command.

**Files:**
- Uses: nothing new committed (trial is verification only).

- [ ] **Step 1: Remove PRD to simulate missing design**

Run: `mv docs/design/trial-about-page/PRD.md /tmp/PRD.md.backup`

This makes the trial slug have zero design artifacts.

- [ ] **Step 2: Run /claude-design with Medium tier override**

In a fresh conversation:

```
/claude-design trial-about-page --tier=medium
```

Medium tier requires `PRD.md` OR `DESIGN.md`. Neither exists → Phase 0 must HALT.

- [ ] **Step 3: Verify HALT output is correct**

Expected output contains (paraphrased):

```
❌ Missing design source for Medium FE:
   - docs/design/trial-about-page/PRD.md
   - docs/design/trial-about-page/DESIGN.md (at least one required)

Fill the gap by running:
   /prepare-design trial-about-page --prd-only
   (or)
   /prepare-design trial-about-page --design-only
```

Run: `grep -i "missing\|prepare-design" .planning/frontend/trial-about-page/STATE.md` — expect match showing HALT recorded.

- [ ] **Step 4: Restore PRD**

Run: `mv /tmp/PRD.md.backup docs/design/trial-about-page/PRD.md`
Run: `git status docs/design/trial-about-page/` — expect clean (restored to tracked state).

- [ ] **Step 5: No commit needed**

This trial is verification only — nothing new to commit. If the HALT path failed (e.g., Phase 0 proceeded silently), fix `.claude/commands/claude-design.md` Phase 0 logic and re-run from Step 2.

---

## Task 9: Self-review against spec

**Files:** none (review-only).

- [ ] **Step 1: Re-read spec and check coverage**

Run: `cat docs/superpowers/specs/2026-04-18-claude-design-workflow-design.md | head -200`

Check every Goal / Non-Goal / § section against the committed files. Note any gaps.

- [ ] **Step 2: Verify all 6 file changes are in git log**

Run: `git log --oneline -20 | grep -E "(claude-design|prepare-design|WORKFLOW-FRONTEND|WORKFLOW.md)"` — expect ≥ 6 commits (one per file task).

- [ ] **Step 3: Verify no orphan references**

Run: `grep -l "claude-design\|prepare-design" .claude/ docs/ -r` — every match should be in an expected file (spec, plan, commands, workflow guides).

- [ ] **Step 4: Confirm no apps/web/ scaffolding happened**

Run: `git diff HEAD~9 --stat -- apps/web/ 2>/dev/null | wc -l` — expect `0` (zero). Per Non-Goal in spec, this plan must NOT create FE scaffolding.

- [ ] **Step 5: Final commit (if any fixes needed)**

If any issue found, fix inline and commit:

```bash
git add <fixed-files>
git commit -m "fix(workflow): address self-review gaps in claude-design implementation"
```

If nothing to fix, no commit needed — plan is complete.

---

## Self-Review Summary

After running Task 9:

- ✅ Spec § 1 File plan (4 creates + 2 updates): Tasks 1, 2, 3, 4, 5, 6 cover all six files.
- ✅ Spec § 2 + 2.5 tier × artifact matrix: documented in Task 1 (WORKFLOW-FRONTEND.md) and Task 6 (Phase 0 of /claude-design).
- ✅ Spec § 3 phase responsibilities: Task 6 STEP 2-7 implement Phases 0-5 with the exact artifact sections and gate ordering.
- ✅ Spec § 4 artifact layout: documented in Task 1 and enforced by Task 6 Phase 0/1/2/3/4/5 writes.
- ✅ Spec § 5 slash command contract: Task 5 (prepare-design) and Task 6 (claude-design) match 5.1 and 5.2.
- ✅ Spec § 6 WORKFLOW.md integration: Task 3 adds FE row + Mermaid branch.
- ✅ Spec § 7 skill interactions: Task 5 orchestrates /office-hours, /design-consultation, /design-shotgun. Task 6 uses Agent:Explore, TDD, gsd:execute (Large), /review, /design-review, /qa, /cso. gsd:discuss/gsd:plan NOT invoked.
- ✅ Spec § 8 escalation + failure: Task 6 STEP 4 (MISSING backend HALT), STEP 7 (retry-only-failing-gate, max 2), STEP 2 (design drift resume note).
- ✅ Success Criteria 1, 2, 3: Tasks 7 and 8 verify end-to-end flow + HALT behavior.
- ✅ Success Criteria 8: Task 9 Step 4 enforces "no apps/web/ scaffolding".

No gaps identified.
