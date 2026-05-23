# AI Issue Suggestions — Design Spec

**Date:** 2026-05-19 · **Revised:** 2026-05-21 (đối chiếu codebase thực tế)
**Owner:** Nguyễn Minh Đức
**Status:** Revised — ready for implementation

> **⚠️ Revision 2026-05-21 — Reality reconciliation.** Bản gốc viết trước khi đối chiếu code. Các điểm sau ĐÃ được verify và sửa trong spec này:
> - `CheckStatus` enum là **lowercase** (`'pass'|'warn'|'fail'`, [packages/shared/src/index.ts:12](../../../packages/shared/src/index.ts)) — KHÔNG dùng `'FAIL'/'WARN'`. Code dùng enum `CheckStatus.FAIL/WARN`.
> - Prompt YAML phải theo shape của `FileSystemPromptLoader`: `id/version/variables[]/metadata{owner}/system/user` — KHÔNG phải `messages:` array (loader sẽ reject). Xem §4.2.
> - `AnalyzeRuleResult` ([analyze-result.interface.ts](../../../apps/report/src/report/domain/analyze-result.interface.ts)) đã có field `ruleId` thật + `suggestion: string|null` tĩnh — dùng `r.ruleId`, và AI suggestion **bổ sung** (không xoá) suggestion tĩnh.
> - `report.done` được publish ở [report.service.ts:90](../../../apps/report/src/report/services/report.service.ts) với payload `{ auditId, reportId, finalScore, classification }` — đã đủ, KHÔNG cần thêm publish.
> - Gateway subscriber thực ở [apps/gateway/src/infra/websocket/progress-subscriber.service.ts](../../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts) và dùng `this.redis.subscribe(channel, cb)` + emit qua `AuditGateway`, KHÔNG phải `sub.on('message')` + `this.io`.
> - **Provider: hỗ trợ CẢ Anthropic (đã wired sẵn) + Gemini, chọn qua `SEO_AI_PROVIDER`.** Default `anthropic` (zero new dep). Gemini model dùng `gemini-2.0-flash` (1.5-flash đang bị deprecate).

## 1. Mục tiêu

Sau khi 1 audit hoàn tất, hệ thống dùng LLM (provider chọn qua env — Anthropic Claude Haiku mặc định, hoặc Gemini Flash) để sinh **gợi ý sửa cụ thể** cho từng SEO rule failing (status `fail` hoặc `warn`), trả về cho UI hiển thị bên dưới mỗi rule trong trang chi tiết audit. AI suggestion **bổ sung** cho field `suggestion` tĩnh có sẵn trên mỗi rule (không thay thế).

**Không trong phạm vi (NOT in scope):**
- Sinh executive summary tổng audit
- Sinh code snippet HTML/markdown (chỉ explanation + actionable text)
- Per-rule on-demand regenerate (chỉ chạy 1 lần khi audit done)
- Provider OpenAI/Ollama (chỉ Anthropic + Gemini cho MVP)
- Caching theo URL/content hash

## 2. Quyết định kiến trúc

| Dimension | Quyết định | Lý do |
|---|---|---|
| Granularity | Per-failing-rule | UI map 1-1, dễ kiểm soát, dễ A/B |
| Trigger timing | Async sau `report.done` | Không block audit, lỗi LLM không kéo audit fail |
| Worker host | `apps/report` (new module `ai-suggest`) | Đã có analysisSnapshot, không cần service mới |
| LLM batching | Single batched call | 1 retry, ~1.5–3k token, code đơn giản |
| Suggestion shape | `{ ruleId, explanation, actionable_fix }` | Minimal, token thấp, không hallucinate code |
| Persistence | Cột `aiSuggestions JSONB` trên `Report` | 1 migration, dễ query, đủ cho MVP |
| Provider abstraction | CẢ `AnthropicAdapter` (đã có) + `GeminiAdapter` (mới), chọn qua `SEO_AI_PROVIDER` | Tận dụng `ILLMProvider` + prompt loader + Zod parser; swap không sửa code |
| Provider default | `anthropic` + `claude-haiku-4-5` | Đã wired sẵn, không thêm dependency; Gemini là tuỳ chọn rẻ hơn |
| Input cap | Top 20 failing rules sort by `weight` desc | Bound prompt size, ưu tiên critical |
| Kill switch | env `SEO_AI_ENABLED=true|false` | Tắt tính năng nếu Gemini xuống/key hết hạn |

