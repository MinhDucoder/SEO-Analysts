# Vietnamese localization for /public/check suggested issues

**Date:** 2026-06-03
**Status:** Approved (design)
**Scope owner:** public-api (gateway)

## Problem

The `POST /api/v1/public/check` endpoint (consumed by the Chrome extension and the
web playground) returns SEO issues whose human-facing text is **hardcoded English**,
even though the request already defaults to `language: 'vi'`:

- `issue.description` = the analyzer rule's `message` (e.g. `"Title length 53 is out of range"`) — **always English**.
- `issue.suggestion` template fallback = the rule's `templateSuggestion` (e.g. `"Add a title between 50 and 60 characters..."`) — **always English**. This is the path taken whenever the LLM is disabled or degraded (Gemini free-tier quota, concurrency cap, init failure — see [[project_gateway_public_check_ai]]).
- The LLM suggestion path already honours `{{language}}` (so AI text/rationale come back in Vietnamese when the LLM runs), but the prompt does **not** instruct the model to keep SEO technical terms in English.

Goal: the user reads issue **explanations in Vietnamese**, while **technical terms stay in
English** (e.g. *title tag, meta description, canonical, alt text, H1, schema.org*).

## Scope

In scope (user-selected):
1. `issue.description` (rule message) → Vietnamese.
2. `issue.suggestion` for **both** the LLM and the template-fallback path → Vietnamese, technical terms in English.

Explicitly out of scope:
- UI labels on the card (`Fix`, `Why it matters`, `Evidence`, `Copy suggestion`, `Learn more`) — stay English.
- `issue.title` (humanized rule id, e.g. `"Title tag"`) — it *is* a technical term, stays English.
- The analyzer service, the full audit pipeline (BullMQ → report/PDF/web audit detail), score, severity, categories — untouched.

## Chosen approach — gateway localization layer (Hướng 1)

Localize in the **gateway public-check flow only**, leaving the analyzer language-neutral
(English source of truth). Rationale vs. alternatives:

- **Localize at analyzer rules (rejected):** correct architectural home but requires
  refactoring all 30 rules + the rule contract, touches the core engine every other
  service depends on, and risks changing the full audit's language. Out of proportion to
  the stated scope.
- **LLM-only (rejected):** depends on the LLM for *all* localized text; when Gemini hits
  its free-tier quota or degrades, nothing renders in Vietnamese. Unreliable + adds
  latency/cost.

The gateway layer is contained, reliable even with the LLM off, and automatically covers
both consumers (extension + web playground both call `/public/check`).

### Data available at the localization point

