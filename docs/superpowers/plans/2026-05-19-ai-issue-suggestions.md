# AI Issue Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sau mỗi audit, sinh per-rule AI suggestions (Gemini 1.5 Flash) cho mỗi rule FAIL/WARN; persist JSONB vào `Report.ai_suggestions`; push qua WebSocket cho web UI.

**Architecture:** Đăng ký CẢ `AnthropicAdapter` (đã có) + `GeminiAdapter` (mới) trong `@repo/seo-ai-core`, chọn qua `SEO_AI_PROVIDER`. `apps/report` listen `report.done`, enqueue BullMQ `ai-suggest.start`, worker dùng seo-ai-core (prompt loader + LLM + Zod parser), persist `Report.ai_suggestions`, publish `audit.suggestions.done`. Gateway forward WS, web render `<AiSuggestionCard>` dưới mỗi rule failing.

**Tech Stack:** NestJS 11, Prisma, BullMQ, Redis pub/sub, LangChain (`@langchain/anthropic` đã có + `@langchain/google-genai` mới), Zod, React 19 + TanStack Query + Socket.IO client.

**Spec:** [docs/superpowers/specs/2026-05-19-ai-issue-suggestions-design.md](../specs/2026-05-19-ai-issue-suggestions-design.md)

> **⚠️ Revision 2026-05-21 — Reality reconciliation (đọc trước khi execute).** Plan gốc viết trước khi đối chiếu code. Override bắt buộc:
> 1. **CheckStatus lowercase** — `'pass'|'warn'|'fail'` ([packages/shared/src/index.ts:12](../../../packages/shared/src/index.ts)). Mọi filter/fixture dùng `CheckStatus.FAIL/WARN` (import từ `@repo/shared`), KHÔNG `'FAIL'/'WARN'`. Áp dụng: Task 11, 12, 26.
> 2. **Prompt YAML** — Task 10 dùng shape `id/version/variables[]/metadata{owner}/system/user` (KHÔNG `messages:` — loader sẽ throw).
> 3. **`r.ruleId`** — `AnalyzeRuleResult` có field `ruleId` thật + `suggestion` tĩnh. Task 12 map `ruleId: r.ruleId` (không phải `r.ruleName`); Task 24 web match `rule.ruleId`. Service nên **reuse** `AnalyzeResult` interface từ [analyze-result.interface.ts](../../../apps/report/src/report/domain/analyze-result.interface.ts) thay vì tự định nghĩa `SnapshotRule`.
> 4. **Task 14b = SKIP** — `report.done` ĐÃ publish ở [report.service.ts:90](../../../apps/report/src/report/services/report.service.ts) với `{auditId, reportId, finalScore, classification}`. Chỉ verify, không thêm.
> 5. **Provider = both via env** — Task 4 register cả gemini; Task 15 factory chọn provider qua `SEO_AI_PROVIDER` (default `anthropic`), gate stub theo `SEO_AI_ENABLED` (không hardcode `GEMINI_API_KEY`). Task 17 env default `SEO_AI_PROVIDER=anthropic`, `SEO_AI_MODEL=claude-haiku-4-5`; Gemini dùng `gemini-2.0-flash` (1.5-flash deprecated).
> 6. **Gateway path/mechanism** — Task 20 sửa thành [apps/gateway/src/infra/websocket/progress-subscriber.service.ts](../../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts), dùng `this.redis.subscribe(channel, cb)` + emit qua `AuditGateway` (thêm `emitSuggestionsDone`), KHÔNG `sub.on('message')`/`this.io`.

---

## File Map

**Create:**
- `packages/seo-ai-core/src/llm/adapters/gemini.adapter.ts`
- `packages/seo-ai-core/test/llm.gemini.adapter.spec.ts`
- `packages/seo-ai-core/test/llm.gemini.integration.spec.ts`
- `apps/report/prisma/migrations/<ts>_add_report_ai_suggestions/migration.sql`
- `apps/report/src/report/ai-suggest/ai-suggest.module.ts`
- `apps/report/src/report/ai-suggest/controllers/ai-suggest.listener.ts`
- `apps/report/src/report/ai-suggest/controllers/ai-suggest.worker.ts`
- `apps/report/src/report/ai-suggest/services/ai-suggest.service.ts`
- `apps/report/src/report/ai-suggest/services/suggestion.schema.ts`
- `apps/report/src/report/ai-suggest/prompts/seo-rule-suggestions/v1.0.0.prompt.yaml`
- `apps/report/test/unit/ai-suggest.service.spec.ts`
- `apps/report/test/integration/ai-suggest-pipeline.e2e-spec.ts`
- `apps/web/src/components/audit-detail/ai-suggestion-card.tsx`
- `apps/web/test/components/audit-detail/ai-suggestion-card.test.tsx`

**Modify:**
- `packages/seo-ai-core/package.json` — add `@langchain/google-genai`
- `packages/seo-ai-core/src/llm/provider.ts` — register `gemini`
- `packages/seo-ai-core/src/index.ts` — export `GeminiAdapter`
- `packages/seo-ai-core/test/llm.provider.spec.ts` — update test (gemini no longer unknown)
- `packages/seo-ai-core/README.md` — add `GEMINI_API_KEY` row
- `packages/shared/src/index.ts` — add `AI_SUGGEST_START`
- `apps/report/prisma/schema.prisma` — `aiSuggestions Json?`
- `apps/report/src/report/report.module.ts` — import `AiSuggestModule`
- `apps/report/package.json` — add `@repo/seo-ai-core`, `zod` (if missing)
- `apps/report/Dockerfile` — copy `prompts/` into image
- `apps/report/.env.example` + `.env.docker.example` — add Gemini envs
- `docker-compose.yml` — pass envs to `report` service
- `packages/proto/report/v1/report.proto` — `AiSuggestion` message + `ai_suggestions` repeated field
- `apps/gateway/src/infra/websocket/progress-subscriber.service.ts` — subscribe `audit.suggestions.done`
- `apps/gateway/src/infra/websocket/audit.gateway.ts` — add `emitSuggestionsDone`
- `apps/web/src/lib/api/types.ts` — add `ReportAiSuggestion` type
- `apps/web/src/lib/audits/proto-map.ts` — map gRPC field
- `apps/web/src/components/audit-detail/completed-report.tsx` — inject `<AiSuggestionCard>`
- `apps/web/src/hooks/use-audit-websocket.ts` (or equivalent) — handle `audit:suggestions-done`

---

## Task 1: Add `@langchain/google-genai` dependency to seo-ai-core

**Files:**
- Modify: `packages/seo-ai-core/package.json`

- [ ] **Step 1: Add dependency**

Run from repo root:
```bash
cd packages/seo-ai-core && npm install --save @langchain/google-genai@^0.2.0
```
Expected: `package.json` and `package-lock.json` updated; new entry under `dependencies`.

- [ ] **Step 2: Verify build still passes**

```bash
cd packages/seo-ai-core && npm run build
```
Expected: tsc compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add packages/seo-ai-core/package.json package-lock.json
git commit -m "chore(seo-ai-core): add @langchain/google-genai dependency"
```

---

## Task 2: Write failing test for GeminiAdapter unit behavior

**Files:**
- Create: `packages/seo-ai-core/test/llm.gemini.adapter.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/seo-ai-core/test/llm.gemini.adapter.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@langchain/google-genai', () => {
  return {
    ChatGoogleGenerativeAI: vi.fn().mockImplementation((cfg: Record<string, unknown>) => ({
      cfg,
      invoke: vi.fn().mockResolvedValue({
        content: 'OK',
        usage_metadata: { input_tokens: 5, output_tokens: 1, total_tokens: 6 },
        response_metadata: { stop_reason: 'end_turn' },
      }),
      stream: vi.fn(),
      getNumTokens: vi.fn().mockResolvedValue(3),
    })),
  };
});

import { GeminiAdapter } from '../src/llm/adapters/gemini.adapter.js';
import { LLMError } from '../src/errors/index.js';