## 3. Kiến trúc tổng quan

```
report.worker
   │  publish 'report.done'
   ▼
ai-suggest.listener (Redis sub 'report.done')
   │  BullMQ enqueue 'ai-suggest.start' { auditId, reportId }
   ▼
ai-suggest.worker  (apps/report/src/report/ai-suggest/)
   │  1. Read Report + analysisSnapshot from Postgres
   │  2. Filter rule_results WHERE status IN (FAIL, WARN), sort by weight desc, limit 20
   │  3. Build prompt via @repo/seo-ai-core:
   │       FileSystemPromptLoader → render 'seo-rule-suggestions' v^1.0.0
   │  4. createLLM({ provider: SEO_AI_PROVIDER, model: SEO_AI_MODEL }).invoke()
   │  5. parseStructured(raw, SuggestionsSchema) — Zod validate
   │  6. UPDATE Report SET ai_suggestions = $1 WHERE id = $reportId
   │  7. Redis publish 'audit.suggestions.done' { auditId, count }
   ▼
gateway/progress-subscriber.service
   └─ WebSocket emit 'audit.suggestions:done' → web client refetches report
```

## 4. Components

### 4.1 `@repo/seo-ai-core` — thêm GeminiAdapter

**Files mới:**
- `src/llm/adapters/gemini.adapter.ts` — implement `ILLMProvider` dùng `@langchain/google-genai` (`ChatGoogleGenerativeAI`)
- Update `src/llm/provider.ts`:
  - `LLMProviderName = 'openai' | 'anthropic' | 'gemini' | 'ollama'`
  - `REGISTRY` thêm `['gemini', GeminiAdapter]`
- Update `package.json` dependencies: `@langchain/google-genai`
- Update README: bảng env vars thêm `GEMINI_API_KEY`

**Adapter contract:**
- Constructor đọc `cfg.apiKey || process.env.GEMINI_API_KEY`, throw `LLMError` nếu thiếu
- `invoke()` dùng `client.invoke(toLangChainMessages(req.messages))`, map qua `toLLMResponse()` (existing mapper)
- `stream()`, `countTokens()` parity với AnthropicAdapter

**Test:** `test/llm/gemini.adapter.spec.ts` — mock `ChatGoogleGenerativeAI`, verify happy path + missing-key error + `LLMError` wrapping.

### 4.2 `apps/report` — module ai-suggest

**Files mới (folder `apps/report/src/report/ai-suggest/`):**

```
ai-suggest/
├── ai-suggest.module.ts
├── controllers/
│   ├── ai-suggest.listener.ts      # Redis sub 'report.done' → BullMQ enqueue
│   └── ai-suggest.worker.ts        # BullMQ 'ai-suggest.start' processor
├── services/
│   ├── ai-suggest.service.ts       # orchestration: load → prompt → LLM → persist
│   └── suggestion.schema.ts        # Zod schema
└── prompts/
    └── seo-rule-suggestions/
        └── v1.0.0.prompt.yaml
```

**Zod schema (`suggestion.schema.ts`):**

```ts
export const SuggestionItemSchema = z.object({
  ruleId: z.string(),
  explanation: z.string().min(10).max(300),
  actionable_fix: z.string().min(10).max(400),
});

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionItemSchema).min(0).max(20),
});

export type Suggestion = z.infer<typeof SuggestionItemSchema>;
```

**Prompt template (YAML — strict semver filename).** ⚠️ Phải theo shape `FileSystemPromptLoader` yêu cầu: `id`, `version`, `variables[]`, `metadata{owner}`, `system` (optional), `user` (required) — KHÔNG dùng `messages:` array (loader `assertTemplateShape` sẽ throw `PromptError`):

