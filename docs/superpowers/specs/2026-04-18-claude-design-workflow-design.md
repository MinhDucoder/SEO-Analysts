# Claude Design Workflow — Frontend Pre-Build Lane for DO_AN

**Date**: 2026-04-18
**Author**: Claude (via `superpowers:brainstorming`)
**Status**: Draft — awaiting user review
**Scope**: Approach C (slash-command lightweight) × Scope A (DO_AN `apps/web/` Next.js dashboard on top of existing SEO microservices) × Design precondition via 2-step split (`/prepare-design` → `/claude-design`)

---

## Problem

`.claude/workflow/` was redesigned on 2026-04-17 to match the SEO microservices reality (5 NestJS apps + gRPC + BullMQ + 3 Postgres DBs + `@repo/*` workspace packages). That redesign is backend-centric by design — SMALL / MEDIUM / LARGE tiering plus a single-service / cross-service / proto-breaking impact axis, with every worked example targeting `apps/<backend-service>/src/...`.

Milestone M7 adds a frontend dashboard (`apps/web/`, Next.js) that consumes the gateway over HTTP + WebSocket. The current workflow has no lane for this work, so FE tasks inherit the backend routing. In practice that means:

1. **No onboard phase.** Claude skips `packages/proto/` and `@repo/shared` scanning, then invents API signatures and event payloads that don't exist on the gateway.
2. **No cross-stack mapping.** Feature requests get planned entirely inside `apps/web/`, missing the proto contracts and BullMQ event payloads the FE actually subscribes to.
3. **Page-level codegen.** Without the per-file discipline from `claude-design.md`, Claude generates 300-line pages in one shot and drifts from existing `packages/ui` primitives.
4. **Wrong KIEM DINH gates.** `/review` alone is not enough — visual regressions, type-drift between FE consumers and proto, and broken realtime subscriptions all need dedicated gates.

The artifact `.claude/workflow/claude-design.md` (added 2026-04-18) captures the right philosophy — Onboard → Map → Plan → Build file-by-file → Review — but is a prose doc with hand-invoked prompts, not wired into the 3-framework system (Superpowers + GSD + GStack) and not aware of DO_AN's monorepo constraints.

## Goals

1. Promote `claude-design.md`'s 5-phase philosophy into an **invokable slash command** (`/claude-design`) that runs the full loop with safe context management.
2. Extend the 3-framework workflow with a dedicated **FE lane** that reuses the existing SMALL / MEDIUM / LARGE tiering and adds FE-specific gates in KIEM DINH.
3. Make Phase 1 (Onboard) monorepo-aware: it MUST read `apps/web/`, `packages/ui/`, `packages/proto/`, `packages/shared/`, and the relevant gateway controllers — not just the FE tree.
4. Bind Phase 4 (Build) to `superpowers:test-driven-development` so file-by-file generation has RED → GREEN → REFACTOR discipline and atomic commits, not free-form codegen.
5. Bind Phase 5 (Review) to the existing GStack gates (`/review`, `/design-review`, `/qa`) plus monorepo-specific checks (type-check, proto typecheck, e2e:smoke), with conditional skip logic so small tasks don't pay for unnecessary gates.
6. Keep all artifacts under `.planning/frontend/<slug>/` so work is resumable across sessions and auditable from git history.
7. **Enforce design-first discipline** via a separate `/prepare-design` command that generates `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}` before build — so `/claude-design` can read a finalized design source instead of running interactive Q&A during build. Required artifacts scale by tier (§ 2.5).

## Non-Goals

- **No FE scaffolding.** This spec does not create `apps/web/`, `packages/ui` primitives, or any Next.js boilerplate. The scaffold is M7's own phase work, consumed by this workflow once it exists.
- **No new skill.** The workflow ships as a slash command, not a `.claude/skills/frontend-onboard/` skill. Promotion to a skill is deferred until usage warrants it.
- **No change to backend lanes.** `WORKFLOW-SMALL.md`, `WORKFLOW-MEDIUM.md`, `WORKFLOW-LARGE.md`, `WORKFLOW-SEO-ANALYSTS.md` stay unchanged for backend work. The FE lane runs **parallel** to them, not on top.
- **No replacement of GStack `/design-review` / `/qa`.** This workflow calls into them; it does not re-implement visual audit or QA logic.
- **No auto-trigger / hook.** Running the lane is user-invoked by typing `/claude-design`. No SessionStart hook, no settings.json changes.

