---
feature_slug: dashboard-shell
created: 2026-04-19
tier: large
impact: layout-shell
phases:
  "0": done
  "1": done
  "2": done
  "3": in-progress
  "4": pending
  "5": pending
---

# State

**Phase 0 note**: PRD/DESIGN/mockups/REFERENCES + STATE.md + DESIGN-INPUT.md
were bundled into pre-session commit `f3fcf4a` (chore(claude): add
fe-be-integration skill …). Not an ideal commit scope (skill + design source
together), but artifacts exist and match the current session's intent.
Phase-0 commit skipped — nothing to re-commit.


Tier: Large — reasons:
- New `(app)` route group layout consumed by slug 4-7-8.
- New dashboard page with 6 widgets + empty state.
- Adds 2 query-layer hooks + 1 new dep (recharts, sanctioned in 30 §1).
- Auth-wired (reuses slug 2 `<AuthGuard>` + `useLogout`).

Impact: layout-shell — future slugs plug pages into this shell; shell changes are
breaking for all `(app)/*` routes.

Branch: feat/apps-web (continued from slug 1 + 2).
