# Plan 2 Handoff — LLM Enrichment

**Purpose:** Bootstrap a fresh session to write `docs/superpowers/plans/2026-04-22-seo-public-api-plan-2-llm-enrichment.md` using `superpowers:writing-plans`. Plan 1 is shipped; Plan 2 replaces the template-degrade shim with real LLM enrichment.

## Session bootstrap commands

```bash
# Read these in order:
cat docs/superpowers/specs/2026-04-22-seo-public-api-design.md                  # full design spec
cat docs/superpowers/plans/2026-04-22-seo-public-api-plan-1-foundation-core.md  # what's already built (reference only)
cat packages/seo-ai-core/README.md                                              # library API
cat apps/gateway/src/public-api/services/public-check.service.ts                # the shim to replace
cat apps/seo-analyzer/src/analyzer/controllers/analyze-content.controller.ts    # analyzer output format
```

## What Plan 1 delivered (do NOT re-do)

Already shipped on branch `feat/seo-public-api` (tag `public-api-plan-1-done`):

- Proto: `AnalyzeContent`, `LiteFetch`, `AnalyzeMode`, `RuleIssue`, SeoRule ext (fields 10-13)
- Prisma: `ApiKey` + `UsageDaily` tables + migration
- `@repo/shared`: public-api types, `PUBLIC_API_REDIS_KEYS`, `PUBLIC_API_CACHE_TTL`, `PUBLIC_API_RATE_LIMITS`
- seo-analyzer: `PageDataBuilderService`, `RuleMetadataService`, `AnalyzeContentController`, `RuleRunner.runContent`, rule `requires` field
- crawler: `LiteFetchService` + gRPC controller (Cheerio, SSRF, cache)
- gateway: `PublicApiModule`, `ApiKeyService`, `ApiKeyGuard`, `ApiKeysController`, `PublicApiRateLimitService`, `ContentExtractorService`, `PublicCheckService` (template mode works, LLM mode shimmed), `PublicCheckController`, `PublicRulesController`, `PublicHealthController`, Swagger scope-limited at `/public/docs`
- Admin: cross-user API key list/revoke
- e2e smoke test block for public-api

## The shim to replace (exact location)

`apps/gateway/src/public-api/services/public-check.service.ts` currently has:

```typescript
let suggestionSource: PublicCheckResponse['meta']['suggestionSource'] = 'none';
let degraded = false;
if (enrichMode === 'off') suggestionSource = 'none';
else if (enrichMode === 'template') suggestionSource = 'template';
else if (enrichMode === 'llm') {
  // Plan-1 shim: no LLM yet. Fall back to template.
  suggestionSource = 'template';
  degraded = true;
}
```

And:
```typescript
private buildSuggestion(template: string, mode: EnrichMode): PublicCheckIssue['suggestion'] {
  if (mode === 'off') return null;
  if (!template) return null;
  return { type: 'rewrite', text: template, rationale: '' };
}
```

Plan 2 **must**:
1. When `enrichMode === 'llm'`, call `SuggestionEnricherService.enrich(issues, context)` (new service) instead of falling back
2. `SuggestionEnricherService` uses `@repo/seo-ai-core` to batch-call LLM (1 call for all issues)
3. On LLM failure/timeout (8s timeout, 2 retries per seo-ai-core defaults) → fall back to template (current behavior) with `degraded: true`
4. On success → `suggestionSource: 'llm'`, `degraded: false`, suggestions come from LLM output
5. Cache LLM output separately (key `PUBLIC_API_REDIS_KEYS.suggest(hash)`, TTL `PUBLIC_CHECK_LLM_SECONDS = 3600`)

## `@repo/seo-ai-core` API (already imported via `@repo/seo-ai-core` package)

Key exports (verified in `packages/seo-ai-core/src/index.ts`):

```typescript
// LLM factory
createLLM({ provider: 'anthropic', model: 'claude-sonnet-4-6', defaultMaxTokens: 2048 })
  → returns ILLM with .invoke({ messages: [...] }) → Promise<{ content, usage, raw }>

// Prompt loader (YAML versioned)
new FileSystemPromptLoader({ baseDir: './prompts' })
  → .load(id, { version: '^1.0.0' }) → Prompt
  → .render(id, vars, { version }) → { messages, hash }

// Output parser (Zod guardrail)
new ZodOutputParser(zodSchema)
  → .parse(llmRawOutput) → validatedT | throws GuardrailError

// Chain wrapper (LLM + prompt + parser + retry + logger)
new BaseChain({ llm, prompt, parser, logger, retry: { maxAttempts: 2, backoffMs: 500 } })
  → .run(vars, { timeoutMs: 8000, signal }) → Promise<T>
```

Env required: `ANTHROPIC_API_KEY`. Model via `LLM_MODEL` env override (default `claude-sonnet-4-6`).

## Prompt YAML location + naming

Create: `apps/gateway/src/public-api/prompts/suggest-fix-seo/v1.0.0.prompt.yaml`

Strict semver in filename (enforced by FileSystemPromptLoader). Loader walks `baseDir` for `<id>/v<semver>.prompt.yaml`.

Prompt vars (from Plan 1 spec section "AI Enrichment"):
- `{{language}}` — 'vi' | 'en'
- `{{targetKeyword}}` — string
- `{{contentExcerpt}}` — truncated to 2000 tokens (~8000 chars)
- `{{#each issues}} ruleId / message / evidence (as json) {{/each}}`

