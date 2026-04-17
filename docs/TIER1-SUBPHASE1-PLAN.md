# Tier 1 — Sub-phase 1 Plan (F3 + F5)

> Phase 2 output (WORKFLOW-LARGE / CHIA-NHO). Atomic task plan for Sub-phase 1. Upstream: `docs/TIER1-ARCHITECTURE.md`. Date: 2026-04-17.

## Goal

Ship F3 (Flesch-Kincaid readability rule) and F5 (dual mobile/desktop Lighthouse) to production. Both are low-risk, minimal integration surface. F3 ships first (0 DB migration), F5 second (10 cols migration).

## Scope guard

- **Not** touching: proto files, BullMQ queues, gateway REST contracts, frontend (not scaffolded yet).
- **Touching**: `@repo/shared` enums/interfaces; seo-analyzer rules + seed; crawler Lighthouse service; gateway Prisma schema (F5 only).

## Dependency graph (within SP1)

```
Wave 1 (parallel):
  Task A — @repo/shared: add IssueCategory.CONTENT + FormFactor + LighthouseScoreSet interfaces
  Task B — docs commit (arch + plan docs)

Wave 2 (after A):
  Task C — seo-analyzer: F3 Readability rule (TDD)
  Task D — crawler: F5 dual-Lighthouse service refactor (TDD)

Wave 3 (after D):
  Task E — gateway: Prisma migration for 10 Lighthouse columns
  Task F — gateway: audits.service.ts reads/stores dual scores

Wave 4 (after C+F):
  Task G — e2e:smoke regression check
  Task H — /review + /cso

Wave 5 (after H passes):
  Task I — atomic commits + ship
```

## Atomic task list

### Task A — Shared enums + interfaces

**Target**: `packages/shared/src/index.ts`

**Changes**:
```typescript
// Add to IssueCategory:
CONTENT = 'content',

// Add new enum:
export enum FormFactor { MOBILE = 'mobile', DESKTOP = 'desktop' }

// Add interfaces:
export interface LighthouseScoreSet { score; lcpMs; fcpMs; clsScore; inpMs }
export interface DualLighthouse { mobile: LighthouseScoreSet; desktop: LighthouseScoreSet }
```

**Gate**: `turbo run build --filter=@repo/shared && turbo run check-types`

**Commit**: `chore(shared): add CONTENT category + FormFactor enum + DualLighthouse interfaces`

**Context budget**: ~5% window

---

### Task C — F3 Flesch-Kincaid readability rule

**Target**: 
- NEW `apps/seo-analyzer/src/analyzer/domain/rules/content/readability.rule.ts`
- NEW `apps/seo-analyzer/test/unit/rules/content.spec.ts`
- EDIT `apps/seo-analyzer/src/analyzer/domain/rules/index.ts` (register)
- EDIT `apps/seo-analyzer/prisma/seed.ts` (add seed row)
- EDIT `apps/seo-analyzer/package.json` (+ `syllable` dep)

**TDD cycle**:

1. **RED** — write `content.spec.ts` covering:
   - Plain English text FRE 60-70 → PASS
   - Very easy text FRE 90+ → PASS
   - Difficult text FRE 30-50 → WARN
   - Very difficult FRE < 30 → FAIL
   - `lang='vi'` → PASS (skipped, not applicable)
   - Text < 30 words → PASS (skipped, insufficient data)
   - Missing `lang` attribute → PASS (skipped)
   - Empty text → PASS (skipped)
   
2. Run `turbo run test --filter=@seo/seo-analyzer` → verify all readability tests FAIL (RED).

3. **GREEN** — implement rule. Formula:
   ```
   FRE = 206.835 − 1.015 × (words/sentences) − 84.6 × (syllables/words)
   FKG = 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
   ```
   - Thresholds: PASS ≥ 60; WARN 30-60; FAIL < 30
   - Skip when `lang != en` or words < 30
   - Score convention: 0 / 50 / 100
   - Metadata: `{ fre, grade, wordsPerSentence, syllablesPerWord, words, sentences, applicable }`

4. Run tests → verify GREEN. Fix until all pass.

5. Register rule in `domain/rules/index.ts` alphabetically.

6. Add seed row to `prisma/seed.ts`:
   ```typescript
   { name: 'readability', displayName: 'Readability (Flesch-Kincaid)', category: 'content', weight: 4, description: 'Flesch Reading Ease; target 60-70 for plain English' }
   ```

**Gate** (per `apps/seo-analyzer/package.json`):
- `npm run check-types`
- `npm run test` — all green
- `npm run build`
- `npm run lint`

**Commit**: `feat(seo-analyzer): add Flesch-Kincaid readability rule (F3)`

**Context budget**: ~15% window

---

### Task D — F5 dual-Lighthouse service

