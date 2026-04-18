# /claude-design $ARGUMENTS

Build a frontend feature in `apps/web/` from a finalized design source.
6-phase pipeline: Design Validation → Onboard → Map → Plan → Build → Review.
Downstream of `/prepare-design`. Full phase reference: [WORKFLOW-FRONTEND.md](../workflow/WORKFLOW-FRONTEND.md).

**Your role:** senior FE engineer who reads first, codes second, never invents.

---

## STEP 0 — PARSE ARGUMENTS

```
/claude-design <feature-description>    # derive slug from description
/claude-design <slug>                    # use existing .planning/frontend/<slug>/
/claude-design <slug> --resume           # explicit resume at last incomplete phase
/claude-design <slug> --status           # show STATE.md, do not execute
/claude-design <slug> --tier=small       # override inferred tier (small|medium|large)
```

Derive `<slug>`: kebab-case, ≤ 6 words. If `.planning/frontend/<slug>/STATE.md` exists, prefer `--resume` (skip completed phases).

---

## STEP 1 — SETUP

1. Compute `<slug>`, `mkdir -p .planning/frontend/<slug>`.
2. If `STATE.md` exists and not `--status` → load to determine resume point. Else write initial:

```yaml
---
feature_slug: <slug>
created: <today>
tier: unknown     # resolved in Phase 0
impact: unknown   # resolved in Phase 2
phases: { "0": pending, "1": pending, "2": pending, "3": pending, "4": pending, "5": pending }
---
```

3. Announce: `"Using /claude-design for: <slug> (Phase N / new run)"`.

---

## STEP 2 — PHASE 0: DESIGN SOURCE VALIDATION

**No feature Q&A.** Only tier confirmation if ambiguous.

1. Classify tier (override beats inference):
   - "tweak / color / copy / typo" → Small
   - "page / modal / form / dashboard card group" → Medium
   - "multi-page / feature / realtime / auth / admin" → Large
   - ambiguous → Medium (confirm with user)

2. Check artifacts vs tier (see § 2.5 of WORKFLOW-FRONTEND.md):

| Tier | Required in `docs/design/<slug>/` |
|---|---|
| Small | (none) |
| Medium | `PRD.md` OR `DESIGN.md` |
| Large | `PRD.md` AND `DESIGN.md` AND `mockups/` |

3. **Missing artifacts → HALT with this message format** and set STATE.md `phases.0 = halted: missing-design-source`:

```
❌ Missing design source for <Tier> FE:
   - <path of each missing file>

Fill the gap by running:
   /prepare-design <slug> --<segment>-only
   (one line per missing segment)

Or author the files by hand, then re-run /claude-design <slug>.
```

4. Artifacts present → produce `DESIGN-INPUT.md` (frontmatter: `phase: 0`, `tier`, `status: approved`). Sections: Sources consumed, Requirements (from PRD), Technical direction (from DESIGN), Visual references, Tier classification. Template in WORKFLOW-FRONTEND.md § Phase 0.

5. Ask: `"Phase 0 complete. Tier: <tier>. Reply 'next' or 'tier=<other>'."`

6. On `next`: set `phases.0 = done`, commit `docs(web): <slug>/phase-0 — design source validated`.

---

## STEP 3 — PHASE 1: ONBOARD (Agent:Explore subagent)

**Goal:** scan codebase + BE contracts without polluting main context.

1. Dispatch `Agent:Explore` subagent with this prompt (substitute `<slug>`):

```
Analyze the DO_AN monorepo frontend + API surface. Do NOT read non-gateway backend apps. Produce a markdown report with exactly these 10 numbered sections:

1. FE folder structure + routing convention (scan apps/web/, identify App Router vs Pages Router).
2. Component design pattern (server vs client, primitives in packages/ui/src/**).
3. Styling approach (tailwind.config, design tokens, globals.css).
4. API client pattern (fetch/axios wrappers, TanStack Query setup, error handling).
5. State management (Zustand / context / URL state).
6. Realtime pattern (Socket.IO client, event subscription shape).
7. Available gateway HTTP endpoints (grep apps/gateway/src/**/controllers/**/*.controller.ts for @Get/@Post/@Patch/@Delete/@Put → list path + method + DTO types).
8. Available gateway WS events (grep apps/gateway/src/**/gateways/**/*.gateway.ts → event names + payload types from @repo/shared).
9. Available proto RPCs (read packages/proto/src/**/*.proto → service + method + request/response).
10. Naming conventions (file naming, case, test file suffix).

SKIP: node_modules/, dist/, .next/, apps/gateway/src/infra/prisma/generated/, apps/{crawler,seo-analyzer,keyword-analyzer,report}/.
READ: apps/web/**, packages/ui/src/**, packages/proto/src/**, packages/shared/src/**, apps/gateway/src/**/{controllers,gateways}/**, turbo.json, tsconfig.base.json.

Return a pure onboard report — no code generation, no recommendations.
```

2. Write subagent output to `.planning/frontend/<slug>/ONBOARD.md` with frontmatter (`phase: 1`, `tier`, `status: draft`).

3. Show condensed summary (first 2 lines of each section). Ask: `"Phase 1 complete. Reply 'next' or comment to re-scan."`

4. On `next`: set `phases.1 = done`, commit `docs(web): <slug>/phase-1 — codebase onboard report`.

---

## STEP 4 — PHASE 2: FEATURE MAPPING

**Goal:** map DESIGN-INPUT onto real file paths; surface MISSING backend.