## Design

### § 1. File plan

| File | Action | Rationale |
|---|---|---|
| `.claude/commands/prepare-design.md` | **CREATE** | Upstream slash command. Generates `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}` by orchestrating existing skills (`/office-hours`, `/design-consultation`, `/design-shotgun`). Runs only when design artifacts are missing. |
| `.claude/commands/claude-design.md` | **CREATE** | Build-phase slash command. Runs 5 phases (Onboard → Map → Plan → Build → Review). Phase 0 validates design precondition; HALTs and points to `/prepare-design` if missing. |
| `.claude/workflow/WORKFLOW-FRONTEND.md` | **CREATE** | FE-specific guide: tier × design-artifact matrix, per-phase responsibilities, gate list, escalation rules, `/prepare-design` ↔ `/claude-design` handoff. |
| `.claude/workflow/WORKFLOW.md` | **UPDATE** | Add FE lane row to the framework table and a routing branch to the Mermaid decision tree. Cross-link to `WORKFLOW-FRONTEND.md`. |
| `docs/workflow/WORKFLOW.md` | **UPDATE** | Mirror the `.claude/` update (human-readable copy pattern established on 2026-04-17). |
| `docs/workflow/WORKFLOW-FRONTEND.md` | **CREATE** | Mirror of `.claude/workflow/WORKFLOW-FRONTEND.md`. |
| `.claude/workflow/claude-design.md` | **KEEP (untouched)** | Remains as philosophy / teaching doc. The new command references it for newcomers. |

Total: 4 creates, 2 updates, 0 deletes.

### § 2. Size × Impact matrix for FE

FE inherits the same tier thresholds as backend plus an FE-specific impact axis:

| Tier | Trigger | Impact Axis |
|---|---|---|
| **Small FE** | ≤ 2 files, style / copy / prop tweak, no new component, no route change | `web-only` |
| **Medium FE** | 1 new page OR 3–5 new components, single API endpoint (existing on gateway) | `web-only` OR `web+gateway-read` |
| **Large FE** | Multi-page feature, new design system primitive, or ANY of: new API on gateway, proto change, new BullMQ event consumer, auth change | `cross-stack` OR `proto-breaking` |

**Escalation rules (force tier up):**

- Phase 2 (Mapping) discovers feature needs a gateway endpoint that does not exist → Medium becomes Large.
- Phase 2 discovers feature needs a new proto RPC or new BullMQ event → any tier becomes Large + proto-breaking.
- Phase 2 touches authentication or multi-tenant boundary → any tier becomes Large.
- Mid-execution scope growth mirrors the backend rule: STOP → re-classify → restart from first skipped phase → keep code already written.

### § 2.5. Design artifacts required per tier

`/claude-design` validates design precondition in Phase 0. Requirements scale with tier:

| Tier | Required artifacts under `docs/design/<slug>/` | Rationale |
|---|---|---|
| **Small FE** | None (can skip `/prepare-design` entirely) | Tweaks don't justify design overhead |
| **Medium FE** | `PRD.md` **OR** `DESIGN.md` (at least one) | 1 page / component group needs scope clarity OR technical direction |
| **Large FE** | `PRD.md` **AND** `DESIGN.md` **AND** `mockups/` (all three) | Multi-page features with proto/auth impact need full upfront design to prevent rework |

**If user starts `/claude-design` with lower tier artifacts than required, Phase 0 HALTs** and emits the exact `/prepare-design` sub-commands to fill the gap:

```
Missing for Large FE: docs/design/audit-history/mockups/
→ Run: /prepare-design audit-history --mockups-only
```

