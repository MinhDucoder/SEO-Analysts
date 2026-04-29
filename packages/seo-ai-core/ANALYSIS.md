# Báo cáo phân tích package `@repo/seo-ai-core`

## 1. Tổng quan (Executive Summary)

**`@repo/seo-ai-core`** là **lớp abstraction trung tâm cho toàn bộ tương tác AI/LLM** trong monorepo SEO Platform. Nó đóng vai trò **"facade + adapter"** trước LangChain: mọi app (`gateway`, `seo-analyzer`, `report`…) khi cần gọi LLM đều đi qua package này chứ **không được import trực tiếp `@langchain/*`** (có ESLint rule chặn cứng tại [eslint.config.mjs:30-41](eslint.config.mjs#L30-L41)).

**Vấn đề nó giải quyết:**
- **Tránh vendor lock-in**: đổi `@langchain/anthropic` → SDK khác chỉ cần sửa 1 file adapter.
- **Prompt-as-code**: prompt được version hóa bằng semver, lưu YAML, render strict-mode Handlebars — thay vì prompt rải rác trong code.
- **Output an toàn**: LLM trả JSON được validate bằng Zod; sai schema → `throw GuardrailError` chứ không nuốt lỗi.
- **Observability thống nhất**: mọi chain invocation đều có structured log, retry policy, abort signal, trace id.

**Layer trong hệ thống:** Đây là **Shared Infrastructure Package** — ngang hàng với `@repo/shared`, `@repo/proto`. Không phải domain, không phải UI — là **platform layer** cho AI.

**Khi nào dùng:**
- Bất cứ khi một service cần gọi LLM (code review, SEO suggestion, report summarization, v.v.)
- Khi cần load prompt versioned + render có validation variables
- Khi cần RAG (retriever + context injection + structured output)

**Status hiện tại:** MVP `0.1.0` — chỉ Anthropic, chỉ in-memory retriever (fake embedding), không streaming agent/tool, không pgvector.

---

## 2. Kiến trúc & Cấu trúc thư mục

```
packages/seo-ai-core/
├── src/
│   ├── index.ts                    # Public API surface — re-exports duy nhất
│   ├── llm/                        # LLM facade + adapter
│   │   ├── types.ts                # ILLMProvider, LLMRequest/Response, Message
│   │   ├── provider.ts             # createLLM() factory + REGISTRY
│   │   └── adapters/
│   │       ├── anthropic.adapter.ts    # File DUY NHẤT được import @langchain/*
│   │       └── _mappers.ts             # Message ↔ LangChain BaseMessage
│   ├── prompt/                     # Prompt-as-code
│   │   ├── types.ts                # PromptTemplate, IPromptLoader
│   │   ├── loader.ts               # FileSystemPromptLoader (semver + YAML + cache)
│   │   ├── renderer.ts             # Handlebars strict render
│   │   └── templates/              # Prompt YAML thực tế (ship cùng package)
│   │       └── code-review/v1.0.0.prompt.yaml
│   ├── chains/                     # Orchestration
│   │   ├── types.ts                # IChain, ChainContext
│   │   ├── base.chain.ts           # Logger + retry + error mapping wrapper
│   │   └── rag.chain.ts            # Retriever → Prompt → LLM → parseStructured
│   ├── retrievers/
│   │   ├── types.ts                # IRetriever, RetrievedDoc
│   │   └── memory.retriever.ts     # Fake-embedding in-memory (MVP)
│   ├── guardrails/                 # Input/Output safety
│   │   ├── types.ts                # Policy, PolicyResult
│   │   ├── policy.ts               # Clamp tokens + truncate messages + redact PII
│   │   └── output-parser.ts        # parseStructured<Zod>
│   ├── observability/logger.ts     # Logger interface + noop + pino bridge
│   └── errors/index.ts             # AiCoreError → 5 subclasses
├── test/                           # Vitest unit + integration + fixtures
├── examples/                       # Smoke test wiring thực tế với apps/seo-analyzer
├── eslint.config.mjs               # Adapter-boundary rule (load-bearing)
└── package.json                    # Deps: @langchain/*, handlebars, zod, semver, yaml
```

**Dependency direction (nghiêm ngặt một chiều):**

```
index.ts
  ↓ re-exports
chains/  ─────────→ guardrails/  →  errors/
  │   ↓              ↑
  │  retrievers/     │
  ↓   ↓              │
llm/  prompt/  →  observability/
  ↓      ↓
@langchain/*   handlebars/yaml/semver
(chỉ adapters/)
```

**Không có circular dependency.** `errors/` là lá, `observability/` gần lá. `chains/` là tầng cao nhất, kéo mọi thứ khác xuống.

---

## 3. Flow hoạt động chính

### Entry point
Mọi consumer chỉ import từ **`@repo/seo-ai-core`** (barrel re-export trong [src/index.ts](src/index.ts)). Tuyệt đối không import đường dẫn sâu.

### Flow dữ liệu qua `createRagChain` (flow quan trọng nhất)

```
Consumer input (TInput)
     │
     ▼
[1] buildQuery(input) ──► retriever.search() ──► RetrievedDoc[]
                                                       │
     ┌─────────────────────────────────────────────────┘
     ▼
[2] contextDocs = docs.map(...).join('\n\n')      ← build context string
     │
     ▼
[3] buildVariables(input, contextDocs) ──► vars
     │
     ▼
[4] promptLoader.render(id, vars, {version})
      ├─ resolveVersion(range) ──► semver.maxSatisfying()
      ├─ load YAML + parse + validate shape
      ├─ renderTemplate(system, vars) via Handlebars strict
      ├─ renderTemplate(user, vars)
      └─ hash = sha256(id + version + messages).slice(0,16)
     │
     ▼  RenderedPrompt { messages, hash }
[5] llm.invoke({ messages, metadata: { promptHash } }, signal)
      └─ AnthropicAdapter ──► ChatAnthropic ──► HTTP Anthropic API
     │
     ▼  LLMResponse { content: "JSON string..." }
[6] parseStructured(content, outputSchema)
      ├─ stripFence() — bỏ ```json ... ```
      ├─ JSON.parse
      ├─ (fallback) repairJson() — smart quotes + trailing comma
      └─ zodSchema.safeParse
     │
     ▼  TOutput (validated) — or throw GuardrailError
```

**`base.chain` wrap toàn bộ `run` function** với: logger start/success/failed, retry (chỉ `LLMError` vì `GuardrailError`/`PromptError` là deterministic retry không giúp gì), abort signal forward, error mapping về `ChainError`.

### Các design pattern được dùng

| Pattern | Vị trí | Mục đích |
|---|---|---|
| **Adapter + Facade** | `AnthropicAdapter` wrap `ChatAnthropic` | Cô lập LangChain khỏi consumer |
| **Factory** | `createLLM`, `createBaseChain`, `createRagChain` | Hide construction complexity |
| **Registry** | `REGISTRY` Map trong `provider.ts` | Plug-in provider qua `registerLLMProvider` |
| **Strategy** | `IRetriever`, `IPromptLoader`, `ILLMProvider` | Swap implementation (memory → pgvector) |
| **Template Method** | `createBaseChain` + inject `run` callback | Reuse retry/log/error logic |
| **Decorator (logic)** | `rag.chain` compose base.chain | Thêm retriever/prompt layer mà không sửa base |
| **Strict parser** | `parseStructured` fail-fast | Không cho garbage đi xuống downstream |

---

## 4. Thành phần quan trọng

| File | Vai trò | Ghi chú |
|---|---|---|
| [src/index.ts](src/index.ts) | **Public API duy nhất** | Mọi thứ khác là private |
| [src/llm/adapters/anthropic.adapter.ts](src/llm/adapters/anthropic.adapter.ts) | **Adapter boundary**, file DUY NHẤT được import `@langchain/*` | Đổi provider = sửa 1 file |
| [src/llm/provider.ts](src/llm/provider.ts) | `createLLM` factory + registry | Extension point cho plugin |
| [src/prompt/loader.ts](src/prompt/loader.ts) | Semver version resolve + YAML load + cache + hash | Chốt chặn "prompt-as-code" |
| [src/prompt/renderer.ts](src/prompt/renderer.ts) | Handlebars strict (throw on unknown var) | Có JSDoc security cảnh báo |
| [src/chains/base.chain.ts](src/chains/base.chain.ts) | Retry + log + error mapping wrapper | **Hạt nhân** của mọi chain |
| [src/chains/rag.chain.ts](src/chains/rag.chain.ts) | Compose Retriever + Prompt + LLM + Parser | Dùng chung cho hầu hết use case |
| [src/guardrails/output-parser.ts](src/guardrails/output-parser.ts) | `parseStructured` — fence strip + repair + Zod | Ranh giới tin cậy output |
| [src/guardrails/policy.ts](src/guardrails/policy.ts) | Clamp tokens + truncate + redact PII | Chưa được tự động apply trong chain (giả định: consumer gọi tay) |
| [src/errors/index.ts](src/errors/index.ts) | Taxonomy 6 class | `instanceof` là API chính cho retry decision |
| [eslint.config.mjs](eslint.config.mjs) | Adapter-boundary rule (disable `only-warn`) | **Load-bearing** — mất nó thì kiến trúc thủng |

**Quan hệ giữa các thành phần:**
- `rag.chain` **aggregates** `IRetriever` + `IPromptLoader` + `ILLMProvider` + Zod schema → delegate xuống `base.chain`
- `base.chain` **depends on** `Logger` + `errors/` + `ChainContext`
- `FileSystemPromptLoader` **depends on** `renderTemplate` + `PromptTemplate` type
- `AnthropicAdapter` **depends on** `_mappers` để không leak LangChain types ra public

---

## 5. Điểm mạnh & Điểm cần cải thiện

### Điểm mạnh

1. **Adapter boundary rõ ràng và được enforce**: ESLint rule ở [eslint.config.mjs:30-41](eslint.config.mjs#L30-L41) chặn `@langchain/*` ngoài `src/llm/adapters/**` — kiến trúc không phụ thuộc vào kỷ luật con người.
2. **Type surface locked**: `index.ts` là single export file; consumer không thể chạm bộ phận trong. Refactor nội bộ an toàn.
3. **Fail-fast, fail-loud**: `parseStructured` throw `GuardrailError` kèm raw payload — debug trace đầy đủ.
4. **Retry policy có nghĩa**: chỉ retry `LLMError` (transient), không retry `GuardrailError`/`PromptError` (deterministic). Không gì tệ hơn retry mù.
5. **Prompt versioning semver + sha256 hash**: trace chính xác prompt nào đã gọi LLM nào — critical cho reproducibility AI.
6. **Optional peer dep pino**: không ép consumer cài pino; `noopLogger` default hoạt động ngay.
7. **Handlebars strict + HTML escape mặc định**: giảm vector prompt injection từ user input.

### Điểm cần cải thiện / quan tâm

1. **`MemoryRetriever` dùng fake embedding token-hash** — không phải semantic. Ranking dựa word-overlap, dễ miss synonym. Đúng với MVP nhưng **KHÔNG được dùng production**. Cần phase 3: pgvector/Qdrant.
2. **`applyPolicy` không được auto-apply trong chain**. Consumer phải gọi tay — rủi ro quên. Nên wrap vào `base.chain` tùy chọn.
3. **`LLMError` chưa có field `code` phân loại** (rate-limit vs network vs auth). Retry hiện chỉ all-or-nothing — đã ghi nhận ở CHANGELOG "known follow-ups".
4. **Không có streaming support ở `IChain`** — chỉ `llm.stream()` raw. Consumer muốn streaming phải bypass chain, mất retry/log.
5. **`_mappers.toLLMResponse` bỏ im lặng các block không phải text** (tool_use, image). Khi `finishReason === 'tool_call'`, `content` có thể rỗng — consumer phải đọc `raw.content` (là `AIMessage` của LangChain, phá adapter boundary). Giả định MVP chấp nhận text-only; cần agent/tool API ở Phase 2.
6. **In-memory prompt cache không có invalidation** — file thay đổi ở disk, process đang chạy không biết. Dev workflow phải restart.
7. **Giả định `TInput extends { query: string }` ngầm** trong `rag.chain` khi không truyền `buildQuery` — TypeScript không enforce được hoàn toàn; runtime error nếu quên. Lỗi cast `(input as { query: string }).query`.
8. **`redactPatterns` tạo `RegExp` mới mỗi message × mỗi pattern** — O(N·M) tốn compile. Với high-throughput nên precompile một lần trong `applyPolicy`.

---

## 6. Ví dụ minh họa cách sử dụng

### Use case: SEO Analyzer service gọi AI review 1 file rule

```typescript
import { z } from 'zod';
import {
  createLLM,
  createRagChain,
  FileSystemPromptLoader,
  MemoryRetriever,
  GuardrailError,
  LLMError,
} from '@repo/seo-ai-core';

// 1. Định nghĩa schema output — Zod là ranh giới tin cậy
const ReviewSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    rule: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    line: z.number().int().nonnegative(),
    suggestion: z.string(),
  })),
});

// 2. Wire chain
const chain = createRagChain({
  name: 'seo-rule-review',
  promptId: 'code-review',          // → templates/code-review/v1.0.0.prompt.yaml
  promptVersion: '^1.0.0',          // semver range
  llm: createLLM({
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    defaultMaxTokens: 2048,
  }),
  promptLoader: new FileSystemPromptLoader({ baseDir: './prompts' }),
  retriever: new MemoryRetriever([
    { id: 'r1', content: 'Always set meta description between 50–160 chars.' },
    { id: 'r2', content: 'Canonical link prevents duplicate content.' },
  ]),
  outputSchema: ReviewSchema,
  buildVariables: (input, contextDocs) => ({
    filePath: input.filePath,
    fileContent: input.fileContent,
    rules: input.rules,
    contextDocs,
  }),
  topK: 3,
});

// 3. Invoke — chain sẽ tự retry LLM 1 lần nếu transient, throw GuardrailError nếu JSON sai schema
try {
  const review = await chain.invoke(
    {
      query: 'Review meta-description rule',
      filePath: 'src/rules/meta-description.rule.ts',
      fileContent: sourceCode,
      rules: 'meta-description, title-tag',
    },
    { traceId: 'req-123', signal: AbortSignal.timeout(30_000) },
  );
  console.log(review.summary);
} catch (err) {
  if (err instanceof GuardrailError) {
    // LLM trả JSON sai → log `err.raw` để điều tra prompt
  } else if (err instanceof LLMError) {
    // Network/API → có thể retry ở tầng caller
  }
  throw err;
}
```

**Điểm then chốt:** consumer **không thấy LangChain** đâu cả. Đổi từ Anthropic sang OpenAI chỉ cần sửa `createLLM({ provider: 'openai', ... })` sau khi phase 5 có adapter tương ứng.

---

## 7. Tóm tắt 5 câu để trình bày miệng

> `@repo/seo-ai-core` là **platform layer cho AI** trong monorepo — đóng vai trò facade trước LangChain để toàn bộ service gọi LLM qua một API duy nhất, không bị vendor lock-in. Kiến trúc xoay quanh bốn trụ: **LLM adapter** (hiện chỉ Anthropic, ESLint chặn import LangChain ngoài boundary), **Prompt loader** (YAML versioned semver + Handlebars strict + sha256 hash để trace), **RAG chain** (compose retriever + prompt + LLM + Zod output parser) và **guardrails** (policy clamp/redact + output-parser fail-fast). Flow điển hình: input → retriever → render prompt → LLM invoke → `parseStructured` → trả TOutput đã validate; `base.chain` bao ngoài để retry chỉ `LLMError`, log structured, forward AbortSignal. Điểm mạnh là **boundary enforce bằng lint chứ không bằng niềm tin**, error taxonomy rõ cho retry decision, và prompt-as-code traceable theo hash. Hạn chế ở MVP 0.1.0: retriever là fake embedding (không semantic, chỉ dùng test/CI), chưa có streaming/agent/tool, chưa có `code` phân loại trong `LLMError` — đã được roadmap Phase 2-5 ghi nhận.

---

### Giả định đã nêu trong báo cáo

- `applyPolicy` không được auto-wrap trong chain (quan sát từ code; có thể là chủ ý spec).
- Consumer phải dùng `buildQuery` nếu `TInput` không có `query: string` (ngầm định runtime, TS không enforce chặt).
- `AIMessage` raw leak là compromise cho tool-use use case trong tương lai.