The analyzer gRPC response (`AnalyzeContent`) gives each issue:
`ruleId`, `status` (`"warn"` | `"fail"`; only non-`pass` issues become cards),
`evidence` (= the rule's `metadata`, e.g. `{ length: 53 }`), `message`, `templateSuggestion`.

Dynamic values therefore live in `evidence` → Vietnamese messages can be **reconstructed
from `ruleId + status + evidence`** without parsing the English string.

### Component: `issue-localization.ts`

New module `apps/gateway/src/public-api/i18n/issue-localization.ts`. Pure, no NestJS DI.

```ts
export type IssueStatus = 'warn' | 'fail';

/** Vietnamese issue description for a rule. null → caller falls back to English `message`. */
export function localizeIssueMessage(
  ruleId: string,
  status: IssueStatus,
  evidence: Record<string, unknown>,
): string | null;

/** Vietnamese template-fallback suggestion. null → caller falls back to English `templateSuggestion`. */
export function localizeTemplateSuggestion(
  ruleId: string,
  status: IssueStatus,
  evidence: Record<string, unknown>,
): string | null;
```

Design rules for the catalog:
- One entry per rule id, covering its `warn` + `fail` states (pass never reaches here).
- Vietnamese is **self-contained** (states the fact + the target), **not** a literal
  translation of each English branch — lowers drift if a rule tweaks thresholds and reads
  better as guidance.
- Numbers interpolated from `evidence`; if an expected evidence key is absent, fall back to
  a number-free phrasing (never print `undefined`).
- A canonical `EN_TERMS` constant documents the technical terms kept in English so
  translations stay consistent.

Examples (technical terms bold, kept English):

| Rule | status | EN today | VI |
|---|---|---|---|
| `title_tag` | fail | `Title length 53 is out of range` | `Thẻ **title** dài 53 ký tự — nên đặt 50–60 ký tự để hiển thị tốt trên **SERP**.` |
| `meta_description` | fail | `Meta description is missing` | `Trang thiếu **meta description** — thêm đoạn 120–160 ký tự chứa **target keyword**.` |
| `image_alt` | warn | `3 images missing alt text` | `Có 3 ảnh thiếu **alt text** — bổ sung mô tả ngắn cho mỗi ảnh (tốt cho **accessibility** + image SEO).` |

### Integration points (guarded by `language === 'vi'`)

1. **Description** — `PublicCheckService` issue map ([public-check.service.ts:194](../../../apps/gateway/src/public-api/services/public-check.service.ts)):
   `description: language === 'vi' ? (localizeIssueMessage(i.ruleId, i.status, i.evidence ?? {}) ?? i.message) : i.message`.

2. **Template fallback** — `SuggestionEnricherService` template builder ([suggestion-enricher.service.ts:96](../../../apps/gateway/src/public-api/services/suggestion-enricher.service.ts)):
   when `ctx.language === 'vi'`, the `templateSuggestions[]` text uses
   `localizeTemplateSuggestion(i.ruleId, i.status, i.evidence ?? {}) ?? i.templateSuggestion`.
   (`AnalyzerIssue` already carries `status` + `evidence`.)

3. **LLM prompt** — new prompt version `prompts/suggest-fix-seo/v1.1.0.prompt.yaml`:
   keep the existing contract, add an instruction —
   *"Write `text` and `rationale` in {{language}}. When {{language}} is `vi`, keep SEO
   technical terms in English (title tag, meta description, canonical, alt text, H1,
   heading, schema.org / structured data, Open Graph, Twitter Card, viewport, robots meta,
   favicon, HTTPS, internal/external links, readability, llms.txt, target keyword, SERP)."*
   Bump `promptVersion` in [seo-suggest-chain.factory.ts](../../../apps/gateway/src/public-api/services/seo-suggest-chain.factory.ts) (`createBaseChain` metadata) to `1.1.0`; the loader's `^1.0.0` constraint already resolves to the highest matching version.

### Cache invalidation

`PUBLIC_API_CACHE_SCHEMA_VERSION` (`packages/shared/src/public-api.ts`, currently `1.2.0`)
→ bump to `1.3.0`. This abandons the old cache namespace so previously-cached `vi`
responses (which hold English descriptions) are not served. Cache keys already include
`lang`, so `vi`/`en` are separate namespaces going forward.

The enricher's suggest cache is keyed by inputs (not prompt text); stale entries are
acceptable (already `vi`, only differ by the new "keep terms English" nuance) and expire by
TTL. No separate invalidation needed.

## Error handling / fallback

- Missing catalog entry for a `ruleId` → return `null` → caller keeps the English original.
  No throw, no `undefined` rendering. Adding a new analyzer rule degrades gracefully to
  English until a vi entry is added.
- Missing evidence key → number-free Vietnamese phrasing.
- `language !== 'vi'` (e.g. `'en'`) → bypass the catalog entirely; behaviour unchanged.

## Testing

Vitest, services constructed manually (esbuild emits no decorator metadata — see [[project_vitest_no_decorator_metadata]]):

1. **Coverage test:** every **content-mode-reachable** rule id (the rules `/public/check`
   can actually surface — see appendix note) has a vi entry for its reachable non-pass
   states. Fails CI when such a rule is added without a vi entry → catches drift.
2. **Interpolation tests:** `title_tag`/`image_alt`/`meta_description` produce expected vi
   strings from sample `evidence`; technical terms present in English.
3. **Fallback tests:** unknown `ruleId` → `null`; missing evidence key → no `undefined`.
4. **Integration touch:** `public-check.service` spec asserts that with `language: 'vi'` a
   known failing rule yields a Vietnamese `description`, and with `language: 'en'` it stays
   English.

## Files

Added:
- `apps/gateway/src/public-api/i18n/issue-localization.ts` (catalog, 30 rules)
- `apps/gateway/src/public-api/prompts/suggest-fix-seo/v1.1.0.prompt.yaml`
- `apps/gateway/test/unit/issue-localization.spec.ts`

Modified:
- `apps/gateway/src/public-api/services/public-check.service.ts` (description)
- `apps/gateway/src/public-api/services/suggestion-enricher.service.ts` (template fallback)
- `apps/gateway/src/public-api/services/seo-suggest-chain.factory.ts` (prompt version bump)
- `packages/shared/src/public-api.ts` (`PUBLIC_API_CACHE_SCHEMA_VERSION` → `1.3.0`)

Untouched: analyzer service, full audit pipeline, web/extension components, UI labels, rule names.

## Appendix — rule ids to cover (verify exact `id` strings while building the catalog)

The catalog must be keyed by each rule's real `.id`. The plan step must read each rule file
to confirm the id + its reachable warn/fail messages + the evidence keys it emits.

SEO/core (22): `title_tag`, `meta_description`, `open_graph`, `twitter_card`, `h1_tag`,
`heading_hierarchy`, `image_alt`, `image_optimization`, `internal_links`, `external_links`,
`broken_links`, `page_size`, `canonical_url`, `favicon`, `https_check`, `http_status`,
`language_tag`, `robots_meta`, `schema_org`, `url_structure`, `viewport_meta`, `readability`.

GEO (8): `ai_bot_access`, `article_schema`, `citation_outbound`, `direct_answer_intro`,
`entity_markup`, `llms_txt_present`, `quotable_density`, `semantic_completeness`.

Note: only rules that can run in `content_only` mode reach `/public/check`; the catalog may
legitimately have no warn/fail entry for rules the gateway never surfaces — the coverage
test should assert against the **content-mode-reachable** set, not the raw 30.