1. Read `DESIGN-INPUT.md` + `ONBOARD.md`. For each user story:
   - Pages to create / modify (cite `apps/web/app/**` path).
   - Components to create / reuse (cite `packages/ui/src/...` or `apps/web/components/...`).
   - API endpoints — mark `EXISTS` with `apps/gateway/...file:line` ref, OR `MISSING` with required shape.
   - WS events — same EXISTS / MISSING treatment.
   - Proto impact — `none` / `existing-consumer` / `new-rpc-needed`.

2. Write `MAPPING.md` (frontmatter: `phase: 2`, `tier`, `impact`). Sections: Pages, Components, API endpoints, WS events, Proto impact, Tier escalation decision. Template in WORKFLOW-FRONTEND.md § Phase 2.

3. **HALT conditions:**
   - Any `MISSING` API/WS → print: `"Backend work required first: <list>. Run backend workflow (WORKFLOW-MEDIUM.md or WORKFLOW-LARGE.md), then /claude-design <slug> --resume."` Set `phases.2 = halted: missing-backend`, exit.
   - `new-rpc-needed` → escalate tier to Large + `proto-breaking`. If design source doesn't satisfy new tier (§ Phase 0 table), HALT with `/prepare-design` remediation. Else continue.

4. Else ask `"Phase 2 complete. Reply 'next' or comment to revise."`

5. On `next`: set `phases.2 = done`, record `impact`, commit `docs(web): <slug>/phase-2 — feature-to-code mapping`.

---

## STEP 5 — PHASE 3: IMPLEMENTATION PLAN

**Goal:** ordered file list with dependency waves.

1. Order files: leaves → containers → pages. Group files with no mutual deps into same wave.

2. For each file: path, purpose, props/types, deps, test file, est. LOC. If > 150 LOC → split and note.

3. Write `PLAN.md` (frontmatter: `phase: 3`, `tier`, `impact`). Sections per wave + Integration checklist (env vars, TanStack Query keys, routes, i18n). Template in WORKFLOW-FRONTEND.md § Phase 3.

4. Ask `"Phase 3 complete. Reply 'next' or comment to revise."`

5. On `next`: set `phases.3 = done`, commit `docs(web): <slug>/phase-3 — implementation plan`.

---

## STEP 6 — PHASE 4: FILE-BY-FILE BUILD

**Goal:** implement each file via TDD with atomic commits.

1. Init `BUILD-LOG.md` (frontmatter: `phase: 4`, `tier`, `impact`, `status: in-progress`). Table header: `| Wave | File | Tests | Commit | Status |`.

2. Per wave in PLAN.md:
   - **Small/Medium:** sequential, one file at a time.
   - **Large:** dispatch same-wave files to parallel subagents running `superpowers:test-driven-development`.

3. Each file cycle (owned by TDD skill): failing test → RED → minimal impl → GREEN → refactor → commit `feat(web): <slug>/<file-basename> — <one-liner>` → append BUILD-LOG row.

4. After each wave (Large) or each file (Small/Medium): summarize, ask `"Wave N complete. Reply 'next' to continue."`

5. All waves done → set `phases.4 = done`, commit `docs(web): <slug>/phase-4 — build log finalized`.

---

## STEP 7 — PHASE 5: QUALITY GATES

**Goal:** run gates conditional on tier + impact, max 2 retries per gate.

**Gate table** (full specification with "runs when" conditions in [WORKFLOW-FRONTEND.md § Phase 5](../workflow/WORKFLOW-FRONTEND.md#phase-5--quality-gates)):

1. `npm run type-check` — Always
2. `npm run lint --filter=web` — Always
3. `npm run test --filter=web` — Always
4. Proto typecheck — if `packages/proto` touched
5. `npm run e2e:smoke` — if gateway touched
6. `/review` (GStack) — Medium + Large
7. `/design-review` (GStack) — new visual UI
8. `/qa` (GStack) — Large interactive
9. `/cso` (GStack) — Large + auth/PII/admin

Init `REVIEW.md` with frontmatter (`phase: 5`, `tier`, `impact`, `status: in-progress`). Table: `| Gate | Command | Result | Retries | Notes |`.

For each applicable gate:
- PASS → append `✓` row, continue.
- FAIL → back to Phase 4 on failing files; re-run ONLY this gate. Max 2 retries.
- 3rd failure → append `✗ BLOCKED` row, exit with blocker notice.

All pass → set `phases.5 = done`, commit `docs(web): <slug>/phase-5 — all gates green`, announce `/claude-design <slug> complete. Ready for /ship.`

---

## FAILURE HANDLING

- **Design-source drift** (user edits `docs/design/<slug>/`): re-run Phase 0 + Phase 2 with `--resume`; committed files kept; MAPPING.md gets "carried over" section.
- **Mid-build scope growth:** STOP → re-classify tier → re-run Phase 2 with augmented description → proceed. Committed files kept.
- **User interrupts:** STATE.md is source of truth; `/claude-design <slug>` resumes at first incomplete phase.

---

## NOTES FOR THE ASSISTANT

- **Phase 0 never asks about the feature.** Missing design → emit `/prepare-design` remediation, exit. Do NOT ask feature questions.
- **Phase 1 MUST use Agent:Explore subagent** — not inline file reads. Main context stays lean.
- **Phase 4 MUST use superpowers:test-driven-development per file** — no impl before failing test.
- **Phase 5 skip logic is conditional on tier + impact** — not user preference. If gate applies, it runs.
- **One commit per artifact.** Never combine phase commits.