```yaml
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
  { "suggestions": [ { "ruleId": "...", "explanation": "...", "actionable_fix": "..." } ] }
  Constraints:
  - Use the EXACT ruleId from the input.
  - Do NOT include code blocks, comments, or any prose outside the JSON.
  - Keep each text field under 300 characters.
  - If no rules are provided, output {"suggestions": []}.
user: |
  URL: {{url}}
  Failing rules ({{failingCount}}):
  {{{failingRulesJson}}}
```

`failingRulesJson` is built by the service as a JSON-stringified array of `{ ruleId, ruleName, category, status, weight, message }` (dùng `r.ruleId` thật từ `AnalyzeRuleResult`) — triple-stash because it's library-constructed, not user input. URL is `{{url}}` (HTML-escaped) — defensive even though it's already validated upstream. Loader render trả `{ messages, hash }`; service truyền `rendered.messages` vào `llm.invoke`.

**Service flow (`ai-suggest.service.ts`):**

```ts
async generate(auditId: string): Promise<Suggestion[]> {
  if (process.env.SEO_AI_ENABLED !== 'true') return [];

  const report = await prisma.report.findUnique({ where: { auditId } });
  if (!report) throw new Error(`report not found for audit ${auditId}`);

  // Reuse the report's own domain interface — AnalyzeResult.ruleResults.
  const snap = report.analysisSnapshot as unknown as AnalyzeResult;
  const failing = (snap?.ruleResults ?? [])
    // CheckStatus is lowercase ('fail'|'warn'). Use the enum, never 'FAIL'/'WARN'.
    .filter(r => r.status === CheckStatus.FAIL || r.status === CheckStatus.WARN)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);

  if (failing.length === 0) return [];

  const rendered = await this.promptLoader.render(
    'seo-rule-suggestions',
    {
      url: report.url,
      failingCount: failing.length,
      failingRulesJson: JSON.stringify(failing.map(r => ({
        ruleId: r.ruleId, ruleName: r.ruleName,   // r.ruleId is a real field
        category: r.category, status: r.status,
        weight: r.weight, message: r.message,
      }))),
    },
    { version: '^1.0.0' },
  );

  const res = await this.llm.invoke({ messages: rendered.messages });
  const parsed = parseStructured(res.content, SuggestionsSchema);

  await prisma.report.update({
    where: { id: report.id },
    data: {
      aiSuggestions: {
        items: parsed.suggestions,
        generatedAt: new Date().toISOString(),
        model: process.env.SEO_AI_MODEL ?? 'claude-haiku-4-5',
        promptHash: rendered.hash,
      },
    },
  });

  return parsed.suggestions;
}
```

### 4.3 Database migration

**File:** `apps/report/prisma/migrations/<timestamp>_add_report_ai_suggestions/migration.sql`

```sql
ALTER TABLE reports
ADD COLUMN ai_suggestions JSONB NULL;
```

**Schema update (`schema.prisma`):**
```prisma
model Report {
  ...
  aiSuggestions Json?    @map("ai_suggestions") @db.JsonB
  ...
}
```

Default `NULL` — báo cho UI biết "chưa có suggestion (đang sinh hoặc bị tắt)". Empty array `[]` = không có failing rules. Phân biệt rõ 2 trạng thái.

### 4.4 Shared constants

**Update `packages/shared/src/index.ts`:**

```ts
export const BULLMQ_QUEUES = {
  ...existing,
  AI_SUGGEST_START: 'ai-suggest.start',
} as const;
```

Pub/sub channel `audit.suggestions.done` — không cần hằng vì chỉ 2 chỗ dùng (publisher + subscriber) và là implementation detail của report ↔ gateway. Có thể thêm `REDIS_CHANNELS` enum sau nếu cần.

### 4.5 Gateway WS push

**File:** `apps/gateway/src/infra/websocket/progress-subscriber.service.ts` (path thực — KHÔNG phải `src/gateway/`)
- Trong `onModuleInit`, thêm `await this.redis.subscribe('audit.suggestions.done', (data) => this.handleSuggestionsDone(data))` — theo đúng pattern wrapper `RedisService.subscribe(channel, cb)` đang dùng cho `audit.progress/completed/failed/report.done`.
- Handler emit qua `AuditGateway` (KHÔNG dùng `this.io.to(...)` trực tiếp). Thêm method `emitSuggestionsDone(auditId, payload)` vào [audit.gateway.ts](../../../apps/gateway/src/infra/websocket/audit.gateway.ts) phát Socket.IO event `'audit:suggestions-done'` `{ auditId, count }` tới room `audit:${auditId}`.