describe('GeminiAdapter', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('throws LLMError when no apiKey and no env', () => {
    expect(() => new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash' }))
      .toThrow(LLMError);
  });

  it('uses env GEMINI_API_KEY when cfg.apiKey is omitted', () => {
    process.env.GEMINI_API_KEY = 'env-key';
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash' });
    expect(a.name).toBe('gemini');
    expect(a.model).toBe('gemini-2.0-flash');
  });

  it('invoke() returns LLMResponse with content + usage + model', async () => {
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    const res = await a.invoke({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.content).toBe('OK');
    expect(res.usage.total).toBe(6);
    expect(res.model).toBe('gemini-2.0-flash');
  });

  it('invoke() wraps underlying errors as LLMError with retriable=true', async () => {
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    // @ts-expect-error — replace mock to throw
    a.client.invoke = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(a.invoke({ messages: [{ role: 'user', content: 'x' }] }))
      .rejects.toBeInstanceOf(LLMError);
  });

  it('countTokens delegates to underlying client', async () => {
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    expect(await a.countTokens('hello')).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/seo-ai-core && npx vitest run test/llm.gemini.adapter.spec.ts
```
Expected: FAIL — `Cannot find module '../src/llm/adapters/gemini.adapter.js'`.

---

## Task 3: Implement GeminiAdapter

**Files:**
- Create: `packages/seo-ai-core/src/llm/adapters/gemini.adapter.ts`

- [ ] **Step 1: Write the adapter**

Create `packages/seo-ai-core/src/llm/adapters/gemini.adapter.ts`:

```ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { AIMessage } from '@langchain/core/messages';
import type { ILLMProvider, LLMRequest, LLMResponse, LLMChunk, TokenUsage } from '../types.js';
import type { LLMConfig } from '../provider.js';
import { LLMError } from '../../errors/index.js';
import { toLangChainMessages, toLLMResponse } from './_mappers.js';

export class GeminiAdapter implements ILLMProvider {
  readonly name = 'gemini';
  readonly providerId = 'gemini';
  readonly model: string;
  readonly modelId: string;
  private readonly client: ChatGoogleGenerativeAI;

  constructor(cfg: LLMConfig) {
    const resolvedKey = cfg.apiKey || process.env['GEMINI_API_KEY'];
    if (!resolvedKey) {
      throw new LLMError(
        'GeminiAdapter: missing apiKey (pass cfg.apiKey or set GEMINI_API_KEY env)',
      );
    }
    this.model = cfg.model;
    this.modelId = cfg.model;
    this.client = new ChatGoogleGenerativeAI({
      apiKey: resolvedKey,
      model: cfg.model,
      temperature: cfg.defaultTemperature ?? 0.2,
      maxOutputTokens: cfg.defaultMaxTokens ?? 4096,
      maxRetries: cfg.maxRetries ?? 2,
    });
  }

  async invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    try {
      const result = (await this.client.invoke(toLangChainMessages(req.messages), {
        signal,
        stop: req.stopSequences,
      })) as AIMessage;
      return toLLMResponse(result, this.model);
    } catch (err) {
      throw new LLMError(`Gemini invoke failed: ${(err as Error).message}`, {
        cause: err,
        retriable: true,
      });
    }
  }

  async *stream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMChunk> {
    try {
      const stream = await this.client.stream(toLangChainMessages(req.messages), {
        signal,
        stop: req.stopSequences,
      });
      for await (const chunk of stream) {
        const delta = typeof chunk.content === 'string' ? chunk.content : '';
        const meta = chunk.usage_metadata;
        const usage: TokenUsage | undefined = meta
          ? {
              prompt: meta.input_tokens ?? 0,
              completion: meta.output_tokens ?? 0,
              total: meta.total_tokens ?? (meta.input_tokens ?? 0) + (meta.output_tokens ?? 0),
            }
          : undefined;
        if (delta || usage) {
          yield usage ? { delta, usage } : { delta };
        }
      }
    } catch (err) {
      throw new LLMError(`Gemini stream failed: ${(err as Error).message}`, {
        cause: err,
        retriable: true,
      });
    }
  }

  async countTokens(text: string): Promise<number> {
    return this.client.getNumTokens(text);
  }
}
```

- [ ] **Step 2: Run unit test to verify it passes**

```bash
cd packages/seo-ai-core && npx vitest run test/llm.gemini.adapter.spec.ts
```
Expected: 5/5 PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/seo-ai-core/src/llm/adapters/gemini.adapter.ts \
        packages/seo-ai-core/test/llm.gemini.adapter.spec.ts
git commit -m "feat(seo-ai-core): add GeminiAdapter (ILLMProvider impl via @langchain/google-genai)"
```

---

## Task 4: Register Gemini provider and export

**Files:**
- Modify: `packages/seo-ai-core/src/llm/provider.ts`
- Modify: `packages/seo-ai-core/src/index.ts`
- Modify: `packages/seo-ai-core/test/llm.provider.spec.ts`

- [ ] **Step 1: Update LLMProviderName + REGISTRY in provider.ts**

Open `packages/seo-ai-core/src/llm/provider.ts`. Change:

```ts
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
```
to:
```ts
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GeminiAdapter } from './adapters/gemini.adapter.js';
```

Change:
```ts
export type LLMProviderName = 'openai' | 'anthropic' | 'ollama';
```
to:
```ts
export type LLMProviderName = 'openai' | 'anthropic' | 'gemini' | 'ollama';
```

Change REGISTRY block from:
```ts
const REGISTRY = new Map<string, AdapterCtor>([
  ['anthropic', AnthropicAdapter],
]);
```
to:
```ts
const REGISTRY = new Map<string, AdapterCtor>([
  ['anthropic', AnthropicAdapter],
  ['gemini', GeminiAdapter],
]);
```

- [ ] **Step 2: Export GeminiAdapter from index.ts**

Open `packages/seo-ai-core/src/index.ts`. Find the line exporting `AnthropicAdapter` (or near it). Add:
```ts
export { GeminiAdapter } from './llm/adapters/gemini.adapter.js';
```
(If `AnthropicAdapter` is not currently exported individually, only add the line — don't change existing exports.)

- [ ] **Step 3: Update existing provider test (gemini is no longer "unknown")**

Open `packages/seo-ai-core/test/llm.provider.spec.ts`. Replace the test `'throws LLMError on unknown provider with a helpful message'` block:

```ts
  it('throws LLMError on unknown provider with a helpful message', () => {
    expect(() =>
      createLLM({ provider: 'bogus' as unknown as 'openai', model: 'x' }),
    ).toThrow(LLMError);
    expect(() =>
      createLLM({ provider: 'bogus' as unknown as 'openai', model: 'x' }),
    ).toThrow(/bogus/);
    expect(() =>
      createLLM({ provider: 'bogus' as unknown as 'openai', model: 'x' }),
    ).toThrow(/anthropic/);
  });
```

Add a new test right after:
```ts
  it('routes provider:"gemini" to GeminiAdapter', () => {
    const llm = createLLM({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    expect(llm.name).toBe('gemini');
    expect(llm.model).toBe('gemini-2.0-flash');
  });
```

- [ ] **Step 4: Run tests + typecheck**

```bash
cd packages/seo-ai-core && npm run check-types && npx vitest run test/llm.provider.spec.ts test/llm.gemini.adapter.spec.ts
```
Expected: 0 type errors; 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/seo-ai-core/src/llm/provider.ts \
        packages/seo-ai-core/src/index.ts \
        packages/seo-ai-core/test/llm.provider.spec.ts
git commit -m "feat(seo-ai-core): register gemini provider in factory"
```

---

## Task 5: Add optional Gemini integration smoke test (skipped without API key)

**Files:**
- Create: `packages/seo-ai-core/test/llm.gemini.integration.spec.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect } from 'vitest';
import { createLLM } from '../src/index.js';

const apiKey = process.env['GEMINI_API_KEY'];

describe.skipIf(!apiKey)('GeminiAdapter [integration]', () => {
  it('returns a non-empty completion for a trivial prompt', async () => {
    const llm = createLLM({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey,
      defaultMaxTokens: 50,
    });
    const res = await llm.invoke({
      messages: [{ role: 'user', content: 'Reply with exactly the word OK.' }],
    });
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.usage.total).toBeGreaterThan(0);
    expect(res.model).toBe('gemini-2.0-flash');
  }, 30_000);
});
```

- [ ] **Step 2: Verify it skips without key**

```bash
cd packages/seo-ai-core && npx vitest run test/llm.gemini.integration.spec.ts
```
Expected: test SKIPPED (no `GEMINI_API_KEY` in env).

- [ ] **Step 3: Update README env table**

Open `packages/seo-ai-core/README.md`. Find the configuration table around line 36-38. Replace:
```
| `ANTHROPIC_API_KEY` | `AnthropicAdapter` | Yes (or pass `cfg.apiKey`) |
```
with:
```
| `ANTHROPIC_API_KEY` | `AnthropicAdapter` | Conditional (or pass `cfg.apiKey`) |
| `GEMINI_API_KEY` | `GeminiAdapter` | Conditional (or pass `cfg.apiKey`) |
```

- [ ] **Step 4: Commit**

```bash
git add packages/seo-ai-core/test/llm.gemini.integration.spec.ts \
        packages/seo-ai-core/README.md
git commit -m "test(seo-ai-core): add Gemini integration smoke + doc env"
```

---

## Task 6: Add AI_SUGGEST_START queue constant to shared

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add the queue constant**

Open `packages/shared/src/index.ts`. Find the `BULLMQ_QUEUES` block (around line with `REPORT_START: 'report.start'`). Add a new entry before `SITE_CRAWL_START`:

```ts
export const BULLMQ_QUEUES = {
  CRAWL_START: 'crawl.start',
  ANALYZE_START: 'analyze.start',
  KEYWORD_START: 'keyword.start',
  REPORT_START: 'report.start',
  AI_SUGGEST_START: 'ai-suggest.start',
  SITE_CRAWL_START: 'site-crawl.start',
  SITE_CRAWL_URL_AUDIT: 'site-crawl.url-audit',
  SITE_CRAWL_AGGREGATE: 'site-crawl.aggregate',
  SCHEDULED_AUDIT_TICK: 'scheduled-audit.tick',
  ALERT_SEND: 'alert.send',
} as const;
```

- [ ] **Step 2: Rebuild shared**

```bash
cd packages/shared && npm run build && npm run check-types
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/dist
git commit -m "feat(shared): add AI_SUGGEST_START bullmq queue constant"
```

---

## Task 7: Add `aiSuggestions` JSONB column to Report (Prisma + migration)

**Files:**
- Modify: `apps/report/prisma/schema.prisma`
- Create: `apps/report/prisma/migrations/<auto-ts>_add_report_ai_suggestions/migration.sql`

- [ ] **Step 1: Update schema.prisma**

Open `apps/report/prisma/schema.prisma`. Find `model Report`. After the `analysisSnapshot Json     @map("analysis_snapshot") @db.JsonB` line, add:

```prisma
  aiSuggestions    Json?    @map("ai_suggestions") @db.JsonB
```

- [ ] **Step 2: Generate migration**

```bash
cd apps/report
DATABASE_URL=$REPORT_DATABASE_URL npx prisma migrate dev --name add_report_ai_suggestions --create-only
```
Expected: new folder under `prisma/migrations/<timestamp>_add_report_ai_suggestions/` with `migration.sql` containing `ALTER TABLE "reports" ADD COLUMN "ai_suggestions" JSONB;`.

If the env var isn't set or DB is offline, hand-create the file at `apps/report/prisma/migrations/$(date +%Y%m%d%H%M%S)_add_report_ai_suggestions/migration.sql` with:
```sql
-- AlterTable
ALTER TABLE "reports" ADD COLUMN "ai_suggestions" JSONB;
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd apps/report && npx prisma generate
```
Expected: `src/infra/prisma/generated/` updated. Check `Report` type now has `aiSuggestions: Prisma.JsonValue | null`.

- [ ] **Step 4: Verify build**

```bash
cd apps/report && npm run check-types
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/report/prisma/schema.prisma \
        apps/report/prisma/migrations/ \
        apps/report/src/infra/prisma/generated
git commit -m "feat(report): add ai_suggestions JSONB column to reports"
```

---

## Task 8: Add seo-ai-core + zod dependencies to apps/report

**Files:**
- Modify: `apps/report/package.json`

- [ ] **Step 1: Check current deps**

```bash
cd apps/report && cat package.json | grep -E "seo-ai-core|zod" || echo "NOT FOUND"
```

- [ ] **Step 2: Install if missing**

```bash
cd apps/report && npm install --save @repo/seo-ai-core@* zod@^3.23.0
```
Expected: package.json updated.

- [ ] **Step 3: Verify build**

```bash
cd apps/report && npm run check-types
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/report/package.json package-lock.json
git commit -m "chore(report): add @repo/seo-ai-core + zod deps"
```

---

## Task 9: Create Zod suggestion schema

**Files:**
- Create: `apps/report/src/report/ai-suggest/services/suggestion.schema.ts`

- [ ] **Step 1: Create the schema file**

```ts
import { z } from 'zod';

export const SuggestionItemSchema = z.object({
  ruleId: z.string().min(1),
  explanation: z.string().min(10).max(300),
  actionable_fix: z.string().min(10).max(400),
});

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionItemSchema).min(0).max(20),
});

