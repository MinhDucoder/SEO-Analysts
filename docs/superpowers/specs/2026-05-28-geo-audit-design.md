# GEO Audit — Design Spec

**Date:** 2026-05-28
**Author:** brainstorming session
**Status:** Draft — pending user review
**Branch:** `feat/geo-audit` (off `improve/main`, separate worktree recommended)

---

## 1. Goal & Scope

Add **Generative Engine Optimization (GEO) audit** as a Pro/Business-tier feature. Audits whether a web page is structured to be cited by AI search engines (Google AI Overview, ChatGPT, Perplexity, Claude). Produces a 0–100 GEO score alongside the existing SEO score, plus an `llms.txt` auto-generator tool.

### 1.1 In scope (Phase 1 — MVP)

1. **8 GEO rules** added to the existing `seo-analyzer` rule engine, category `geo/*`.
2. **Single-page mode only** — site-mode coverage deferred to Phase 2.
3. **`llms.txt` generator tool** at `/tools/llms-txt-generator` (Pro+Business).
4. **Audit detail FE tab** "AI Visibility" with paywall blur for Free users.
5. **New feature flag** `FeatureFlag.GEO_AUDIT` + new quota dimension `geo_audits_monthly` (Free 0 / Pro 50 / Business 300).
6. **Crawler enrichment**: fetch `/robots.txt` (parsed per AI-bot user-agent) and `/llms.txt` (markdown validation).
7. **gRPC proto extension** to carry `aiBotAccess` + `llmsTxt` payloads.
8. **One DB migration** on `report` DB: add `geoScore Int?` + `geoVersion String?`.

### 1.2 Out of scope (Phase 1)

- Site-mode GEO (audit nhiều page) → Phase 2.
- GEO trend chart over time → Phase 2 (extends existing dashboard chart).
- Per-rule entitlement (free tier taste of G1+G2) → considered, rejected for complexity.
- Premium LLM provider (Claude/GPT-4 for Business) → considered, rejected for YAGNI; Gemini Flash sufficient.
- New microservice `geo-analyzer` → considered, rejected for overhead vs deadline.

### 1.3 Out of scope (deferred indefinitely)

- Comparing GEO score across competitors (separate competitor-gap feature, see [FEATURE_PLAN.md](../../../FEATURE_PLAN.md) F33).
- Auto-rewriting page content to improve GEO (separate AI Content Rewriter feature, F34).

---

## 2. Background & Sources

### 2.1 Why GEO matters in 2026

By Q2 2026, AI search engines (Google AI Overview, ChatGPT search, Perplexity, Claude.ai) collectively serve a meaningful share of informational queries. A page that ranks #1 on Google may still be invisible inside an AI-generated answer. GEO is the discipline of structuring content for AI citation.

### 2.2 Primary academic source