### 4.6 gRPC proto

**File:** `packages/proto/report/v1/report.proto`
- Thêm field vào message `Report`:
  ```proto
  message AiSuggestion {
    string rule_id = 1;
    string explanation = 2;
    string actionable_fix = 3;
  }
  repeated AiSuggestion ai_suggestions = 20;
  string ai_suggestions_generated_at = 21;  // ISO timestamp, empty when not yet generated
  ```
- Regenerate `.d.ts` qua `npm run proto:gen`

### 4.7 Web UI

**File:** `apps/web/src/components/audit-detail/completed-report.tsx`
- Sau mỗi `<RuleResultRow status="fail|warn" />` đang failing, render component mới `<AiSuggestionCard />` (nếu suggestion cho `ruleId` tồn tại)
- `<AiSuggestionCard />` (new, `apps/web/src/components/audit-detail/ai-suggestion-card.tsx`):
  - Header: badge "AI Gợi ý" + icon Sparkles
  - Body: 2 sections "Vì sao" (explanation) + "Sửa thế nào" (actionable_fix)
  - Loading state: skeleton khi `aiSuggestions === null` (đang sinh) — show "AI đang phân tích..."
  - Empty state: nếu rule failing nhưng không có suggestion match → hide (không show empty card)
- WS listener (`useAuditWebSocket`) handle event `'audit:suggestions-done'` → invalidate React Query cache cho audit detail → refetch.

### 4.8 Env vars

Thêm vào `.env.docker.example` + `apps/report/.env.example`:

```
# AI suggestions. Bật bằng SEO_AI_ENABLED=true. Provider chọn anthropic|gemini.
SEO_AI_ENABLED=false
SEO_AI_PROVIDER=anthropic          # anthropic (default, đã wired) | gemini
SEO_AI_MODEL=claude-haiku-4-5      # gemini → gemini-2.0-flash
ANTHROPIC_API_KEY=                 # bắt buộc nếu provider=anthropic
GEMINI_API_KEY=                    # bắt buộc nếu provider=gemini
```

`docker-compose.yml` → service `report`: thêm các env tương ứng (cả `ANTHROPIC_API_KEY` lẫn `GEMINI_API_KEY`, chỉ cần set key của provider đang dùng).

## 5. Data flow chi tiết

```
1. report.worker hoàn tất → publish 'report.done' { auditId, reportId, finalScore }
2. ai-suggest.listener nhận 'report.done':
   - Nếu SEO_AI_ENABLED=false → skip (log: "ai-suggest disabled")
   - Else: enqueue BullMQ 'ai-suggest.start' { auditId, reportId }
3. ai-suggest.worker xử lý:
   - Load Report (analysisSnapshot)
   - Filter + sort + cap rules (status lowercase: fail/warn)
   - Build prompt, call LLM (provider theo SEO_AI_PROVIDER)
   - parseStructured → Zod validate
   - UPDATE Report.aiSuggestions
   - Publish 'audit.suggestions.done' { auditId, count }
4. gateway/progress-subscriber emit WS 'audit:suggestions-done'
5. Web client refetch GET /audits/:id → render <AiSuggestionCard> per failing rule
```

## 6. Error handling

| Lỗi | Xử lý |
|---|---|
| API key của provider thiếu (`ANTHROPIC_API_KEY`/`GEMINI_API_KEY`) | Throw `LLMError` từ adapter constructor → worker fail → BullMQ retry, sau đó dead-letter (Report.aiSuggestions = NULL, audit vẫn done) |
| LLM timeout/network | `retriable: true` → BullMQ retry với exp backoff (3 attempts: 1s, 5s, 25s) |
| `GuardrailError` (Zod fail) | Log raw payload (no PII vì input chỉ là failing rules), retry 1x với prompt thêm "valid JSON only" reminder; nếu vẫn fail → store empty `{items: [], error: 'parse_failed'}` |
| Rate limit (429) | Retry như network error |
| `SEO_AI_ENABLED=false` | Skip silently, Report.aiSuggestions = NULL |
| 0 failing rules | Store `{items: [], generatedAt, model}` — không call LLM |