export type Suggestion = z.infer<typeof SuggestionItemSchema>;
export type SuggestionsPayload = z.infer<typeof SuggestionsSchema>;

export interface PersistedAiSuggestions {
  items: Suggestion[];
  generatedAt: string;
  model: string;
  promptHash: string;
  error?: 'parse_failed' | 'llm_failed' | 'disabled';
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/report/src/report/ai-suggest/services/suggestion.schema.ts
git commit -m "feat(report): add Zod schema for AI suggestions"
```

---

## Task 10: Create prompt YAML template

**Files:**
- Create: `apps/report/src/report/ai-suggest/prompts/seo-rule-suggestions/v1.0.0.prompt.yaml`

- [ ] **Step 1: Create folder + YAML**

```bash
mkdir -p apps/report/src/report/ai-suggest/prompts/seo-rule-suggestions
```

Create file `apps/report/src/report/ai-suggest/prompts/seo-rule-suggestions/v1.0.0.prompt.yaml`:

```yaml
# ⚠️ Shape PHẢI khớp FileSystemPromptLoader.assertTemplateShape:
#   id, version, variables[], metadata{owner}, user (required), system (optional).
#   KHÔNG dùng `messages:` array — loader sẽ throw PromptError.
id: seo-rule-suggestions
version: 1.0.0
description: Per-rule SEO fix suggestions for failing audit rules.
variables:
  - url
  - failingCount
  - failingRulesJson
metadata:
  owner: ai-suggest
  tags:
    - seo
    - structured-output
system: |
  You are an SEO expert. For each failing SEO rule, write:
  - explanation: 1-2 sentences explaining WHY this hurts SEO.
  - actionable_fix: 1-2 sentences with a SPECIFIC action the developer can take.
  Output ONLY valid JSON matching this exact schema:
  {
    "suggestions": [
      { "ruleId": "...", "explanation": "...", "actionable_fix": "..." }
    ]
  }
  Constraints:
  - Use the EXACT ruleId from the input.
  - Do NOT include code blocks (no triple backticks), comments, or any prose outside the JSON.
  - Keep each text field under 300 characters.
  - If no rules are provided, output {"suggestions": []}.
user: |
  URL: {{url}}
  Failing rules ({{failingCount}}):
  {{{failingRulesJson}}}
```

- [ ] **Step 2: Commit**

```bash
git add apps/report/src/report/ai-suggest/prompts/seo-rule-suggestions/v1.0.0.prompt.yaml
git commit -m "feat(report): add seo-rule-suggestions prompt template v1.0.0"
```

---

## Task 11: Write failing unit test for AiSuggestService

**Files:**
- Create: `apps/report/test/unit/ai-suggest.service.spec.ts`

- [ ] **Step 1: Inspect existing test patterns**

```bash
ls apps/report/test/unit/ && cat apps/report/test/unit/report.service.spec.ts 2>/dev/null | head -30
```

- [ ] **Step 2: Write the failing test**

Create `apps/report/test/unit/ai-suggest.service.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiSuggestService } from '../../src/report/ai-suggest/services/ai-suggest.service';

type AnyMock = ReturnType<typeof vi.fn>;

