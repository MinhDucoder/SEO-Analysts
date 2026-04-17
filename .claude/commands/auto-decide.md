# /auto-decide $ARGUMENTS

Autonomous-decision mode. Claude researches open questions and commits to a
choice without stopping to ask, escalating ONLY when a rule below requires it.
Writes a DECISIONS log at session end.

---

## STEP 0 — PARSE ARGUMENTS

```
/auto-decide <task>     # turn ON, task = <task>
/auto-decide off        # turn OFF, flush log
/auto-decide status     # show mode + counters
/auto-decide            # default ON, task = current conversation task
```

---

## STEP 1 — ROUTE

### If `$ARGUMENTS == "off"`
1. If mode was not ON this session → reply `"Auto-decide is not active."` and stop.
2. Write the running log to `docs/auto-decide/DECISIONS-YYYY-MM-DD-HHMM.md` using
   the format in STEP 3.
3. Announce: `"Using auto-decide: session OFF. Log: docs/auto-decide/<filename>"`.

### If `$ARGUMENTS == "status"`
Reply with `mode: ON/OFF`, `auto: N`, `escalated: M`. Do not change mode.

### Otherwise (turn ON)
1. Announce: `"Using auto-decide for: <task>"`.
2. Maintain a running in-memory decision log (title, options, choice, confidence, reason).
3. Proceed under the rules in STEP 2.
4. On session end or `off` → flush log to disk.

---

## STEP 2 — DECISION RULES

### ✅ Auto-decide (no asking)
- Formatting / naming within an agreed convention.
- File location within an agreed structure (move maps, folder conventions).
- Import path style (relative vs alias) when project already mixes both.
- Test file placement within an agreed test folder.
- Minor library picks where an obvious default exists (`dayjs` over `moment`).
- Commit message wording, order of independent steps.
- Tie-breakers when both options are already inside the approved plan.

### 🚨 MUST escalate (stop, ask user)
- **Scope change** — new feature, new dep install (`npm install X`), public API shape change.
- **Destructive** — delete outside agreed move list, `git push --force`, `reset --hard`, `DROP TABLE`.
- **Security** — secret handling, auth flow, CORS/CSP, permissions.
- **Cost** — any paid service enable, model upgrade, infra scaling.
- **Low confidence** — < 70% sure the choice is correct.
- **Memory / CLAUDE.md conflict** — current reasoning contradicts a saved rule.
- **Budget blown** — spent > 10 tool calls researching 1 decision.
- **Gate fail 2×** — same safety gate (typecheck/build/test) fails twice → stop.

### Process per decision
1. State the question in one line.
2. List up to 3 options.
3. Pick with a one-line reason + confidence (high/med/low).
4. Log it.
5. Continue execution.

---

## STEP 3 — LOG FORMAT

```md
# Auto-decide Session — YYYY-MM-DD HH:MM
Task: <task>
Totals: auto=N, escalated=M

## Decisions
1. **<question>** → **<choice>** (confidence: high/med). Reason: <1 line>.
2. ...

## Escalations
1. **<question>** — trigger: <rule>. User chose: <answer>.
```

---

## STEP 4 — EXAMPLES

```
/auto-decide refactor services to DDD
→ announces, starts work, auto-picks small choices

/auto-decide off
→ writes log, OFF

/auto-decide status
→ "mode: ON, auto=4, escalated=1"
```

---

## NOTES

- Self-contained: does NOT depend on an external skill file.
- Each session is fresh — no cross-session state.
- If uncertain whether a decision fits "auto" or "escalate" → escalate.