**Invariant:** AI suggest failure **không bao giờ** làm audit fail. Audit đã `completed` trước khi pipeline AI chạy.

## 7. Security

- API key chỉ đọc qua `process.env.ANTHROPIC_API_KEY` / `process.env.GEMINI_API_KEY` — không log, không response
- Prompt input là `failingRulesJson` (do library build từ DB) + `url` (user input đã validate ở gateway). Không có user-controlled Handlebars template (tuân theo invariant của seo-ai-core)
- Output Zod-validated trước khi persist → không nuốt JSON exotic
- Log: chỉ log `{ auditId, model, promptHash, tokenUsage, latencyMs }`, KHÔNG log prompt content hay output content (có thể chứa URL/domain riêng tư của user)

## 8. Testing strategy

| Layer | Test |
|---|---|
| seo-ai-core unit | `gemini.adapter.spec.ts` — mock `ChatGoogleGenerativeAI` |
| ai-suggest unit | `ai-suggest.service.spec.ts` — mock prompt loader + LLM + Prisma; test happy path, empty failing, Zod fail, env disabled |
| ai-suggest integration | `ai-suggest-pipeline.e2e-spec.ts` — stub LLM, real Prisma test DB, listener → worker → DB roundtrip |
| Web unit (RTL) | `ai-suggestion-card.test.tsx` — render with/without suggestion, loading, empty |
| L4 (fe-be-integration) | KHÔNG cần — không touch auth/session/OAuth/rate-limit. Đủ với L1–L3 + e2e:smoke regression |
| Manual smoke | Trigger 1 audit thật trên `npm run e2e:smoke`, verify Report.aiSuggestions populated, UI render |

## 9. Operational considerations

- **Cost ceiling:** 1 audit ≈ 1.5–3k input + 1–2k output token Gemini 1.5 Flash ≈ $0.0001 — negligible. 1000 audits/ngày ≈ $0.10/ngày.
- **Latency:** thêm 3–8s sau audit done (background, không user-visible nếu UI handle loading state)
- **Rollback:** set `SEO_AI_ENABLED=false` trong env, restart `apps/report`. Migration không cần rollback (cột nullable)
- **Observability:** thêm Pino log key `aiSuggestLatencyMs`, `aiSuggestModel`, `aiSuggestStatus` cho mỗi run. Dashboards xếp sau.

## 10. Open questions / Future

- [ ] Per-rule regenerate (user click "Try again" khi suggestion không hợp ngữ cảnh) — sau MVP
- [ ] A/B test prompt versions (v1.0.0 vs v1.1.0) — dùng `promptHash` đã có
- [ ] Cache theo `(promptHash, failingRulesHash)` để re-run audit cùng URL không gọi lại LLM — sau MVP nếu chi phí tăng
- [ ] Streaming UI (chunk by chunk) — chưa cần, latency 3–8s OK
- [ ] Multi-locale (sinh suggestion tiếng Việt khi user locale=vi) — thêm var `{{locale}}` vào prompt sau

## 11. Acceptance criteria

- [ ] `seo-ai-core` export `GeminiAdapter`; `createLLM({provider:'gemini'})` VÀ `createLLM({provider:'anthropic'})` đều work; `SEO_AI_PROVIDER` switch không sửa code
- [ ] `apps/report` có module ai-suggest, hook đầy đủ vào `report.module.ts`
- [ ] Migration tạo cột `ai_suggestions` JSONB nullable
- [ ] 1 audit hoàn tất → trong < 10s, Report.aiSuggestions có items array ≥ 1 (khi có failing rules)
- [ ] Web audit detail page render `<AiSuggestionCard>` dưới mỗi rule FAIL/WARN có suggestion
- [ ] WS event `audit:suggestions-done` push tới client → auto refetch
- [ ] `SEO_AI_ENABLED=false` → toàn pipeline skip, audit vẫn done bình thường
- [ ] Unit + integration tests pass, không regression e2e:smoke