Authoring artifacts by hand is valid — `/prepare-design` is a helper, not a requirement. Any source (handwritten, Figma export, ChatGPT output) that lands at the right path satisfies the precondition.

### § 3. Phase responsibilities

Each phase produces one artifact under `.planning/frontend/<slug>/`. Each artifact is committed atomically before moving to the next phase. The slug is derived from the user's feature description (kebab-case).

#### Phase 0 — Design Source Validation (read-only, no Q&A)

- **Executor:** Main agent (fast, local filesystem check).
- **Reads:** `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}` — whichever exist.
- **Behavior:**
  1. Read `$ARGUMENTS` (user's feature description) + slug.
  2. Tentatively classify tier from description keywords (see § 2 triggers).
  3. Compare artifacts present vs tier requirements (§ 2.5).
  4. If requirements met → produce `DESIGN-INPUT.md` (summary + links to source files) and proceed to Phase 1.
  5. If requirements NOT met → HALT, emit exact remediation command(s) pointing at `/prepare-design`, write current state to `STATE.md`.
- **Produces:** `DESIGN-INPUT.md` with:
  - Feature name + slug + tier classification
  - List of design artifacts consumed (path + last modified + line count)
  - Extracted requirements (user stories, acceptance criteria from PRD)
  - Extracted technical constraints (architecture choices, component decisions from DESIGN)
  - Visual references (links to mockups, not embedded)
- **Gate:** Main agent shows `DESIGN-INPUT.md` summary, user confirms tier classification before Phase 1.
- **Key property:** Phase 0 NEVER asks user about the feature itself — all feature Q&A belongs in `/prepare-design`. Phase 0 only confirms tier if ambiguous.

#### Phase 1 — Onboard (subagent, read-only)

- **Executor:** `Agent:Explore` subagent (keeps main context lean).
- **Reads:** `apps/web/**`, `packages/ui/src/**`, `packages/proto/src/**` (all `.proto`), `packages/shared/src/**`, `apps/gateway/src/**/controllers/**`, `apps/gateway/src/**/gateways/**` (WS), root `turbo.json`, root `tsconfig.base.json`.
- **Skips:** `node_modules/`, `dist/`, `.next/`, `apps/gateway/src/infra/prisma/generated/**`, non-gateway backend apps (unless Phase 2 expands scope).
- **Produces:** `ONBOARD.md` with exactly these sections:
  1. FE folder structure + routing convention (App Router vs Pages Router, where layouts live)
  2. Component design pattern (server vs client, `packages/ui` primitives available)
  3. Styling approach (Tailwind config, design tokens, dark mode mechanism)
  4. API client pattern (fetch wrapper, TanStack Query setup, error handling)
  5. State management (Zustand / context / URL state — whichever is present)
  6. Realtime pattern (Socket.IO client, event subscription shape)
  7. Available gateway HTTP endpoints (path + method + request/response shape) — **pulled from `apps/gateway/**/controllers/**`**
  8. Available gateway WS events (event name + payload type) — **pulled from `apps/gateway/**/gateways/**` and `@repo/shared`**
  9. Available proto RPCs (service + method + request/response) — **pulled from `packages/proto/src/**`**
  10. Naming conventions observed in the existing tree
- **Gate:** Main agent reviews `ONBOARD.md`, presents summary, user approves before Phase 2.

#### Phase 2 — Feature Mapping

- **Executor:** Main agent (has `DESIGN-INPUT.md` + `ONBOARD.md` loaded).
- **Input:** `DESIGN-INPUT.md` (design source of truth) + `ONBOARD.md` (codebase reality).
- **Produces:** `MAPPING.md` with:
  - Pages to create / modify (file path in `apps/web/app/**`)
  - Components to create / reuse (from `packages/ui` or `apps/web/components/**`)
  - API endpoints used — marked `EXISTS` (reference `apps/gateway/...` file:line) or `MISSING` (needs backend work first)
  - WS events used — same EXISTS / MISSING marking
  - Proto impact — `none` / `existing-consumer` / `new-rpc-needed`
  - Impact axis classification + tier escalation decision
- **Gate:** If any `MISSING` backend work → HALT, tell user "backend must ship first", suggest running backend workflow for missing pieces.
- **Gate:** User approves `MAPPING.md` before Phase 3.

#### Phase 3 — Implementation Plan

- **Executor:** Main agent.
- **Input:** `ONBOARD.md` + `MAPPING.md`.
- **Produces:** `PLAN.md` with:
  - Ordered file list (leaf components → containers → pages; respects dependency order)
  - Wave structure for parallel execution (files with no mutual deps go in the same wave)
  - Per-file: path, purpose, props/types, deps, test file path, est. LOC (< 150 per file — trigger split if higher)
  - Integration checklist (env vars needed, TanStack Query keys, route groups)
- **Gate:** User approves `PLAN.md` before Phase 4.

#### Phase 4 — File-by-File Build

- **Executor:** `superpowers:test-driven-development` per file.
- **Orchestration:**
  - **Small / Medium FE:** sequential, one file at a time, one atomic commit per file.
  - **Large FE:** `gsd:execute` waves — files inside one wave run in parallel subagents, next wave waits.
- **Each file cycle:**
  1. Write failing test (Vitest + Testing Library for components, Playwright for E2E if interactive)
  2. Run test → confirm RED
  3. Implement minimal code
  4. Run test → confirm GREEN
  5. Refactor (extract reusable bits into `packages/ui` only if already conventional in repo)
  6. Commit atomically: `feat(web): <slug>/<file> — <one-liner>`
  7. Append line to `BUILD-LOG.md`: `✓ <file> — commit <sha> — <test count> tests`
- **Gate:** After each wave (Large) or each file (Small/Medium), main agent reviews commit + test output before proceeding.

#### Phase 5 — Quality Gates

- **Executor:** Main agent orchestrates, delegates to GStack skills.
- **Produces:** `REVIEW.md` summarizing each gate result + any auto-fixes applied.
- **Gate sequence** (fail any → back to Phase 4, max 2 retries, then STOP and ask user):

| # | Gate | Command | Runs when |
|---|---|---|---|
| 1 | Type check | `npm run type-check` (all workspaces) | Always |
| 2 | Lint | `npm run lint --filter=web` | Always |
| 3 | Unit tests | `npm run test --filter=web` | Always (tests written in Phase 4) |
| 4 | Proto typecheck | `npm run build --filter=@repo/proto && npm run type-check` | Only if `packages/proto` touched OR `@repo/proto` consumer touched |
| 5 | gRPC + HTTP smoke | `npm run e2e:smoke` | Only if any gateway controller / service touched |
| 6 | Staff-eng code review | `/review` (GStack) | Medium + Large |
| 7 | Visual / UX review | `/design-review` (GStack) | When new visual UI introduced (new page, new component with visual output) |
| 8 | Browser QA | `/qa` (GStack) | Only for interactive features in Large tier |
| 9 | Security audit | `/cso` (GStack) | Only when Large + touches auth / PII / admin |

Gates 4, 5, 7, 8, 9 are **conditional**. Skip logic is evaluated from `MAPPING.md` tier + impact classification — no re-asking user.

### § 4. Artifact layout

```
docs/design/<feature-slug>/            # ← authored by /prepare-design (upstream)
├── PRD.md              # Product requirements — user stories + acceptance criteria
├── DESIGN.md           # Technical design — architecture, component structure, data flow
├── mockups/            # Visual references — Figma export / Excalidraw / screenshot
│   ├── desktop.png
│   ├── mobile.png
│   └── states.png      # loading / empty / error states
└── user-flows.md       # (optional) navigation + interaction flows

.planning/frontend/<feature-slug>/     # ← authored by /claude-design (downstream)
├── STATE.md            # Phase tracker (which phases complete), written on init + updated after each phase
├── DESIGN-INPUT.md     # Phase 0 output (digest of docs/design/<slug>/)
├── ONBOARD.md          # Phase 1 output
├── MAPPING.md          # Phase 2 output
├── PLAN.md             # Phase 3 output
├── BUILD-LOG.md        # Phase 4 running log (appended during build)
└── REVIEW.md           # Phase 5 output
```

`STATE.md` is the resume anchor — if the user re-invokes `/claude-design <slug>`, the command reads `STATE.md` to skip completed phases and resume at the first incomplete one.

**Separation principle:** `docs/design/` is human-authored / brainstorm-assisted and committed long-term. `.planning/frontend/` is machine-generated per run, can be archived after feature ships. Design sources can live in the repo forever; build plans live with their milestone.

Each file has YAML frontmatter:

```yaml
---
phase: 1                       # 1|2|3|4|5
feature_slug: audit-history    # matches directory name
date: 2026-04-18
status: draft|approved|done
tier: medium                   # small|medium|large
impact: web-only               # web-only|web+gateway-read|cross-stack|proto-breaking
---
```

Commit convention:

- Phase 1–3 artifacts: `docs(web): <slug>/<phase> — <short summary>`
- Phase 4 files: `feat(web): <slug>/<file> — <one-liner>` (one commit per file)
- Phase 5 review + fixes: `fix(web): <slug> — address review gate <n>`

This matches the existing `feat(gateway): F2 ...` convention in `git log`.

### § 5. Slash command contract

Two commands ship as part of this workflow. They compose: `/prepare-design` writes design source, `/claude-design` reads it and builds code.

#### 5.1 `.claude/commands/prepare-design.md`

- **Purpose:** Generate `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}` from an idea.
- **Invocation:** `/prepare-design <feature-description>` or `/prepare-design <slug> [--prd-only|--design-only|--mockups-only]`.
- **Behavior:**
  1. Accepts free-text feature description OR slug + flag.
  2. Derives `<slug>` if not provided (kebab-case, max 6 words).
  3. Creates `docs/design/<slug>/` if missing.
  4. Orchestrates existing skills:
     - **PRD** → invoke `/office-hours` skill for 6 forcing questions → write answers as `PRD.md`
     - **DESIGN** → invoke `/design-consultation` skill → write `DESIGN.md`
     - **mockups** → invoke `/design-shotgun` skill for 3 variants → user picks → save to `mockups/`
  5. Respects `--*-only` flags to run just one segment (useful for filling gaps when `/claude-design` reports missing pieces).
  6. After each segment, HALTs for user review of the written artifact before moving on.
  7. Commits each artifact atomically: `docs(design): <slug>/<artifact> — <summary>`.
- **Interactive Q&A:** YES — this is where design decisions happen. User answers questions from the orchestrated skills.
- **Relationship to `/claude-design`:** Strictly upstream. `/claude-design` NEVER calls `/prepare-design` automatically; it only points at it in Phase 0 error messages.

#### 5.2 `.claude/commands/claude-design.md`

- **Purpose:** Build FE code from a finalized design source.
- **Invocation:** `/claude-design <slug>` (slug must match a `docs/design/<slug>/` directory if tier ≥ Medium).
- **Behavior:**
  1. Accepts slug as `$ARGUMENTS`. If user passes free-text description instead, derive slug and match against `docs/design/*/`.
  2. Creates `.planning/frontend/<slug>/` and an initial `STATE.md` tracking which phases are complete.
  3. Runs Phase 0 (design validation) — if missing artifacts for inferred tier, HALT with exact `/prepare-design` command to run.
  4. Runs Phase 1 via `Agent:Explore` subagent with a prompt that lists the exact directories from § 3.
  5. After each phase, HALTs and says: "Phase `<n>` complete. Artifact: `<path>`. Reply `next` to continue, or comment to iterate."
  6. On restart (user re-invokes `/claude-design <slug>`), reads `STATE.md` to resume at the last incomplete phase.
  7. On Size Escalation mid-phase, writes an escalation note to `STATE.md` and asks user to confirm new tier before re-running the affected phase. If escalation raises tier above what `docs/design/<slug>/` satisfies, emit remediation `/prepare-design` command.
- **Interactive Q&A:** NO feature Q&A — design source is authoritative. Only tier confirmation (Phase 0) and "continue to next phase" checkpoints (Phases 1-5).

### § 6. WORKFLOW.md integration

Adds one row to the size-detection table and one branch to the Mermaid decision tree:

```
# New row in Size Detection table:
Frontend (apps/web/**)  — use `/claude-design`, see WORKFLOW-FRONTEND.md

# New Mermaid branch:
B -->|Frontend| FE[/claude-design]
FE --> FE1[Phase 1 Onboard] --> FE2[Phase 2 Map] --> FE3[Phase 3 Plan]
FE3 --> FE4[Phase 4 Build SP:TDD waves] --> FE5[Phase 5 Gates]
FE5 -->|pass| E4[Done]
FE5 -->|fail, retry ≤2| FE4
```

Existing SMALL / MEDIUM / LARGE lanes remain the default for all backend work (i.e., any `apps/{crawler,seo-analyzer,keyword-analyzer,report,gateway}` or `packages/proto` or `packages/shared` change that does NOT touch `apps/web/**`).

### § 7. Interaction with existing skills

**Upstream (`/prepare-design` orchestrates):**

- **`/office-hours` (GStack)** — called by `/prepare-design` for PRD generation. 6 forcing questions, produces `docs/design/<slug>/PRD.md`.
- **`/design-consultation` (GStack)** — called by `/prepare-design` for technical design. Produces `docs/design/<slug>/DESIGN.md`.
- **`/design-shotgun` (GStack)** — called by `/prepare-design --mockups-only`. Generates 3 variants, user picks, saves to `docs/design/<slug>/mockups/`.

**Downstream (`/claude-design` uses):**

- **`superpowers:test-driven-development`** — invoked inside Phase 4 for each file. No changes to the skill itself.
- **`superpowers:writing-plans`** — NOT invoked by `/claude-design`. Phase 3 produces a lighter FE-specific plan format. (Rationale: `writing-plans` targets multi-module plans; FE file-by-file plan is simpler and repo-specific.)
- **`gsd:execute`** — invoked in Phase 4 only for Large tier to parallelize waves. Medium/Small stay sequential.
- **`gsd:discuss` / `gsd:plan`** — NOT invoked (neither automatically nor recommended). Rationale: when design precondition is satisfied (`docs/design/<slug>/` populated), interactive architecture Q&A is redundant. The design is the source of truth; asking the user again is wasted effort. User can still run them manually for edge cases but the workflow does not nudge toward them.
- **`/review`, `/design-review`, `/qa`, `/cso`** — invoked by Phase 5 per the conditional table in § 3.
- **`simplify`** — available for user to run post-Phase-5 on the FE diff. Not automated by the command.

**Explicitly excluded (to avoid Q&A duplication):**

- `superpowers:brainstorming` — overlaps with `/office-hours` + `/design-consultation` already orchestrated by `/prepare-design`. Picking brainstorming would mean 2 Q&A loops for the same design.
- `gsd:explore` — same overlap reason.

### § 8. Escalation and failure handling

- **Missing backend:** Phase 2 HALT. Emit a remediation plan pointing at backend workflow (`WORKFLOW-MEDIUM.md` or `WORKFLOW-LARGE.md` depending on scope of backend delta).
- **Proto break detected:** Phase 2 sets impact=`proto-breaking`, tier=`Large`, forces gates 4+5+6 in Phase 5. If user chose lower tier, workflow auto-upgrades and informs them.
- **Gate failure in Phase 5:** Return to Phase 4, fix only the failing files, re-run ONLY the failed gates (not full suite). Max 2 retries. Third failure → STOP, write blocking note to `REVIEW.md`, ask user.
- **Mid-build scope growth:** STOP → re-classify → re-run Phase 2 from scratch with augmented feature description → proceed. Files already committed are kept; plan gets a "carried over" section.

### § 9. Open questions / deferred decisions

None blocking — resolved during brainstorm:

- ✅ FE location: `apps/web/` (decided by Claude per user delegation).
- ✅ Approach: C (slash command, not skill).
- ✅ Artifact location: `.planning/frontend/<slug>/` (build), `docs/design/<slug>/` (design).
- ✅ TDD binding: mandatory in Phase 4, via `superpowers:test-driven-development`.
- ✅ Design precondition: 2-step split — `/prepare-design` generates design source, `/claude-design` consumes it. Tier-scaled requirements (§ 2.5).
- ✅ `gsd:discuss` / `gsd:plan` auto-call: NO (redundant with design-first principle).
- ✅ Tier thresholds: kept as-is (§ 2) — Small ≤ 2 files, Medium 1 page / 3-5 components, Large multi-page / proto-break / auth.
- ✅ Phase 1 scan scope: kept as-is (§ 3 Phase 1) — `apps/web`, `packages/{ui,proto,shared}`, `apps/gateway/**/{controllers,gateways}`, monorepo config.
- ✅ Phase 5 gates: kept as-is (§ 3 Phase 5) — 9 gates with conditional skip logic.

Deferred to future work (out of scope for this spec):

- Promoting the slash commands to `.claude/skills/frontend-{onboard,prepare}/` once usage proves value.
- Auto-trigger via SessionStart hook when `apps/web/**` is the first edited path.
- Cypress / Playwright visual regression baseline — GStack `/qa` covers functional; visual diff is a separate initiative.
- Handling design-source drift (user edits `docs/design/<slug>/` mid-build) — currently requires manual re-run of Phase 2 Mapping; automation deferred.

## Success Criteria

1. `/prepare-design "<feature>"` produces `docs/design/<slug>/{PRD.md,DESIGN.md,mockups/}` via orchestrated skills, with atomic commits per artifact.
2. `/claude-design "<slug>"` with complete design source produces all 6 artifacts under `.planning/frontend/<slug>/` (STATE, DESIGN-INPUT, ONBOARD, MAPPING, PLAN, BUILD-LOG, REVIEW) with the frontmatter and sections described in § 3.
3. `/claude-design "<slug>"` with MISSING design source HALTs at Phase 0 and emits the correct `/prepare-design` command to remediate — does NOT silently ask feature Q&A.
4. Phase 1 onboarding produces a non-empty "Available gateway HTTP endpoints" and "Available proto RPCs" section — proving the onboard actually read cross-stack context.
5. `WORKFLOW.md` size detection table contains the FE row; Mermaid tree contains the FE branch with both `/prepare-design` (optional) and `/claude-design` (required) nodes.
6. `WORKFLOW-FRONTEND.md` exists in both `.claude/workflow/` and `docs/workflow/` and documents all phases, the tier × design-artifact matrix (§ 2.5), and the `/prepare-design` ↔ `/claude-design` handoff.
7. Running `/claude-design` on a trial Medium feature (with pre-authored `docs/design/<trial>/PRD.md`) gets to Phase 5 with green gates 1–3 and a committed trail of atomic commits, one per file — with zero feature-Q&A during Phases 1-5.
8. No `apps/web/` scaffolding is created by this workflow spec itself (that's M7 content).

## Implementation Order (previewing plan)

To be detailed in the implementation plan via `superpowers:writing-plans`. High-level order:

1. Write `.claude/workflow/WORKFLOW-FRONTEND.md` + mirror in `docs/workflow/`.
2. Update `.claude/workflow/WORKFLOW.md` + mirror in `docs/workflow/` (add FE lane + both commands to Mermaid).
3. Write `.claude/commands/prepare-design.md` (upstream command).
4. Write `.claude/commands/claude-design.md` (downstream command with Phase 0 validation).
5. Trial run on a tiny Medium feature with hand-authored `PRD.md` — verify Phase 0 accepts design, Phases 1-5 run without feature Q&A, commit trail atomic.
6. Trial run on the same feature but WITHOUT design — verify Phase 0 HALTs and emits correct `/prepare-design` command.
7. Tune prompts based on both trial outputs.