function makeDeps(overrides: Record<string, unknown> = {}) {
  const prisma = {
    report: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const promptLoader = {
    render: vi.fn().mockResolvedValue({
      messages: [{ role: 'user', content: 'rendered' }],
      hash: 'abcd1234abcd1234',
    }),
  };
  const llm = {
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        suggestions: [
          { ruleId: 'title-tag', explanation: 'Title is too long (>60 chars).', actionable_fix: 'Shorten title to ≤60 chars and include primary keyword.' },
        ],
      }),
      usage: { prompt: 100, completion: 30, total: 130 },
      model: 'gemini-2.0-flash',
      finishReason: 'stop',
    }),
  };
  return {
    prisma: { ...prisma, ...((overrides as { prisma?: object }).prisma ?? {}) },
    promptLoader: { ...promptLoader, ...((overrides as { promptLoader?: object }).promptLoader ?? {}) },
    llm: { ...llm, ...((overrides as { llm?: object }).llm ?? {}) },
  };
}

function buildService(deps: ReturnType<typeof makeDeps>) {
  // @ts-expect-error — DI shape constructed manually for unit test
  return new AiSuggestService(deps.prisma, deps.promptLoader, deps.llm);
}

// status values are lowercase CheckStatus ('fail'|'warn'|'pass'); each rule has a real ruleId.
const fakeReport = {
  id: 'r-1',
  auditId: 'a-1',
  url: 'https://example.com',
  analysisSnapshot: {
    ruleResults: [
      { ruleId: 'title-tag', ruleName: 'Title Tag', category: 'meta', status: 'fail', weight: 9, message: 'too long', suggestion: null },
      { ruleId: 'h1-tag',    ruleName: 'H1 Tag',    category: 'headings', status: 'warn', weight: 7, message: 'multiple h1', suggestion: null },
      { ruleId: 'image-alt', ruleName: 'Image Alt', category: 'images', status: 'pass', weight: 6, message: '', suggestion: null },
    ],
  },
};

describe('AiSuggestService.generate', () => {
  beforeEach(() => {
    process.env.SEO_AI_ENABLED = 'true';
  });

  it('returns [] and persists disabled marker when SEO_AI_ENABLED=false', async () => {
    process.env.SEO_AI_ENABLED = 'false';
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(fakeReport) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toEqual([]);
    expect(deps.llm.invoke).not.toHaveBeenCalled();
  });

  it('throws when report not found', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(null) as AnyMock;
    const svc = buildService(deps);
    await expect(svc.generate('missing')).rejects.toThrow(/report not found/);
  });

  it('returns empty suggestions and skips LLM when no FAIL/WARN rules', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue({
      ...fakeReport,
      analysisSnapshot: { ruleResults: [{ ruleId: 'x', ruleName: 'X', status: 'pass', weight: 5, category: 'meta', message: '', suggestion: null }] },
    }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toEqual([]);
    expect(deps.llm.invoke).not.toHaveBeenCalled();
    expect(deps.prisma.report.update).toHaveBeenCalledOnce();
  });

  it('happy path: filters failing rules, calls LLM, parses, persists', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(fakeReport) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toHaveLength(1);
    expect(out[0].ruleId).toBe('title-tag');
    expect(deps.promptLoader.render).toHaveBeenCalledOnce();
    expect(deps.llm.invoke).toHaveBeenCalledOnce();
    expect(deps.prisma.report.update).toHaveBeenCalledOnce();
  });

  it('caps failing rules at 20', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ruleId: `r${i}`, ruleName: `Rule ${i}`, category: 'meta', status: 'fail', weight: 30 - i, message: 'm', suggestion: null,
    }));
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue({
      ...fakeReport,
      analysisSnapshot: { ruleResults: many },
    }) as AnyMock;
    const svc = buildService(deps);
    await svc.generate('a-1');
    const passed = (deps.promptLoader.render as AnyMock).mock.calls[0][1];
    const parsed = JSON.parse(passed.failingRulesJson);
    expect(parsed).toHaveLength(20);
    // sorted by weight desc — first should be highest weight
    expect(parsed[0].weight).toBe(30);
  });

  it('persists parse_failed marker when LLM returns invalid JSON', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(fakeReport) as AnyMock;
    deps.llm.invoke = vi.fn().mockResolvedValue({
      content: 'not json at all',
      usage: { prompt: 1, completion: 1, total: 2 },
      model: 'gemini-2.0-flash',
      finishReason: 'stop',
    }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toEqual([]);
    const updateArgs = (deps.prisma.report.update as AnyMock).mock.calls[0][0];
    expect(updateArgs.data.aiSuggestions.error).toBe('parse_failed');
  });
});
```

- [ ] **Step 3: Run test (it must fail — service doesn't exist yet)**

```bash
cd apps/report && npx vitest run test/unit/ai-suggest.service.spec.ts
```
Expected: FAIL — module not found.

---

## Task 12: Implement AiSuggestService

**Files:**
- Create: `apps/report/src/report/ai-suggest/services/ai-suggest.service.ts`

- [ ] **Step 1: Inspect Logger pattern used in the codebase**

```bash
grep -n "private readonly logger" apps/report/src/report/services/report.service.ts | head -3
```

- [ ] **Step 2: Implement the service**

Create `apps/report/src/report/ai-suggest/services/ai-suggest.service.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CheckStatus } from '@repo/shared';
import type { ILLMProvider, IPromptLoader } from '@repo/seo-ai-core';
import { parseStructured, GuardrailError } from '@repo/seo-ai-core';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { AnalyzeResult } from '../../domain/analyze-result.interface';
import {
  SuggestionsSchema,
  type Suggestion,
  type PersistedAiSuggestions,
} from './suggestion.schema';

const MAX_RULES = 20;
const MODEL_NAME = process.env['SEO_AI_MODEL'] ?? 'claude-haiku-4-5';

// Reuse the report's own domain interface (AnalyzeResult) for the snapshot —
// it already declares ruleId + suggestion + lowercase CheckStatus. No redefine.

export const PROMPT_LOADER = Symbol('AI_SUGGEST_PROMPT_LOADER');
export const LLM_PROVIDER = Symbol('AI_SUGGEST_LLM_PROVIDER');

@Injectable()
export class AiSuggestService {
  private readonly logger = new Logger(AiSuggestService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROMPT_LOADER) private readonly promptLoader: IPromptLoader,
    @Inject(LLM_PROVIDER) private readonly llm: ILLMProvider,
  ) {}

  async generate(auditId: string): Promise<Suggestion[]> {
    const start = Date.now();

    const report = await this.prisma.report.findUnique({ where: { auditId } });
    if (!report) throw new Error(`report not found for auditId=${auditId}`);

    if (process.env['SEO_AI_ENABLED'] !== 'true') {
      this.logger.log(`ai-suggest disabled, marking auditId=${auditId}`);
      await this.persist(report.id, { items: [], model: MODEL_NAME, promptHash: '', error: 'disabled' });
      return [];
    }

    const snap = (report.analysisSnapshot as unknown) as AnalyzeResult;
    const failing = (snap?.ruleResults ?? [])
      // CheckStatus is lowercase ('fail'|'warn'). Use the enum, never 'FAIL'/'WARN'.
      .filter((r) => r.status === CheckStatus.FAIL || r.status === CheckStatus.WARN)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_RULES);

    if (failing.length === 0) {
      await this.persist(report.id, { items: [], model: MODEL_NAME, promptHash: '' });
      this.logger.log(`no failing rules for auditId=${auditId}, persisted empty`);
      return [];
    }

    const rendered = await this.promptLoader.render(
      'seo-rule-suggestions',
      {
        url: report.url,
        failingCount: failing.length,
        failingRulesJson: JSON.stringify(
          failing.map((r) => ({
            ruleId: r.ruleId,          // real field on AnalyzeRuleResult
            ruleName: r.ruleName,
            category: r.category,
            status: r.status,
            weight: r.weight,
            message: r.message,
          })),
        ),
      },
      { version: '^1.0.0' },
    );

    let res;
    try {
      res = await this.llm.invoke({ messages: rendered.messages });
    } catch (err) {
      this.logger.error(`LLM invoke failed for auditId=${auditId}: ${(err as Error).message}`);
      await this.persist(report.id, { items: [], model: MODEL_NAME, promptHash: rendered.hash, error: 'llm_failed' });
      throw err;
    }

    try {
      const parsed = parseStructured(res.content, SuggestionsSchema);
      await this.persist(report.id, {
        items: parsed.suggestions,
        model: MODEL_NAME,
        promptHash: rendered.hash,
      });
      this.logger.log(
        `auditId=${auditId} generated ${parsed.suggestions.length} suggestions in ${Date.now() - start}ms`,
      );
      return parsed.suggestions;
    } catch (err) {
      if (err instanceof GuardrailError) {
        this.logger.warn(`auditId=${auditId} guardrail failed, persisting parse_failed marker`);
        await this.persist(report.id, {
          items: [],
          model: MODEL_NAME,
          promptHash: rendered.hash,
          error: 'parse_failed',
        });
        return [];
      }
      throw err;
    }
  }

  private async persist(reportId: string, partial: Omit<PersistedAiSuggestions, 'generatedAt'>): Promise<void> {
    const aiSuggestions: PersistedAiSuggestions = {
      ...partial,
      generatedAt: new Date().toISOString(),
    };
    await this.prisma.report.update({
      where: { id: reportId },
      data: { aiSuggestions: aiSuggestions as unknown as object },
    });
  }
}
```

- [ ] **Step 3: Verify the @repo/seo-ai-core exports used**

```bash
grep -E "^export" packages/seo-ai-core/src/index.ts | head -20
```
Expected exports include: `parseStructured`, `GuardrailError`, `IPromptLoader`, `ILLMProvider`. If `IPromptLoader` is not exported, add export of type to `packages/seo-ai-core/src/index.ts`:
```ts
export type { IPromptLoader } from './prompt/types.js';
```
(Only add if missing — verify first via the grep above.)

- [ ] **Step 4: Run the unit test**

```bash
cd apps/report && npx vitest run test/unit/ai-suggest.service.spec.ts
```
Expected: 6/6 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/report/src/report/ai-suggest/services/ai-suggest.service.ts \
        apps/report/test/unit/ai-suggest.service.spec.ts \
        packages/seo-ai-core/src/index.ts
git commit -m "feat(report): implement AiSuggestService (orchestrates prompt + LLM + persist)"
```

