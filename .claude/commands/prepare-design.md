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