Aggarwal, P., Murahari, V., Rajpurohit, T., Kalyan, A., Narasimhan, K., Deshpande, A. (2024). **GEO: Generative Engine Optimization**. In *Proceedings of the 30th ACM SIGKDD Conference on Knowledge Discovery and Data Mining (KDD '24)*, 5–16. DOI [10.1145/3637528.3671900](https://doi.org/10.1145/3637528.3671900). arXiv [2311.09735](https://arxiv.org/abs/2311.09735).

Key contributions used by this design:
- Defines **impression score** = f(word count, citation position, GPT-3.5 quality assessment).
- Evaluates **9 GEO methods**; the highest-impact methods (cite sources, quotation addition, statistics addition, authoritative tone) inform our rules G3, G7, G8.
- Reports +25 to +40% impression gain from these methods.

### 2.3 llms.txt standard

Howard, J. (2024-09-03). [llms.txt specification](https://llmstxt.org/). Markdown-based file at `/llms.txt` providing LLM-friendly site map.

Required: H1 heading. Optional: blockquote summary, H2 file lists `[name](url): notes`.

Adoption as of mid-2025: ~951 domains globally — early-mover advantage for any platform that audits + generates.

### 2.4 Google structured data updates

- [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) — required fields for rich result.
- ⚠️ **FAQPage and HowTo deprecated 2026-05-07**. Rules MUST NOT recommend FAQ schema.
- AI Mode source selection uses structured data quality as a signal alongside PageRank.

### 2.5 AI bot user-agent references

- [OpenAI GPTBot](https://platform.openai.com/docs/gptbot)
- [Anthropic ClaudeBot](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Google-Extended (Bard / Gemini training)](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- Perplexity-User documented via robots.txt convention.

---

## 3. Architecture

### 3.1 Decision: extend `seo-analyzer`

Add 8 rules to the existing rule engine instead of creating a new microservice. Rationale:

- Same `SeoRule` interface and `RuleRegistry` pattern → no new abstractions.
- No new proto file, no new BullMQ queue, no new Dockerfile.
- Total +8 rules brings the registry to 30 — still manageable.
- Defends well in thesis review: "extended existing rule engine with new category".

### 3.2 Service map (services touched)

```
gateway          — entitlement gate + augmented audit response + llms.txt generator endpoint
crawler          — fetch /robots.txt + /llms.txt, parse, attach to PageData
seo-analyzer     — register 8 new rules, inject GeminiClient for 2 LLM rules, compute geoScore
report           — persist geoScore + geoVersion column
web              — GEO tab + paywall + generator modal
packages/shared  — FeatureFlag.GEO_AUDIT, QuotaDimension geo_audits_monthly
packages/proto   — extend PageData + AnalyzeResponse
```

### 3.3 End-to-end data flow (Pro user, happy path)

```
1. User → POST /audits { url, mode: 'single' }
2. gateway:
   - PlanGuard checks FeatureFlag.AUDIT (existing)
   - EntitlementService.canRunGeo(userId) → (true, remainingQuota)
   - If runGeo=true: QuotaCounterService.increment('geo_audits_monthly', userId)
   - Enqueue BullMQ[crawl.start] { auditId, url, mode, runGeo: true }
3. crawler:
   - Fetch main page (Cheerio + Playwright fallback)
   - Fetch /robots.txt (cache 1h)
   - Fetch /llms.txt (cache 1h)
   - Parse aiBotAccess (5 user-agents) + llmsTxt (markdown)
   - Run Lighthouse (existing)
   - Publish PageData with new fields
4. crawler → BullMQ[analyze.start] { ..., runGeo: true }
5. seo-analyzer:
   - Run 22 existing rules
   - If runGeo=true: run 8 GEO rules
     - G1, G2, G5, G6, G7, G8: rule-based (Cheerio + regex)
     - G3, G4: GeminiClient.complete() with templated prompt
   - Calculate geoScore = weighted_avg(8 rules)
   - Persist RuleResult rows (existing) + return geoScore in AnalyzeResponse
6. seo-analyzer → Redis.publish('analyze.done')
7. report:
   - Aggregate as usual
   - Persist geoScore + geoVersion='1.0' to Report
   - Redis.publish('report.done')
8. gateway → WebSocket audit:completed → web
9. web fetches GET /audits/:id → renders GEO tab
```

### 3.4 Failure handling

| Failure | Behavior |
|---|---|
| robots.txt 404 | G1 = `pass` (RFC 9309 default allow) |
| robots.txt 5xx | G1 = `error`, geoScore excludes G1 |
| llms.txt 404 | G2 = `fail` |
| llms.txt >1MB | G2 = `warning` |
| Gemini timeout >30s | G3 / G4 = `error`, geoScore averages the 6 remaining |
| All Gemini calls fail | geoScore = avg(6 rule-based rules), geoVersion='1.0-degraded' |
| User quota exhausted at audit creation | Audit runs without GEO, geoScore=null, response flag `geoSkippedReason='quota_exhausted'` |

---

## 4. Rule Specifications

8 rules, weight 12.5% each (equal). Admin-tunable via existing `seo_rules` table.

### 4.1 Rule-based rules (no LLM)

#### G1 `geo/ai-bot-access`
- **Input:** parsed `/robots.txt`.
- **Check:** 5 user-agents — `GPTBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`.
- **Status:**
  - `fail` — any bot has `Disallow: /`.
  - `warning` — any bot disallows a high-value path (heuristic: `/blog`, `/docs`, `/articles`, `/help`).
  - `pass` — all bots allowed.
- **Evidence:** `{ bot: string, disallow: string[], allow: string[] }[]`.
- **Reference:** §2.5.

#### G2 `geo/llms-txt-present`
- **Input:** parsed `/llms.txt`.
- **Check:**
  - HTTP 200.
  - Has H1 (required by spec).
  - Has blockquote summary (recommended).
- **Status:**
  - `fail` — 404 or missing H1.
  - `warning` — has H1 but no blockquote.
  - `pass` — has H1 + blockquote.
- **Evidence:** `{ url, status, hasH1, hasBlockquote, sectionCount, sizeBytes }`.
- **Reference:** §2.3.

#### G5 `geo/article-schema`
- **Input:** JSON-LD blocks from PageData.
- **Check:** any block with `@type` ∈ {`Article`, `BlogPosting`, `NewsArticle`} with all of: `headline`, `author`, `datePublished`, `image`.
- **Status:**
  - `fail` — no qualifying schema or missing ≥2 required fields.
  - `warning` — has schema, missing exactly 1 field.
  - `pass` — all 4 required fields present.
- **Evidence:** `{ schemaType, missingFields: string[], rawBlock: string }`.
- **Reference:** §2.4. NOTE: deliberately excludes FAQPage (deprecated 2026-05-07).

#### G6 `geo/entity-markup`
- **Input:** same JSON-LD blocks.
- **Check:**
  - `author.@type=Person` with `name` AND `url`.
  - `publisher.@type=Organization`.
  - `dateModified` within last 180 days (configurable).
- **Status:**
  - `fail` — missing author or publisher.
  - `warning` — present but `dateModified` > 180 days.
  - `pass` — all present and fresh.
- **Evidence:** `{ author, publisher, dateModified, ageDays }`.
- **Reference:** §2.2 — Aggarwal et al. authoritativeness heuristic.

#### G7 `geo/quotable-density`
- **Input:** HTML + word count.
- **Check:** count `<table>`, `<ul>` or `<ol>` (with ≥3 `<li>`), `<blockquote>`, `<dl>`. Density = count / (wordCount / 1000).
- **Status:**
  - `fail` — density < 1.0.
  - `warning` — density 1.0 to 2.9.
  - `pass` — density ≥ 3.0.
- **Evidence:** `{ tables, lists, blockquotes, dls, wordCount, density }`.
- **Reference:** §2.2 — Quotation Addition heuristic +30%.

#### G8 `geo/citation-outbound`
- **Input:** external `<a>` href list.
- **Check:** count links to authoritative domains. Whitelist:
  - TLDs: `.gov`, `.edu`, `.gov.vn`, `.edu.vn`.
  - Explicit hosts: `wikipedia.org`, `*.nih.gov`, `reuters.com`, `bbc.com`, `w3.org`, `who.int`, `nature.com`, `arxiv.org`, `developer.mozilla.org`.
- **Status:**
  - `fail` — 0 citations.
  - `warning` — 1–2 citations.
  - `pass` — ≥3 citations.
- **Evidence:** `{ totalExternal, authoritative: Array<{ href, host }> }`.
- **Reference:** §2.2 — Cite Sources +30–40%.

### 4.2 LLM-based rules

#### G3 `geo/direct-answer-intro`
- **Input:** first 100–200 words after H1 (paragraph extraction, strip nav/aside).
- **Prompt template** (Vietnamese version below):
  ```
  Bạn là chuyên gia SEO. Đoạn văn dưới đây có trả lời TRỰC TIẾP câu hỏi
  ngụ ý từ tiêu đề "{H1}" trong 1-2 câu đầu không? Trả lời JSON:
  { "direct": boolean, "reason": string (≤20 từ) }

  Tiêu đề: {H1}
  Đoạn văn: {intro_text}
  ```
- **Language detection:** reuse existing `language-tag.rule` output to pick prompt (vi / en).
- **Status:** `pass` if `direct=true`, else `fail`.
- **Evidence:** `{ h1, intro, llmResponse, latencyMs }`.
- **Cost:** 1 Gemini Flash call per audit (~$0.0001).

#### G4 `geo/semantic-completeness`
- **Input:** up to 5 H2 sections + 1–2 paragraphs each (max 500 words/chunk).
- **Prompt per chunk:**
  ```
  Đoạn dưới có tự đủ trả lời ý của heading không (không cần đọc trang khác)?
  Trả lời JSON: { "complete": boolean, "wordCount": int }

  Heading: {h2}
  Đoạn: {chunk_text}
  ```
- **Status:**
  - `fail` — <50% chunks `complete=true` OR avg wordCount < 134.
  - `warning` — 50–80% complete.
  - `pass` — ≥80% complete AND avg ≥134 words.
- **Evidence:** `{ chunkResults: Array<{ heading, complete, wordCount }>, completionRate, avgWordCount }`.
- **Cost:** up to 5 calls per audit (cap enforced).
- **Reference:** [megrisoft 2026 study](https://www.megrisoft.com/blog/artificial-intelligence/ai-citation-ranking-factors) — 134–167 word self-contained passages cited 4.2× more.

### 4.3 GEO Score aggregation

```
For each rule r in 8:
  if r.status == 'pass':       score_r = 1.0
  if r.status == 'warning':    score_r = 0.5
  if r.status == 'fail':       score_r = 0.0
  if r.status == 'error':      score_r = null (excluded)

geoScore = round(100 * sum(weight_r * score_r) / sum(weight_r for non-null))

geoVersion = '1.0' (or '1.0-degraded' if any LLM rule errored)
```

---

## 5. Data Model

### 5.1 `packages/shared/src/plans.ts`

```ts
export enum FeatureFlag {
  // ...existing 8 flags
  GEO_AUDIT = 'geo_audit',  // NEW
}

export type QuotaDimension =
  | /* ...existing */
  | 'geo_audits_monthly';  // NEW

const PRO_FEATURES = [
  // ...existing
  FeatureFlag.GEO_AUDIT,
];

// Quotas:
free:     { geo_audits_monthly: 0,   ... }
pro:      { geo_audits_monthly: 50,  ... }
business: { geo_audits_monthly: 300, ... }
```

### 5.2 `seo-analyzer` DB

No schema change. Seed 8 rows in `seo_rules` table (idempotent migration):

```sql
INSERT INTO seo_rules (id, name, category, weight, enabled, created_at) VALUES
  ('geo-ai-bot-access',         'AI Bot Access Policy',       'geo', 12.5, true, NOW()),
  ('geo-llms-txt',              'llms.txt Standard',          'geo', 12.5, true, NOW()),
  ('geo-direct-answer',         'Direct Answer Intro',        'geo', 12.5, true, NOW()),
  ('geo-semantic-completeness', 'Semantic Completeness',      'geo', 12.5, true, NOW()),
  ('geo-article-schema',        'Article Schema Markup',      'geo', 12.5, true, NOW()),
  ('geo-entity-markup',         'Author + Publisher Markup',  'geo', 12.5, true, NOW()),
  ('geo-quotable-density',      'Quotable Content Density',   'geo', 12.5, true, NOW()),
  ('geo-citation-outbound',     'Authoritative Citations',    'geo', 12.5, true, NOW())
ON CONFLICT (id) DO NOTHING;
```

`RuleResult.evidence` (JSONB) carries the per-rule evidence object defined in §4.

### 5.3 `report` DB — 1 column added

```prisma
model Report {
  // ...existing
  geoScore     Int?     // 0-100, null when GEO skipped
  geoVersion   String?  // e.g. "1.0", "1.0-degraded"
}
```

Migration file: `apps/report/prisma/migrations/20260528_add_geo_score/migration.sql`.

### 5.4 Redis keys

- `geo:robots-txt:<host>` — TTL 3600s, raw fetched body.
- `geo:llms-txt:<host>` — TTL 3600s, raw fetched body.
- `geo:llm:<auditId>:<ruleId>` — TTL 86400s, idempotency for LLM call.

### 5.5 gRPC proto extension

`packages/proto/crawler.proto`:

```proto
message PageData {
  // ...existing fields
  optional AiBotAccess ai_bot_access = 20;
  optional LlmsTxt llms_txt = 21;
}

message AiBotAccess {
  string robots_txt_url = 1;
  int32 robots_txt_status = 2;
  repeated UserAgentRule rules = 3;
}

message UserAgentRule {
  string user_agent = 1;
  repeated string disallow = 2;
  repeated string allow = 3;
}

message LlmsTxt {
  string url = 1;
  int32 status = 2;
  optional string h1 = 3;
  optional string summary = 4;
  int32 section_count = 5;
  int32 size_bytes = 6;
}
```

`packages/proto/analyzer.proto`:

```proto
message AnalyzeResponse {
  // ...existing fields
  optional int32 geo_score = 10;
  optional string geo_version = 11;
}
```

Build: `npm --workspace @repo/proto run build` regenerates `.d.ts` for all consumers.

---

## 6. API Contract

### 6.1 Augmented existing endpoint

```
GET /api/v1/audits/:id
```

Response gains:

```jsonc
{
  // ...existing fields
  "geoScore": 42,                  // null for free users or quota-skipped
  "geoVersion": "1.0",             // null if GEO didn't run
  "geoEnabled": true,              // true if user plan allows GEO
  "geoSkippedReason": null,        // null | "free_plan" | "quota_exhausted" | "disabled_by_admin"
  "geoBreakdown": {                // null if geoEnabled=false
    "rules": [
      {
        "id": "geo-ai-bot-access",
        "status": "fail",
        "score": 0.0,
        "message": "GPTBot bị block trong robots.txt",
        "evidence": { /* per §4 */ }
      }
      // ...7 more
    ]
  }
}
```

### 6.2 New endpoint — llms.txt generator

```
POST /api/v1/tools/llms-txt-generator
Auth: required (Pro+Business via PlanGuard with FeatureFlag.GEO_AUDIT)
Quota: tools_fetches_daily (existing) + geo_audits_monthly (count as 1)
Rate-limit: existing tools sliding window
Body: { url: string, includeSections?: string[] }
```

Response 200:
```jsonc
{
  "url": "https://example.com",
  "content": "# Example Site\n\n> Brief summary of the site.\n\n## Documentation\n- [Getting Started](https://example.com/docs/start)\n...",
  "sizeBytes": 1240,
  "warnings": ["Site has no sitemap, generated from homepage links"]
}
```

Error responses:
| Code | HTTP | Meaning |
|---|---|---|
| `GEO_NOT_AVAILABLE_ON_PLAN` | 403 | Free user calling generator |
| `GEO_QUOTA_EXCEEDED` | 429 | Monthly quota exhausted |
| `GEO_LLM_UNAVAILABLE` | 503 | Gemini provider down |
| `LLMS_TXT_GENERATION_FAILED` | 422 | Source URL unreachable or no content |

### 6.3 WebSocket event (existing channel)

`audit:progress` event payload `step` enum gains:
- `'analyzing_geo'` — emitted by seo-analyzer when GEO rule batch starts.

No new channel needed.

---

## 7. Frontend UX

### 7.1 New routes / pages

- `/[locale]/audits/[id]?tab=geo` — query param syncs tab.
- `/[locale]/tools/llms-txt-generator` — standalone page (Pro+ only, Free redirects to `/pricing?from=llms-generator`).

### 7.2 New components

Located in `apps/web/src/components/audit-detail/geo/`:

1. **`GeoTab.tsx`** — full tab body for Pro+Business users.
   - Header: ring chart (geoScore) + label ("Cần cải thiện" / "Tốt" / "Xuất sắc").
   - Generator card button → opens `LlmsTxtGeneratorModal`.
   - 8 expandable rule cards (`GeoRuleCard`).
   - Footer link to thesis chapter / blog post explaining GEO.

2. **`GeoPaywallOverlay.tsx`** — Free user version.
   - Renders `GeoTab` content blurred + non-interactive.
   - Overlay CTA card: "🔒 GEO Audit là tính năng Pro+" + "Nâng cấp lên Pro — 99.000đ/tháng" button → `/pricing`.

3. **`GeoRuleCard.tsx`** — single rule (status icon, name, message, expandable evidence).
   - Evidence rendering: switch on rule ID to render appropriate detail (robots.txt table, llms.txt snippet, JSON-LD code block, etc).
   - Citation link to source paper / spec.

4. **`LlmsTxtGeneratorModal.tsx`** — modal triggered from `GeoTab`.
   - Pre-filled URL from current audit.
   - Optional checkboxes: include sections (Docs, Blog, Products).
   - Generate button → POST `/tools/llms-txt-generator`.
   - Output: markdown textarea with syntax highlight (reuse existing `<CodeBlock>`).
   - Actions: Copy to clipboard + Download as `llms.txt`.

### 7.3 i18n keys

Add ~25 keys to `apps/web/src/messages/{vi,en}.json`:

- `auditDetail.geo.title`, `auditDetail.geo.subtitle`, `auditDetail.geo.tabLabel`
- `auditDetail.geo.scoreLabel.poor/.ok/.good/.excellent`
- `auditDetail.geo.paywallTitle`, `auditDetail.geo.paywallCta`, `auditDetail.geo.paywallDescription`
- `auditDetail.geo.rules.{ruleId}.name`, `.passMsg`, `.warningMsg`, `.failMsg`
- `tools.llmsTxt.title`, `tools.llmsTxt.description`, `tools.llmsTxt.cta`
- `tools.llmsTxt.generatorPlaceholder`, `tools.llmsTxt.copySuccess`

### 7.4 Audit detail page modifications

Modify [apps/web/src/app/[locale]/(app)/audits/[id]/page.tsx](../../../apps/web/src/app/) to:
- Add 4th tab "AI Visibility" after Overview / Pages / Keywords.
- Conditionally render `<GeoTab>` or `<GeoPaywallOverlay>` based on `audit.geoEnabled`.

---

## 8. Entitlement & Quota Flow

```
POST /audits { url, mode: 'single' }
  ↓
JwtAuthGuard (existing)
  ↓
PlanGuard([FeatureFlag.AUDIT]) (existing)
  ↓
AuditsService.create():
  - canRunGeo = await entitlementService.hasFeature(userId, FeatureFlag.GEO_AUDIT)
  - quotaRemaining = await quotaCounter.getRemaining('geo_audits_monthly', userId)
  - runGeo = canRunGeo && quotaRemaining > 0
  - if runGeo: await quotaCounter.increment('geo_audits_monthly', userId)
  - Persist Audit row with metadata: { runGeo, geoSkippedReason? }
  - Enqueue BullMQ[crawl.start] { auditId, url, mode, runGeo }
  ↓
Downstream services pass runGeo through job payloads.
seo-analyzer reads runGeo and conditionally executes GEO rule batch.
```

Admin bypass: `EntitlementService.isAdmin(userId)` → `runGeo=true` always; quota counter still increments for telemetry.

---

## 9. Testing Strategy

### 9.1 Unit tests

Location: `apps/seo-analyzer/test/unit/rules/geo/`

- One spec file per rule × 8 rules.
- Each spec covers: pass case, warning case, fail case, error case, edge case (empty input, malformed input).
- LLM rules (G3, G4): mock `GeminiClient.complete()` with fixture response for 4 scenarios each.

Plus:
- `geo-score-calculator.spec.ts` — aggregation logic, including degraded mode (some rules `error`).
- `apps/crawler/test/unit/fetchers/llms-txt-fetcher.spec.ts` — markdown parsing (H1 detection, blockquote detection, size limit).
- `apps/crawler/test/unit/fetchers/robots-txt-multi-bot.spec.ts` — parse user-agent rules for 5 AI bots.

### 9.2 Integration tests

- `apps/seo-analyzer/test/integration/geo-pipeline.spec.ts`:
  - Real PageData fixture (well-optimized article) → `geoScore ∈ [80, 100]`.
  - Bare homepage fixture → `geoScore < 30`.
  - Degraded mode (Gemini mock returns timeout) → `geoVersion === '1.0-degraded'`, `geoScore` averages 6 rules.

### 9.3 E2E tests

- `apps/gateway/test/integration/audits-geo.e2e-spec.ts`:
  - Free user → POST audit → response `geoEnabled=false`, `geoScore=null`.
  - Pro user happy path → response has `geoScore` and `geoBreakdown.rules.length === 8`.
  - Pro user with quota exhausted → response `geoSkippedReason='quota_exhausted'`.
  - llms.txt generator: Free user POST → 403 `GEO_NOT_AVAILABLE_ON_PLAN`.
  - llms.txt generator: Pro user POST → 200 with valid markdown content.

### 9.4 Frontend tests

Location: `apps/web/tests/unit/`

- `geo-tab.test.tsx` — render with 8-rule mix → icon count matches statuses.
- `geo-paywall.test.tsx` — `geoEnabled=false` → blur + CTA visible.
- `llms-txt-generator-modal.test.tsx` — generate flow, copy button calls `navigator.clipboard.writeText`.

### 9.5 Manual QA checklist

- [ ] PDF report export includes a GEO section (if `geoScore != null`).
- [ ] Public share link hides `geoBreakdown` (paid feature, not exposed publicly).
- [ ] Admin disable of any GEO rule via existing `seo_rules.enabled=false` makes that rule absent from breakdown.
- [ ] Vietnamese page: LLM prompts use Vietnamese template (detected via existing `language-tag.rule`).
- [ ] Audit Compare v2 (when shipped): compare two audits of same URL shows GEO score delta.

---

## 10. Phase 2 Hooks (out of scope but designed-for)

The MVP is structured so the following work in Phase 2 is additive, not refactoring:

- **Site mode GEO**: `seo-analyzer` already iterates per page in site mode; runGeo flag propagates. Need quota policy ("how many pages per site audit run GEO") + UI showing per-page GEO scores.
- **GEO trend chart**: dashboard already has `score-trend-chart.tsx`. Add `geoScore` as a series.
- **AI Visibility benchmark**: compare user's geoScore against industry average (publish anonymized aggregates).

---

## 11. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Gemini free tier 20 calls/day exhausted by GEO + AI Suggestion | Bump to paid tier before launch ($0.10/M tokens Flash); monitor via existing AI metering |
| LLM judgments inconsistent across runs | Pin model version (`gemini-2.0-flash-001`), low temperature (0.2), and snapshot the prompt template under `geoVersion` |
| FAQ schema users on legacy pages | Rule G5 explicitly accepts only Article/BlogPosting/NewsArticle; FAQ is silently ignored. Surface a documentation note explaining 2026-05-07 deprecation. |
| Whitelist for G8 citations skews English-centric | Add `.gov.vn`, `.edu.vn` and a configurable whitelist via admin panel in Phase 2 |
| Vietnamese page content language detection unreliable for code-mixed pages | Reuse existing `language-tag.rule` heuristic; fall back to `<html lang>` attribute |
| llms.txt generator could be abused for SSRF | Reuse SSRF policy from Tools Suite spec §5; reject private IPs, redirects to private hosts |

Open question (resolve before plan):
- **Q11.1:** Should `geoScore` factor into overall `seoScore`, or stay separate? Recommendation: **stay separate** to avoid confusing existing customers; surface both side-by-side.

---

## 12. Estimate & Phase Split

Target deadline: ≤1 month (gấp). Phase 1 only.

| Workstream | Effort |
|---|---|
| `packages/shared` + `packages/proto` updates | 0.5 day |
| `crawler` enrichment (2 fetchers + proto wire) | 1.5 days |
| `seo-analyzer` 8 rules + tests | 4 days |
| `seo-analyzer` LLM prompt + Gemini wiring | 1 day |
| `report` migration + service update | 0.5 day |
| `gateway` entitlement + augmented response | 1 day |
| `gateway` llms.txt generator endpoint | 1 day |
| `web` 4 components + i18n + paywall | 3 days |
| Integration + E2E tests | 1.5 days |
| Manual QA + bug fix | 1 day |
| Báo cáo đồ án — chương GEO | 2 days |
| **Total** | **~17 days** |

Buffer 5 days for review + slide prep within the 1-month window.

---

## 13. References

- Aggarwal, P., et al. (2024). *GEO: Generative Engine Optimization*. KDD '24. [arXiv:2311.09735](https://arxiv.org/abs/2311.09735).
- Howard, J. (2024). [llms.txt specification](https://llmstxt.org/).
- Google Search Central. [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
- [OpenAI GPTBot documentation](https://platform.openai.com/docs/gptbot).
- [Anthropic ClaudeBot documentation](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).
- [Google-Extended crawler reference](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers).
- megrisoft.com (2026). [AI Citation Ranking Factors study](https://www.megrisoft.com/blog/artificial-intelligence/ai-citation-ranking-factors).
- Internal: [FEATURE_PLAN.md](../../../FEATURE_PLAN.md), [.planning/audit-compare-v2/PLAN.md](../../../.planning/audit-compare-v2/PLAN.md), [docs/superpowers/specs/2026-05-22-seo-tools-suite-design.md](2026-05-22-seo-tools-suite-design.md).