---

## Task 13: Implement AiSuggestWorker (BullMQ processor)

**Files:**
- Create: `apps/report/src/report/ai-suggest/controllers/ai-suggest.worker.ts`

- [ ] **Step 1: Inspect existing worker pattern**

```bash
sed -n '1,40p' apps/report/src/report/controllers/report.worker.ts
```

- [ ] **Step 2: Write the worker**

```ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { AiSuggestService } from '../services/ai-suggest.service';
import { RedisService } from '../../../infra/redis/redis.service';

interface AiSuggestJob {
  auditId: string;
  reportId: string;
}

@Processor(BULLMQ_QUEUES.AI_SUGGEST_START)
export class AiSuggestWorker extends WorkerHost {
  private readonly logger = new Logger(AiSuggestWorker.name);

  constructor(
    private readonly svc: AiSuggestService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<AiSuggestJob>): Promise<{ count: number }> {
    const { auditId } = job.data;
    this.logger.log(`processing ai-suggest.start for ${auditId}`);
    const suggestions = await this.svc.generate(auditId);
    await this.redis.client().publish(
      'audit.suggestions.done',
      JSON.stringify({ auditId, count: suggestions.length }),
    );
    return { count: suggestions.length };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`ai-suggest.start ${job?.id} failed: ${err.message}`);
    // Intentional: do NOT publish audit.failed. AI suggestion failure must
    // never roll back audit completion. After BullMQ exhausts retries, the
    // Report.aiSuggestions column stays NULL — UI treats that as "not generated".
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/report/src/report/ai-suggest/controllers/ai-suggest.worker.ts
git commit -m "feat(report): add AiSuggestWorker (bullmq ai-suggest.start processor)"
```

---

## Task 14: Implement AiSuggestListener (Redis sub `report.done` → enqueue)

**Files:**
- Create: `apps/report/src/report/ai-suggest/controllers/ai-suggest.listener.ts`

- [ ] **Step 1: Inspect analyze-done.listener.ts as reference (already read in spec)**

- [ ] **Step 2: Write the listener**

```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { RedisService } from '../../../infra/redis/redis.service';

@Injectable()
export class AiSuggestListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiSuggestListener.name);
  private readonly CHANNEL = 'report.done';

  constructor(
    private readonly redis: RedisService,
    @InjectQueue(BULLMQ_QUEUES.AI_SUGGEST_START)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const sub = this.redis.subscriber();
    await sub.subscribe(this.CHANNEL);
    sub.on('message', async (channel, raw) => {
      if (channel !== this.CHANNEL) return;
      try {
        const payload = JSON.parse(raw) as { auditId?: string; reportId?: string };
        if (!payload?.auditId || !payload?.reportId) {
          this.logger.warn(`report.done missing fields, skipping`);
          return;
        }
        if (process.env['SEO_AI_ENABLED'] !== 'true') {
          this.logger.log(`ai-suggest disabled, skipping auditId=${payload.auditId}`);
          return;
        }
        await this.queue.add(
          'ai-suggest',
          { auditId: payload.auditId, reportId: payload.reportId },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        );
        this.logger.log(`enqueued ai-suggest.start for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle report.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
```

- [ ] **Step 3: Verify `report.done` is published by report.worker**

```bash
grep -n "report.done" apps/report/src/report/services/report.service.ts apps/report/src/report/controllers/report.worker.ts
```
Expected: at least one publish call exists. If NOT found, find where audit.completed is published and add a sibling publish of `report.done` with payload `{ auditId, reportId }` — see Task 14b.

- [ ] **Step 4: Commit**

```bash
git add apps/report/src/report/ai-suggest/controllers/ai-suggest.listener.ts
git commit -m "feat(report): add AiSuggestListener (sub report.done → enqueue)"
```

---

## Task 14b: ~~Ensure `report.done` is published~~ — ✅ ĐÃ CÓ, SKIP

> **VERIFIED 2026-05-21:** `report.done` đã được publish ở [report.service.ts:90](../../../apps/report/src/report/services/report.service.ts) (`persistAndPublish`) với payload đầy đủ `{ auditId, reportId, finalScore, classification }`. **Bỏ qua task này** — chỉ chạy Step 1 để xác nhận, KHÔNG thêm publish mới (sẽ gây double-publish).

**Files:**
- (none — verify only)

- [ ] **Step 1: Confirm existing publish call (expect it EXISTS)**

```bash
grep -rn "audit.completed\|report.done" apps/report/src --include="*.ts"
```

- [ ] **Step 2: If `report.done` already published with both ids, SKIP this task entirely. Otherwise, add publish.**

In the file where the report is finalized (after `prisma.report.create`), add right after the existing `audit.completed` publish:

```ts
await this.redis.client().publish(
  'report.done',
  JSON.stringify({ auditId: report.auditId, reportId: report.id }),
);
```

- [ ] **Step 3: Commit (only if changes were needed)**

```bash
git add apps/report/src/report/services/report.service.ts
git commit -m "feat(report): publish report.done with auditId+reportId for ai-suggest"
```

---

## Task 15: Wire AiSuggestModule + register in ReportModule

**Files:**
- Create: `apps/report/src/report/ai-suggest/ai-suggest.module.ts`
- Modify: `apps/report/src/report/report.module.ts`

- [ ] **Step 1: Inspect ReportModule to know how prompt loader + LLM should be wired**

```bash
sed -n '1,80p' apps/report/src/report/report.module.ts
```

- [ ] **Step 2: Create AiSuggestModule**

Create `apps/report/src/report/ai-suggest/ai-suggest.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { createLLM, FileSystemPromptLoader } from '@repo/seo-ai-core';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { RedisModule } from '../../infra/redis/redis.module';
import { AiSuggestService, PROMPT_LOADER, LLM_PROVIDER } from './services/ai-suggest.service';
import { AiSuggestListener } from './controllers/ai-suggest.listener';
import { AiSuggestWorker } from './controllers/ai-suggest.worker';
import * as path from 'node:path';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: BULLMQ_QUEUES.AI_SUGGEST_START }),
  ],
  providers: [
    {
      provide: PROMPT_LOADER,
      useFactory: () => new FileSystemPromptLoader({
        baseDir: path.join(__dirname, 'prompts'),
      }),
    },
    {
      provide: LLM_PROVIDER,
      useFactory: () => createLLM({
        provider: (process.env['SEO_AI_PROVIDER'] as 'anthropic' | 'gemini') ?? 'anthropic',
        model: process.env['SEO_AI_MODEL'] ?? 'claude-haiku-4-5',
      }),
    },
    AiSuggestService,
    AiSuggestListener,
    AiSuggestWorker,
  ],
})
export class AiSuggestModule {}
```

Note: If `SEO_AI_ENABLED !== 'true'`, the listener short-circuits before enqueue and the worker never runs — but the `createLLM` factory still runs at module init, which requires the chosen provider's API key. Mitigation in next step (gate the stub on `SEO_AI_ENABLED`, provider-agnostic).

- [ ] **Step 3: Make LLM_PROVIDER factory tolerate kill-switch off**

Change `LLM_PROVIDER` provider to:
```ts
    {
      provide: LLM_PROVIDER,
      useFactory: () => {
        // Gate ONLY on the kill switch (provider-agnostic). When enabled,
        // createLLM validates the chosen provider's key and fails fast.
        if (process.env['SEO_AI_ENABLED'] !== 'true') {
          // Return a stub. Worker will never be reached because listener gates on SEO_AI_ENABLED.
          return {
            name: 'disabled', providerId: 'disabled', model: 'disabled', modelId: 'disabled',
            invoke: async () => { throw new Error('LLM_PROVIDER stub: SEO_AI_ENABLED is off'); },
            stream: async function* () { /* noop */ },
            countTokens: async () => 0,
          } as unknown as ReturnType<typeof createLLM>;
        }
        return createLLM({
          provider: (process.env['SEO_AI_PROVIDER'] as 'anthropic' | 'gemini') ?? 'anthropic',
          model: process.env['SEO_AI_MODEL'] ?? 'claude-haiku-4-5',
        });
      },
    },