**Target**:
- EDIT `apps/crawler/src/crawler/services/lighthouse.service.ts` (parameterize formFactor)
- NEW `apps/crawler/src/crawler/services/dual-lighthouse.service.ts` (orchestrator)
- EDIT `apps/crawler/src/crawler/services/crawler.service.ts` (call dual instead of single)
- NEW test `apps/crawler/test/unit/dual-lighthouse.spec.ts` (shape + config assertions; Lighthouse itself stubbed)

**TDD**:
1. RED: write test that `DualLighthouseService.run(url)` returns `{ mobile: LighthouseScoreSet, desktop: LighthouseScoreSet }` — both fully populated.
2. RED: test `LIGHTHOUSE_PARALLEL=true` runs in parallel; `=false` runs sequential.
3. GREEN: implement.

**Behavior spec**:
- Default sequential (protect low-RAM environments).
- Env flag `LIGHTHOUSE_PARALLEL=true` → Promise.all both runs.
- On one-side failure, return other side's scores with partial flag.

**Commit**: `feat(crawler): dual mobile+desktop Lighthouse (F5)`

**Context budget**: ~20%

---

### Task E — Gateway Prisma migration

**Target**: `apps/gateway/prisma/schema.prisma` + new migration file

**Changes**:
```prisma
model Audit {
  // existing fields
  mobileScore        Int?
  mobileLcpMs        Int?
  mobileFcpMs        Int?
  mobileClsScore     Float?
  mobileInpMs        Int?
  desktopScore       Int?
  desktopLcpMs       Int?
  desktopFcpMs       Int?
  desktopClsScore    Float?
  desktopInpMs       Int?
}
```

**Gate**: 
- `npm run prisma:generate`
- Migration applies cleanly on fresh DB (docker-compose up)
- `check-types` green

**Commit**: `feat(gateway): add mobile+desktop Lighthouse columns (F5)`

---

### Task F — Gateway audits.service.ts stores dual scores

**Target**: `apps/gateway/src/audits/services/audits.service.ts`

Update the code path that persists crawler results to Audit row. Accept `{ mobile, desktop }` payload shape instead of flat scores. Migration-period compatibility: if only mobile present, leave desktop fields null.

**Test**: unit test for the persistence mapping.

**Commit**: `feat(gateway): persist dual Lighthouse scores from crawler (F5)`

---

### Task G — E2E smoke

Extend `test/e2e/smoke.e2e-spec.ts` (or run existing) to assert:
- Single audit completes end-to-end
- `audit.mobileScore` AND `audit.desktopScore` both populated post-completion

**Commit**: `test(e2e): assert dual Lighthouse scores in smoke test`

---

## Goal-backward verification

**Goal**: "user creates audit, gets back readability score + mobile + desktop scores, no regression on the 20 existing rules."

Evidence at each task:
- Task A → shared types compile → `check-types` green across monorepo
- Task C → readability rule runs in RuleRunner → existing analyzer tests still pass (0 regression) + 8 new readability tests green
- Task D → DualLighthouseService returns both scores shape → unit test green
- Task E → migration applies + Prisma client regenerates → `check-types` green
- Task F → persistence mapping unit test green
- Task G → smoke test shows `mobileScore` and `desktopScore` both non-null in final Audit row

All 7 gates (check-types, test, build, lint, e2e, /review, /cso) pass.

## Context Budget Map

| Task | Est. window % | Fresh context? |
|---|---|---|
| A | 5% | shared + share-building context |
| C | 15% | seo-analyzer focus |
| D | 20% | crawler + Lighthouse focus |
| E | 10% | gateway Prisma |
| F | 10% | gateway audits |
| G | 10% | test runner |

None exceed 50%. No task needs to be split.

## Rollout order

1. Task A commit
2. Task C commit (F3 shippable alone — no F5 dependency)
3. Task D commit
4. Task E commit
5. Task F commit
6. Task G commit

Can merge after Task C for early F3 value. F5 tasks (D-G) merge together in a second PR to avoid half-shipped migration.

## Risk register (SP1 specific)

| Risk | Mitigation |
|---|---|
| `syllable` npm package unavailable or breaks | Fallback: vendored simple vowel-group heuristic (~30 LOC) |
| Lighthouse preset API changed upstream | Pin version in package.json; integration test on real URL |
| Prisma migration on prod DB destructive | All columns NULLABLE (no NOT NULL); zero-downtime safe |
| Desktop Lighthouse run causes OOM | Default sequential mode; `LIGHTHOUSE_PARALLEL=false` |
| Flesch formula mis-reports on code-heavy pages | `textContent` already strips `<script>` and `<style>` via Cheerio |

## Exit criteria

Sub-phase 1 done when:
- [ ] All 7 tasks committed with clean messages (no Claude attribution)
- [ ] All 7 gates pass in CI
- [ ] `docs/` updated with any final deviation
- [ ] Rollback procedure documented (revert migration + revert shared package)