Output: strict JSON array, schema via Zod:

```typescript
z.array(z.object({
  ruleId: z.string(),
  type: z.enum(['rewrite', 'add', 'remove', 'reorder']),
  text: z.string().min(1).max(500),
  rationale: z.string().min(1).max(300),
}))
```

Order preservation: prompt instructs LLM to return one object per input issue **in the same order**. Enricher merges by index, falls back to template for any missing/bad entries.

## Analyzer output format (input to Enricher)

`AnalyzerGrpcClient.analyzeContent(...)` returns (already typed in `apps/gateway/src/infra/grpc/analyzer.client.ts`):

```typescript
interface AnalyzeContentResponse {
  rule_version: string;
  issues: Array<{
    rule_id: string;
    status: string;                              // "pass" | "warn" | "fail"
    score: number;                                // 0 | 50 | 100
    category: string;
    severity: string;                             // "error" | "warning" | "info"
    audiences: string[];
    message: string;
    template_suggestion: string;                  // rule's rendered fallback text
    evidence: Record<string, unknown>;
    doc_ref: string;
  }>;
  content_stats: { word_count, character_count, ... };
}
```

## Expected Plan 2 task breakdown (suggestion, not prescriptive)

Write full plan with TDD granularity matching Plan 1 style:

**Phase L — LLM Enrichment**
1. Create `apps/gateway/src/public-api/prompts/suggest-fix-seo/v1.0.0.prompt.yaml` + golden-sample test fixtures (10 diverse)
2. Create `apps/gateway/src/public-api/services/seo-suggest-chain.factory.ts` — constructs `BaseChain` at bootstrap with lazy init (skip if `ANTHROPIC_API_KEY` absent; degrade gracefully)
3. Create `apps/gateway/src/public-api/services/suggestion-enricher.service.ts` — `enrich(issues, context, mode)` returns `EnrichedIssue[]` with suggestion + metadata
   - Cache key `suggest:<hash>` (use `PUBLIC_API_REDIS_KEYS.suggest`)
   - Template fallback on any error or when `ANTHROPIC_API_KEY` unset
   - Concurrency limit per key via existing `rl:pubcheck:concur:<apiKeyId>` bucket
4. Unit test `suggestion-enricher.service.spec.ts` — mock chain, assert llm mode, template mode, fallback path, cache hit
5. Modify `public-check.service.ts` — inject enricher; replace shim; set `suggestionSource: 'llm' | 'template' | 'mixed'` + `degraded` accurately
6. Modify `public-check.service.spec.ts` — add LLM mode test with mocked enricher
7. Modify `public-api.module.ts` — register `SuggestionEnricherService`, chain factory provider
8. Integration test `public-api.e2e-spec.ts` — LLM mode with mocked chain (do NOT call real Anthropic in CI)
9. Manual smoke with real `ANTHROPIC_API_KEY` on dev env — 10 fixtures — note quality findings in commit message
10. Update `docs/superpowers/specs/2026-04-22-seo-public-api-design.md` changelog if any design drift

## Critical constraints

- **Never bypass hooks** (`--no-verify`). Pre-commit runs `turbo run lint check-types`. Fix root causes.
- **Never add Claude attribution** to commit messages. `.claude/CLAUDE.md` line 31 forbids it.
- **Mock LLM in CI tests.** Real Anthropic calls are manual only. Cost + flakiness.
- **LLM failures must not 5xx.** Graceful degrade to template always. `meta.degraded: true` + `suggestionSource: 'template'` returned with 200.
- **8s LLM timeout** (`PUBLIC_API_RATE_LIMITS.LLM_TIMEOUT_MS`). Longer than that → cancel, fall back.
- **Batched 1 call** for all issues, not per-issue. Cost ~$0.015/req (Sonnet). Per-issue would 10x.
- **No RAG in Plan 2.** Design includes retriever for Plan 2+ but MVP uses prompt + few-shot only. Add RAG corpus later.

## Environment

- Branch: start from `feat/seo-public-api` (tag `public-api-plan-1-done`)
- Create new branch `feat/seo-public-api-plan-2` or continue on same branch (user decides)
- Current git HEAD: `e1ac32c` — "chore(public-api): Plan 1 (Foundation + Core API) complete"
- Node 24, TypeScript strict, Vitest, NestJS 10

## Open questions to raise (or decide via `/auto-decide`)

1. Branch strategy for Plan 2: same branch or new branch?
2. `SeoSuggestChain` lazy init vs eager at bootstrap (impacts test wiring)
3. Per-issue vs batched streaming (batched committed per spec, but SSE hinted at Plan 2+)
4. Golden fixture sourcing: synthesize in plan, or pull from `apps/seo-analyzer/test/fixtures`?

---

**Handoff complete.** Fresh session command to run:

```
/superpowers:writing-plans

Read these in order then write Plan 2:
  1. docs/superpowers/plans/PLAN-2-HANDOFF.md   ← this file
  2. docs/superpowers/specs/2026-04-22-seo-public-api-design.md  (section "AI Enrichment")
  3. apps/gateway/src/public-api/services/public-check.service.ts (the shim)
  4. packages/seo-ai-core/README.md
  5. packages/seo-ai-core/src/index.ts (API surface verification)
Save output to: docs/superpowers/plans/2026-04-22-seo-public-api-plan-2-llm-enrichment.md
```