```

- [ ] **Step 4: Register AiSuggestModule in ReportModule**

Open `apps/report/src/report/report.module.ts`. Add to imports array:
```ts
import { AiSuggestModule } from './ai-suggest/ai-suggest.module';
// inside @Module({ imports: [ ..., AiSuggestModule ] })
```

- [ ] **Step 5: Typecheck**

```bash
cd apps/report && npm run check-types
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/report/src/report/ai-suggest/ai-suggest.module.ts \
        apps/report/src/report/report.module.ts
git commit -m "feat(report): wire AiSuggestModule into ReportModule"
```

---

## Task 16: Ensure Dockerfile copies prompts/ folder

**Files:**
- Modify: `apps/report/Dockerfile`

- [ ] **Step 1: Inspect**

```bash
cat apps/report/Dockerfile
```

- [ ] **Step 2: If prompts not yet copied to runtime image**

Find the COPY block for built dist. Right after `COPY --from=builder /app/apps/report/dist ./apps/report/dist` (or similar), add:
```dockerfile
COPY --from=builder /app/apps/report/src/report/ai-suggest/prompts ./apps/report/dist/report/ai-suggest/prompts
```
The exact path depends on tsc output structure. After Task 12, `dist/report/ai-suggest/services/ai-suggest.service.js` will use `path.join(__dirname, 'prompts')` — so prompts/ must sit beside the compiled JS.

Alternative: instead of post-copy, add a build step to copy YAML during compile:
```bash
cd apps/report && find dist/report/ai-suggest -type d | head -3
```
to confirm structure after running `npm run build`. If YAML files don't exist in dist, add to `apps/report/package.json` build script:
```json
"build": "nest build && cp -r src/report/ai-suggest/prompts dist/report/ai-suggest/prompts"
```

- [ ] **Step 3: Test the local build**

```bash
cd apps/report && npm run build && ls dist/report/ai-suggest/prompts/seo-rule-suggestions
```
Expected: `v1.0.0.prompt.yaml` present.

- [ ] **Step 4: Commit**

```bash
git add apps/report/Dockerfile apps/report/package.json
git commit -m "build(report): copy ai-suggest prompts into dist + docker image"
```

---

## Task 17: Add env vars to .env.example + docker-compose

**Files:**
- Modify: `apps/report/.env.example`
- Modify: `.env.docker.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update `apps/report/.env.example`**

Append to file:
```
# AI suggestions. Set SEO_AI_ENABLED=true to enable. Provider: anthropic|gemini.
SEO_AI_ENABLED=false
SEO_AI_PROVIDER=anthropic          # anthropic (default, đã wired) | gemini
SEO_AI_MODEL=claude-haiku-4-5      # nếu gemini → gemini-2.0-flash
ANTHROPIC_API_KEY=                 # bắt buộc khi provider=anthropic
GEMINI_API_KEY=                    # bắt buộc khi provider=gemini
```

- [ ] **Step 2: Update `.env.docker.example`**

Append same block.

- [ ] **Step 3: Update `docker-compose.yml` — `report` service env block**

Find the `report:` service block. In its `environment:` (or `env_file:`), add:
```yaml
      SEO_AI_ENABLED: ${SEO_AI_ENABLED:-false}
      SEO_AI_PROVIDER: ${SEO_AI_PROVIDER:-anthropic}
      SEO_AI_MODEL: ${SEO_AI_MODEL:-claude-haiku-4-5}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/.env.example .env.docker.example docker-compose.yml
git commit -m "chore(report): add SEO_AI_* + GEMINI_API_KEY env wiring"
```

---

## Task 18: Update proto: add AiSuggestion + ai_suggestions field

**Files:**
- Modify: `packages/proto/report/v1/report.proto`

- [ ] **Step 1: Inspect proto**

```bash
cat packages/proto/report/v1/report.proto
```

- [ ] **Step 2: Add message + field**

Add new message near the bottom of the file (after existing messages):
```proto
message AiSuggestion {
  string rule_id = 1;
  string explanation = 2;
  string actionable_fix = 3;
}
```

In the existing `Report` message (the response shape for GetReport), find the next unused field number, then add:
```proto
  repeated AiSuggestion ai_suggestions = <N>;
  string ai_suggestions_generated_at = <N+1>;
```
(Replace `<N>` and `<N+1>` with the next two unused numbers — e.g., if highest field is 18, use 19 and 20.)

- [ ] **Step 3: Regenerate proto outputs**

```bash
cd packages/proto && npm run build
```
Expected: regenerated `.d.ts` includes `aiSuggestions` field.

- [ ] **Step 4: Commit**

```bash
git add packages/proto/report/v1/report.proto packages/proto/dist
git commit -m "feat(proto): add AiSuggestion message + Report.ai_suggestions field"
```

---

## Task 19: Map ai_suggestions in report.grpc.controller.ts

**Files:**
- Modify: `apps/report/src/report/controllers/report.grpc.controller.ts`

- [ ] **Step 1: Find existing GetReport mapping**

```bash
grep -n "GetReport\|aiSuggestions" apps/report/src/report/controllers/report.grpc.controller.ts
```

- [ ] **Step 2: In the response builder for `GetReport`, add the new fields**

Inside the function that builds the response from a `Report` Prisma row:
```ts
const ai = report.aiSuggestions as { items?: Array<{ ruleId: string; explanation: string; actionable_fix: string }>; generatedAt?: string } | null;
const aiSuggestions = ai?.items?.map((it) => ({
  ruleId: it.ruleId,
  explanation: it.explanation,
  actionableFix: it.actionable_fix,
})) ?? [];
const aiSuggestionsGeneratedAt = ai?.generatedAt ?? '';
```
Then include `aiSuggestions` and `aiSuggestionsGeneratedAt` in the returned response object.

- [ ] **Step 3: Typecheck**

```bash
cd apps/report && npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/src/report/controllers/report.grpc.controller.ts
git commit -m "feat(report): expose ai_suggestions via GetReport gRPC"
```

---

## Task 20: Gateway — subscribe `audit.suggestions.done` + emit WS

**Files:**
- Modify: `apps/gateway/src/infra/websocket/progress-subscriber.service.ts` (path THỰC — không phải `src/gateway/`)
- Modify: `apps/gateway/src/infra/websocket/audit.gateway.ts` (thêm `emitSuggestionsDone`)

- [ ] **Step 1: Confirm pattern (wrapper `redis.subscribe(channel, cb)` + emit qua AuditGateway)**

