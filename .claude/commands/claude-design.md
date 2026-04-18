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