```bash
grep -n "this.redis.subscribe\|this.gateway.emit" apps/gateway/src/infra/websocket/progress-subscriber.service.ts
grep -n "emitProgress\|emitCompleted\|server.to" apps/gateway/src/infra/websocket/audit.gateway.ts
```
Expected: subscriber dùng `this.redis.subscribe('audit.progress', cb)` ... và emit qua `this.gateway.emitX(...)`. Gateway có `emitProgress/emitCompleted/emitFailed` dùng `this.server.to('audit:'+id).emit(...)`.

- [ ] **Step 2: Add `emitSuggestionsDone` to AuditGateway**

Theo đúng pattern của `emitCompleted`:
```ts
emitSuggestionsDone(auditId: string, payload: { auditId: string; count: number }): void {
  this.server.to(`audit:${auditId}`).emit('audit:suggestions-done', payload);
}
```

- [ ] **Step 3: Subscribe + handle in ProgressSubscriberService**

Trong `onModuleInit`, thêm (cạnh `report.done`):
```ts
await this.redis.subscribe('audit.suggestions.done', (data) =>
  this.handleSuggestionsDone(data as { auditId?: string; count?: number }),
);
```
Thêm handler:
```ts
private handleSuggestionsDone(p: { auditId?: string; count?: number }): void {
  if (!p?.auditId) return;
  this.gateway.emitSuggestionsDone(p.auditId, { auditId: p.auditId, count: p.count ?? 0 });
}
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/gateway && npm run check-types
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/infra/websocket/progress-subscriber.service.ts \
        apps/gateway/src/infra/websocket/audit.gateway.ts
git commit -m "feat(gateway): forward audit.suggestions.done as WS event"
```

---

## Task 21: Web — add `ReportAiSuggestion` type + proto map

**Files:**
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/lib/audits/proto-map.ts`

- [ ] **Step 1: Update types.ts**

Add (near `ReportRuleResult`):
```ts
export interface ReportAiSuggestion {
  ruleId: string;
  explanation: string;
  actionableFix: string;
}

export interface ReportDetail {
  // ... existing fields
  aiSuggestions?: ReportAiSuggestion[];
  aiSuggestionsGeneratedAt?: string | null;
}
```
(Merge the additions with the existing `ReportDetail` interface — do NOT duplicate.)

- [ ] **Step 2: Update proto-map.ts**

Find the function mapping the gRPC `Report` response to `ReportDetail`. Add:
```ts
aiSuggestions: (raw.aiSuggestions ?? []).map((s: { ruleId: string; explanation: string; actionableFix: string }) => ({
  ruleId: s.ruleId,
  explanation: s.explanation,
  actionableFix: s.actionableFix,
})),
aiSuggestionsGeneratedAt: raw.aiSuggestionsGeneratedAt || null,
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api/types.ts apps/web/src/lib/audits/proto-map.ts
git commit -m "feat(web): map aiSuggestions from gRPC Report into ReportDetail"
```

---

## Task 22: Web — write failing test for AiSuggestionCard

**Files:**
- Create: `apps/web/test/components/audit-detail/ai-suggestion-card.test.tsx`

- [ ] **Step 1: Inspect existing test pattern**

```bash
ls apps/web/test/components 2>/dev/null && cat apps/web/test/components/score-ring.test.tsx 2>/dev/null | head -25
```

- [ ] **Step 2: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AiSuggestionCard } from '@/components/audit-detail/ai-suggestion-card';

describe('<AiSuggestionCard>', () => {
  it('renders explanation and fix when suggestion provided', () => {
    render(
      <AiSuggestionCard
        suggestion={{
          ruleId: 'title-tag',
          explanation: 'Title too long.',
          actionableFix: 'Shorten to ≤60 chars.',
        }}
      />,
    );
    expect(screen.getByText(/Title too long\./)).toBeInTheDocument();
    expect(screen.getByText(/Shorten to ≤60 chars\./)).toBeInTheDocument();
  });

  it('renders nothing when suggestion is undefined', () => {
    const { container } = render(<AiSuggestionCard suggestion={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders loading skeleton when status="loading"', () => {
    render(<AiSuggestionCard suggestion={undefined} status="loading" />);
    expect(screen.getByText(/AI đang phân tích/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test (FAIL — component doesn't exist)**

```bash
cd apps/web && npx vitest run test/components/audit-detail/ai-suggestion-card.test.tsx
```
Expected: FAIL — module not found.

---

## Task 23: Web — implement AiSuggestionCard

**Files:**
- Create: `apps/web/src/components/audit-detail/ai-suggestion-card.tsx`

- [ ] **Step 1: Inspect a sibling card component for style conventions**

```bash
cat apps/web/src/components/playground/issue-card.tsx 2>/dev/null | head -40
```

- [ ] **Step 2: Implement**

```tsx
"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReportAiSuggestion } from "@/lib/api/types";

export interface AiSuggestionCardProps {
  suggestion: ReportAiSuggestion | undefined;
  status?: "ready" | "loading";
}

export function AiSuggestionCard({ suggestion, status = "ready" }: AiSuggestionCardProps): React.ReactElement | null {
  if (status === "loading") {
    return (
      <Card className="mt-2 border-dashed border-purple-300 bg-purple-50/40 p-3">
        <div className="flex items-center gap-2 text-sm text-purple-700">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>AI đang phân tích...</span>
        </div>
      </Card>
    );
  }
  if (!suggestion) return null;
  return (
    <Card className="mt-2 border-purple-200 bg-purple-50/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">AI Gợi ý</Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-purple-600">Vì sao</div>
          <p className="mt-0.5 text-foreground">{suggestion.explanation}</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-purple-600">Sửa thế nào</div>
          <p className="mt-0.5 text-foreground">{suggestion.actionableFix}</p>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Run test to verify PASS**

```bash
cd apps/web && npx vitest run test/components/audit-detail/ai-suggestion-card.test.tsx
```
Expected: 3/3 PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/audit-detail/ai-suggestion-card.tsx \
        apps/web/test/components/audit-detail/ai-suggestion-card.test.tsx
git commit -m "feat(web): add AiSuggestionCard component"
```

---

## Task 24: Web — integrate AiSuggestionCard into completed-report.tsx

**Files:**
- Modify: `apps/web/src/components/audit-detail/completed-report.tsx`

- [ ] **Step 1: Find where each rule is rendered**

```bash
grep -n "RuleResultRow\|ruleResults\|groupRulesByCategory" apps/web/src/components/audit-detail/completed-report.tsx
```

- [ ] **Step 2: Map suggestions by ruleId near the top of the component body**

Inside the `CompletedReport` function, near where `groupRulesByCategory` is called:
```tsx
import { AiSuggestionCard } from "./ai-suggestion-card";

// ...inside CompletedReport
const suggestionByRuleId = React.useMemo(() => {
  const map = new Map<string, ReportAiSuggestion>();
  for (const s of report.aiSuggestions ?? []) map.set(s.ruleId, s);
  return map;
}, [report.aiSuggestions]);

const suggestionsPending = report.aiSuggestionsGeneratedAt === null || report.aiSuggestionsGeneratedAt === undefined;
```

- [ ] **Step 3: After each `<RuleResultRow>` with failing status, render `<AiSuggestionCard>`**

Locate the JSX that maps over `category.rules`. Where a `<RuleResultRow status="fail|warn" ... />` is rendered, immediately after that element (still inside the loop), render:
```tsx
{(rule.status === 'fail' || rule.status === 'warn') && (
  <AiSuggestionCard
    suggestion={suggestionByRuleId.get(rule.ruleId)}
    status={suggestionsPending ? 'loading' : 'ready'}
  />
)}
```
⚠️ Status web là lowercase (`'fail'/'warn'`) — khớp `CheckStatus`. Key map là `rule.ruleId` (xác nhận tên field trên web rule type ở Task 21; nếu web chỉ có `ruleName` thì map theo field tương ứng gRPC trả về — gRPC `AiSuggestion.rule_id` = `r.ruleId` server-side).

- [ ] **Step 4: Typecheck**

```bash
cd apps/web && npm run check-types
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/audit-detail/completed-report.tsx
git commit -m "feat(web): render AiSuggestionCard under failing rules in audit detail"
```

---

## Task 25: Web — WS listener for `audit:suggestions-done` → invalidate audit query

**Files:**
- Modify: `apps/web/src/hooks/use-audit-websocket.ts` (find the actual filename first)

- [ ] **Step 1: Find the WS hook**

```bash
grep -rln "audit:completed\|useAuditWebSocket\|useAuditSocket" apps/web/src | head -5
```

- [ ] **Step 2: Inspect existing handler**

```bash
sed -n '1,80p' <path-from-step-1>
```

- [ ] **Step 3: Add handler for the new event**

Inside the hook (next to `socket.on('audit:completed', ...)` or similar), add:
```ts
socket.on('audit:suggestions-done', (payload: { auditId: string; count: number }) => {
  if (payload.auditId !== auditId) return;
  queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
});
```
Wrap with the same cleanup pattern as adjacent handlers (`socket.off` in the return).

- [ ] **Step 4: Typecheck**

```bash
cd apps/web && npm run check-types
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-audit-websocket.ts
git commit -m "feat(web): invalidate audit query on audit:suggestions-done WS event"
```

---

## Task 26: Integration test for ai-suggest pipeline (stub LLM, real Prisma)

**Files:**
- Create: `apps/report/test/integration/ai-suggest-pipeline.e2e-spec.ts`

- [ ] **Step 1: Inspect existing integration test pattern**

```bash
sed -n '1,60p' apps/report/test/integration/report-pipeline.e2e-spec.ts
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AiSuggestService, LLM_PROVIDER, PROMPT_LOADER } from '../../src/report/ai-suggest/services/ai-suggest.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { PrismaModule } from '../../src/infra/prisma/prisma.module';
import { FileSystemPromptLoader } from '@repo/seo-ai-core';
import * as path from 'node:path';

describe('ai-suggest pipeline [integration]', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let svc: AiSuggestService;

  beforeAll(async () => {
    process.env.SEO_AI_ENABLED = 'true';
    const stubLLM = {
      name: 'stub', providerId: 'stub', model: 'stub', modelId: 'stub',
      invoke: async () => ({
        content: JSON.stringify({
          suggestions: [
            { ruleId: 'title-tag', explanation: 'Title is too long.', actionable_fix: 'Shorten to under 60 chars.' },
          ],
        }),
        usage: { prompt: 50, completion: 30, total: 80 },
        model: 'stub',
        finishReason: 'stop',
      }),
      stream: async function* () { /* noop */ },
      countTokens: async () => 0,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        AiSuggestService,
        {
          provide: PROMPT_LOADER,
          useFactory: () => new FileSystemPromptLoader({
            baseDir: path.join(__dirname, '..', '..', 'src', 'report', 'ai-suggest', 'prompts'),
          }),
        },
        { provide: LLM_PROVIDER, useValue: stubLLM },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);
    svc = moduleRef.get(AiSuggestService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({});
  });

  it('persists suggestions to Report.aiSuggestions for failing rules', async () => {
    const created = await prisma.report.create({
      data: {
        auditId: '00000000-0000-0000-0000-000000000001',
        url: 'https://example.com',
        domain: 'example.com',
        finalScore: 72.5,
        classification: 'good',
        totalIssues: 1,
        criticalIssues: 1,
        warnIssues: 0,
        passCount: 0,
        analysisSnapshot: {
          ruleResults: [
            { ruleId: 'title-tag', ruleName: 'Title Tag', category: 'meta', status: 'fail', weight: 9, message: 'too long', suggestion: null },
          ],
        } as object,
        cwvSnapshot: {} as object,
      },
    });

    const out = await svc.generate('00000000-0000-0000-0000-000000000001');
    expect(out).toHaveLength(1);

    const fresh = await prisma.report.findUnique({ where: { id: created.id } });
    const ai = fresh!.aiSuggestions as { items: unknown[]; generatedAt: string; model: string };
    expect(ai.items).toHaveLength(1);
    expect(ai.generatedAt).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run integration test (requires REPORT_DATABASE_URL pointing to a test DB)**

```bash
cd apps/report && REPORT_DATABASE_URL=$REPORT_TEST_DATABASE_URL npx vitest run test/integration/ai-suggest-pipeline.e2e-spec.ts
```
Expected: 1/1 PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/report/test/integration/ai-suggest-pipeline.e2e-spec.ts
git commit -m "test(report): add ai-suggest pipeline integration test"
```

---

## Task 27: End-to-end smoke + manual verification

- [ ] **Step 1: Set up env**

```bash
cd "$(git rev-parse --show-toplevel)"
echo "SEO_AI_ENABLED=true" >> .env.docker
# Default provider = anthropic. Set the key for whichever provider you choose:
echo "SEO_AI_PROVIDER=anthropic" >> .env.docker
echo "SEO_AI_MODEL=claude-haiku-4-5" >> .env.docker
echo "ANTHROPIC_API_KEY=<your-key>" >> .env.docker
# …or for Gemini: SEO_AI_PROVIDER=gemini, SEO_AI_MODEL=gemini-2.0-flash, GEMINI_API_KEY=<key>
```
(Dùng key đã **rotate mới**, KHÔNG dùng key từng lộ trong chat.)

- [ ] **Step 2: Bring stack up**

```bash
npm run docker:up
```
Wait for all services healthy.

- [ ] **Step 3: Run smoke**

```bash
npm run e2e:smoke
```
Expected: smoke passes, audit completes.

- [ ] **Step 4: Query Postgres directly to verify aiSuggestions populated**

```bash
docker compose exec postgres-report psql -U seo -d seo_report -c \
  "SELECT id, ai_suggestions->'items' FROM reports ORDER BY created_at DESC LIMIT 1;"
```
Expected: a JSON array of suggestion items (or `[]` if all rules passed).

- [ ] **Step 5: Browser verification**

Open `http://localhost:3001/en/audits/<latest-audit-id>`. Verify:
- Failing rule rows have a purple "AI Gợi ý" card beneath them
- Card shows "Vì sao" and "Sửa thế nào" sections
- WS push: trigger a fresh audit, watch the card appear after ~5–10s (loading skeleton first)

- [ ] **Step 6: Verify kill switch**

Set `SEO_AI_ENABLED=false`, restart `apps/report`, run a new audit. Confirm:
- `Report.ai_suggestions` row has `error: "disabled"` (or stays null per implementation)
- UI shows no AI card (and no loading skeleton)
- Audit completes normally

- [ ] **Step 7: Commit any final tweaks discovered**

```bash
git status
# If anything needs final fix, commit with message: "fix(<scope>): <what>"
```

---

## Self-Review (executed by plan author)

**Spec coverage (vs `2026-05-19-ai-issue-suggestions-design.md`):**
- §3 Pipeline: covered Tasks 14 (listener), 13 (worker), 12 (service), 20 (gateway WS)
- §4.1 Gemini adapter: Tasks 1–5
- §4.2 ai-suggest module: Tasks 9–17
- §4.3 Migration: Task 7
- §4.4 Shared constants: Task 6
- §4.5 Gateway WS: Task 20
- §4.6 Proto: Tasks 18–19
- §4.7 Web UI: Tasks 21–25
- §4.8 Env: Task 17
- §6 Error handling: GuardrailError branch in Task 12, retries in Task 14 (`attempts: 3, backoff`), kill switch in 11+14+15
- §7 Security: `actionableFix` mapped from snake_case to camelCase server-side (Task 19), no key logging (worker logs only auditId)
- §8 Testing: unit (11–12), integration (26), web RTL (22–23), smoke (27) — all covered. L4 explicitly out of scope per spec.

**Placeholder scan:** No "TBD" / "implement later" / unrendered code. Every code step shows the actual code.

**Type consistency:**
- `Suggestion.actionable_fix` in Zod (snake_case) — server-side
- `ReportAiSuggestion.actionableFix` in TS (camelCase) — web-side
- Mapping happens explicitly in `report.grpc.controller.ts` (Task 19) and `proto-map.ts` (Task 21). Documented and consistent.
- `LLM_PROVIDER` / `PROMPT_LOADER` symbols defined in `ai-suggest.service.ts` (Task 12), used in `ai-suggest.module.ts` (Task 15) and integration test (Task 26). Identical names.
- `BULLMQ_QUEUES.AI_SUGGEST_START` added in Task 6, referenced by Tasks 13, 14, 15.

No gaps detected.

---

## Execution Handoff

Plan complete and saved. Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks
2. **Inline Execution** — Execute tasks in this session with checkpoints

Auto-decision per user directive: **Subagent-Driven**, starting with Task 1 when ready.
