# `@repo/seo-ai-core` MVP — Library Architecture Design

**Date**: 2026-04-19
**Author**: Claude (via `superpowers:brainstorming` + `/auto-decide`)
**Status**: Draft — awaiting user review
**Scope**: Approach B (Adapters + Facade) × Workflow L1 (LARGE-lite, skip `/cso` `/qa` `/canary`) × Consumer priority = `apps/seo-analyzer`
**Package**: `@repo/seo-ai-core` at `packages/seo-ai-core/`

---

## Problem

Milestone M8 (and every future AI-assisted feature — code review, rule explanation, refactor suggestion, audit narrative) requires LLM calls across multiple SEO microservices (`apps/seo-analyzer`, `apps/report`, eventually `apps/gateway` proxying for `apps/web`). The current state is:

1. **No shared LLM layer.** Each service would independently install `@langchain/*`, hand-roll prompts, and invent its own retry / error / guardrail code — leading to divergent token accounting, inconsistent output parsing, and prompt fragmentation.
2. **Direct LangChain coupling is a trap.** LangChain's public API (`Runnable`, `BaseMessage`, chain-composition helpers) has frequent breaking changes. If consumers import LangChain types directly, a library upgrade ripples into every app.
3. **No prompt governance.** Prompts scattered in service code = impossible to version, A/B test, diff across deployments, or audit for PII / policy violations.
4. **No structured output contract.** Without a shared guardrail layer, each chain repeats the "parse-JSON-from-LLM-with-fallbacks" boilerplate, and schema drift between producer (prompt) and consumer (Zod schema) is caught only in production.

The first concrete consumer is `apps/seo-analyzer`: a chain that reads a file's content + the project's SEO rules (currently hard-coded in `apps/seo-analyzer/src/analyzer/domain/rules/**`) + related context docs, then emits structured review findings with line numbers and suggested patches. That chain needs LLM access, a versioned prompt, a retriever for rule/doc context, and a Zod-validated output — exactly the seven slices carved out for this MVP.

## Goals

1. Ship `@repo/seo-ai-core` as an **internal npm workspace package** with a public API made only of library-owned interfaces — consumers never `import` from `@langchain/*`.
2. Deliver **7 MVP slices**: `llm/` (factory + Anthropic adapter), `prompt/` (loader + renderer + registry with YAML storage + semver), `chains/base`, `chains/rag`, `retrievers/memory` (deterministic fake-embedding cosine), `guardrails/` (Zod output parser + policy), minimal `observability/logger` interface.
3. Enforce the **adapter boundary** via ESLint `no-restricted-imports`: `@langchain/*` is legal ONLY in `src/llm/adapters/**`.
4. Prove the design end-to-end with a **smoke example** that wires a real `seo-analyzer` rule set into a RAG chain against a fake LLM adapter — runs offline, zero API cost, deterministic CI.
5. Keep MVP **runnable before M8 starts**: one work-week of effort, 4 atomic commit waves, exit gates defined.

## Non-Goals

- **No agents, no tool registry, no ReAct executor.** `createAgent` / `createTool` / builtin file-reader etc. are Phase 2, not MVP.
- **No OpenAI / Ollama adapters.** MVP ships Anthropic only. Adding providers later is a **single-file change** by design — that is the adapter pattern's whole point.
- **No pgvector / Qdrant.** Only `memory.retriever.ts` with fake embeddings. Real vector DB is Phase 3.
- **No streaming chain.** `IChain.invoke()` only; `stream()` is deferred. `apps/report` streaming use case waits for M9.
- **No OpenTelemetry / tracing.** Only a `Logger` interface + pino adapter so consumers can inject; OTel bridge is Phase 4.
- **No prompt registry CLI** (`ai-core prompt diff`, `ai-core prompt lint`). Defer until 3+ prompts exist in production.
- **No modifications to `apps/seo-analyzer` source.** The smoke example LIVES IN the library's `examples/` folder. Actual integration into `seo-analyzer` is a separate phase with its own plan.
- **No `packages/proto` changes.** Library is pure TypeScript, no gRPC surface.

## Design

### § 1. Approach: Adapters + Facade (Approach B)

Public API = interfaces owned by this library:
- `ILLMProvider`, `LLMRequest`, `LLMResponse`, `Message`, `TokenUsage` (in `llm/types.ts`)
- `IPromptLoader`, `PromptTemplate`, `RenderedPrompt` (in `prompt/types.ts`)
- `IChain<TInput,TOutput>`, `ChainContext` (in `chains/types.ts`)
- `IRetriever`, `RetrievedDoc` (in `retrievers/types.ts`)
- `Logger` (in `observability/logger.ts`)

Concrete implementations:
- `createLLM(cfg)` factory → returns `ILLMProvider`
- `FileSystemPromptLoader` implements `IPromptLoader`
- `createRagChain(cfg)` factory → returns `IChain`
- `MemoryRetriever` implements `IRetriever`
- `parseStructured<T>(raw, zodSchema)` function + `applyPolicy(req)` function

The **only** file permitted to `import` from `@langchain/*` is `src/llm/adapters/anthropic.adapter.ts` (and later siblings). Enforced by ESLint rule, not by honor system.

### § 2. File plan

| File | Action | Rationale |
|---|---|---|
| `packages/seo-ai-core/package.json` | **CREATE** | Workspace package manifest. Private. Matches `@repo/shared` conventions (`main: ./dist/index.js`, tsc build). |
| `packages/seo-ai-core/tsconfig.json` | **CREATE** | Extends `@repo/typescript-config` (same pattern as shared/proto). |
| `packages/seo-ai-core/vitest.config.ts` | **CREATE** | Matches apps convention; unit tests only, no e2e. |
| `packages/seo-ai-core/.eslintrc.cjs` | **CREATE** | Extends `@repo/eslint-config`; adds `no-restricted-imports` forbidding `@langchain/*` outside `src/llm/adapters/**`. |
| `packages/seo-ai-core/README.md` | **CREATE** | Public API, 3 code examples (simple LLM call, RAG chain, prompt loader), env var list. |
| `packages/seo-ai-core/src/index.ts` | **CREATE** | Public barrel. Exports ONLY: interfaces, factories, errors, `FileSystemPromptLoader`, `MemoryRetriever`, `parseStructured`, `applyPolicy`. |
| `packages/seo-ai-core/src/errors/index.ts` | **CREATE** | `AiCoreError` (base) + `LLMError`, `PromptError`, `GuardrailError`, `ChainError`, `RetrieverError`. |
| `packages/seo-ai-core/src/observability/logger.ts` | **CREATE** | `Logger` interface (debug/info/warn/error). `noopLogger`, `createPinoLogger()` adapter. |
| `packages/seo-ai-core/src/llm/types.ts` | **CREATE** | `ILLMProvider`, `LLMRequest`, `LLMResponse`, `Message`, `TokenUsage`, `LLMChunk`. No LangChain types. |
| `packages/seo-ai-core/src/llm/provider.ts` | **CREATE** | `createLLM(cfg)` + provider registry (`openai`/`anthropic`/`ollama` ids reserved, only `anthropic` wired). |
| `packages/seo-ai-core/src/llm/adapters/anthropic.adapter.ts` | **CREATE** | Wraps `ChatAnthropic` from `@langchain/anthropic`. Implements `ILLMProvider`. |
| `packages/seo-ai-core/src/llm/adapters/_mappers.ts` | **CREATE** | `Message` → `BaseMessage` + `AIMessage` → `LLMResponse` converters. Isolates LangChain symbol leaks. |
| `packages/seo-ai-core/src/prompt/types.ts` | **CREATE** | `PromptTemplate`, `RenderedPrompt`, `IPromptLoader`. |
| `packages/seo-ai-core/src/prompt/loader.ts` | **CREATE** | `FileSystemPromptLoader`: semver resolve + YAML load + Handlebars render + hash. |
| `packages/seo-ai-core/src/prompt/renderer.ts` | **CREATE** | `renderTemplate(str, vars)` — Handlebars in strict mode (unknown helpers/vars throw). |
| `packages/seo-ai-core/src/prompt/templates/code-review/v1.prompt.yaml` | **CREATE** | Seed template for seo-analyzer smoke example. `variables: [filePath, fileContent, rules, contextDocs]`. |
| `packages/seo-ai-core/src/chains/types.ts` | **CREATE** | `IChain<TInput,TOutput>`, `ChainContext` (with `traceId`, `signal`, `logger`, `callbacks`). |
| `packages/seo-ai-core/src/chains/base.chain.ts` | **CREATE** | `createBaseChain(cfg)`: logger + retry + error mapping wrapper. Used by `rag.chain.ts`. |
| `packages/seo-ai-core/src/chains/rag.chain.ts` | **CREATE** | `createRagChain<TIn,TOut>(cfg)`: retrieve → render prompt → LLM invoke → Zod parse. |
| `packages/seo-ai-core/src/retrievers/types.ts` | **CREATE** | `IRetriever`, `RetrievedDoc`, `RetrieverSearchOptions`. |
| `packages/seo-ai-core/src/retrievers/memory.retriever.ts` | **CREATE** | In-memory store. Fake embeddings via token-hash → fixed-dim vector + cosine similarity. Deterministic. |
| `packages/seo-ai-core/src/guardrails/types.ts` | **CREATE** | `Policy`, `PolicyResult`, `OutputParseResult<T>`. |
| `packages/seo-ai-core/src/guardrails/output-parser.ts` | **CREATE** | `parseStructured<T>(raw, zodSchema)`: strip markdown fences → `JSON.parse` → Zod validate → 1-pass JSON repair if parse fails → throw `GuardrailError` with raw payload on final fail. |
| `packages/seo-ai-core/src/guardrails/policy.ts` | **CREATE** | `applyPolicy(req, policy)`: enforces `maxTokens`, `maxMessages`, PII regex stripping. Pure function. |
| `packages/seo-ai-core/test/llm.provider.spec.ts` | **CREATE** | Tests factory routing + error on unknown provider. Uses fake adapter, no network. |
| `packages/seo-ai-core/test/prompt.loader.spec.ts` | **CREATE** | Semver resolve, missing vars throws, hash stability, deprecated warning. |
| `packages/seo-ai-core/test/retrievers.memory.spec.ts` | **CREATE** | Cosine ranking, topK, empty store. |
| `packages/seo-ai-core/test/guardrails.output-parser.spec.ts` | **CREATE** | Fence strip, repair pass, Zod validation fail. |
| `packages/seo-ai-core/test/chains.rag.spec.ts` | **CREATE** | End-to-end with fake LLM + memory retriever + real loader + real Zod schema. |
| `packages/seo-ai-core/test/_fixtures/fake-llm.adapter.ts` | **CREATE** | Test-only `ILLMProvider` returning scripted responses keyed by prompt hash. Lives in `test/_fixtures`, NOT in `src/`. |
| `packages/seo-ai-core/test/llm.anthropic.integration.spec.ts` | **CREATE** | Live Anthropic call. Skipped via `describe.skipIf(!process.env.ANTHROPIC_API_KEY)`. Never runs in CI by default. |
| `packages/seo-ai-core/test/examples.smoke.spec.ts` | **CREATE** | Vitest wrapper that imports + runs `examples/seo-analyzer-smoke.ts` and snapshots the structured output. Runs in CI. |
| `packages/seo-ai-core/examples/seo-analyzer-smoke.ts` | **CREATE** | Uses fake LLM. Loads 3 real rules from `apps/seo-analyzer/src/analyzer/domain/rules/meta/*.rule.ts`. Invokes `rag.chain` with `code-review@1.0.0`. Prints structured findings. |
| `packages/seo-ai-core/CHANGELOG.md` | **CREATE** | Follows Keep-a-Changelog. First entry: `0.1.0 — MVP`. |

Total: **32 files created** (19 src incl. seed YAML + 7 tests/fixtures + 1 example + 6 config/docs).

### § 3. Public API surface (locked for MVP)

```typescript
// packages/seo-ai-core/src/index.ts

// Interfaces — re-exported directly from each module's types.ts
export type {
  ILLMProvider, LLMRequest, LLMResponse, Message, TokenUsage, LLMChunk,
} from './llm/types';
export type { IPromptLoader, PromptTemplate, RenderedPrompt } from './prompt/types';
export type { IChain, ChainContext } from './chains/types';
export type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from './retrievers/types';
export type { Policy, PolicyResult } from './guardrails/types';
export type { Logger } from './observability/logger';

// Factories + classes
export { createLLM, type LLMConfig, type LLMProviderName } from './llm/provider';
export { FileSystemPromptLoader, type PromptLoaderOptions } from './prompt/loader';
export { createRagChain, type RagChainConfig } from './chains/rag.chain';
export { createBaseChain } from './chains/base.chain';
export { MemoryRetriever } from './retrievers/memory.retriever';

// Guardrail functions
export { parseStructured } from './guardrails/output-parser';
export { applyPolicy } from './guardrails/policy';

// Observability
export { noopLogger, createPinoLogger } from './observability/logger';

// Errors (consumers use instanceof for retry/log decisions)
export {
  AiCoreError, LLMError, PromptError, ChainError,
  GuardrailError, RetrieverError,
} from './errors';
```

**Not exported**: anything LangChain-typed, `_mappers.ts`, internal renderer, `test/_fixtures/*`.

### § 4. Task breakdown — L1 waves

**Workflow**: `/office-hours → /plan-eng-review → gsd:discuss-phase → gsd:plan-phase → gsd:execute-phase (4 waves) → /review`. Skip `/cso`, `/qa`, `/canary` (no UI, no deploy, no security-sensitive code paths beyond input validation which Zod covers).

**Wave 1 — Foundations** (parallel-safe, no deps between tasks):
- **T1** — Scaffold package: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.cjs` with `no-langchain-leak` rule, empty `src/index.ts`, `README.md` stub. Verify `npm run build --filter=@repo/seo-ai-core` emits empty dist. Verify `npm run lint` catches a deliberately planted `import ... from '@langchain/core'` in a non-adapter file.
- **T2** — `errors/index.ts` + `observability/logger.ts` (interface + noopLogger + pino adapter). Unit test for error taxonomy (`GuardrailError extends AiCoreError`).
- **T3** — All 5 `*/types.ts` files (`llm`, `prompt`, `chains`, `retrievers`, `guardrails`). No runtime code. TypeScript compile test only. (Public types are re-exported directly from each module's `types.ts` via `src/index.ts` — no separate barrel file.)

**Wave 2 — Core units** (parallel, all depend on W1):
- **T4** — `llm/provider.ts` + `llm/adapters/anthropic.adapter.ts` + `_mappers.ts`. Deps added: `@langchain/anthropic`, `@langchain/core`. Integration test gated by `ANTHROPIC_API_KEY` (skip if absent); unit test uses fake adapter to validate factory routing.
- **T5** — `prompt/loader.ts` + `prompt/renderer.ts` + seed `templates/code-review/v1.prompt.yaml`. Deps: `yaml`, `semver`, `handlebars`. Test: semver ranges, missing variable throws, deprecated flag warns, render hash stability.
- **T6** — `retrievers/memory.retriever.ts` (fake-embedding helper inlined as a private function inside this file — not a separate file). Test: cosine ranking monotonic, topK clamping, empty-store behaviour.
- **T7** — `guardrails/output-parser.ts` + `guardrails/policy.ts`. Deps: `zod`. Test: JSON fence strip, repair pass on trailing comma, Zod schema violation maps to `GuardrailError`, policy enforces `maxTokens`.

**Wave 3 — Composition** (depends on W2):
- **T8** — `chains/base.chain.ts`: error mapping + logger injection + 1 retry on transient `LLMError`.
- **T9** — `chains/rag.chain.ts`: compose retriever → prompt loader → LLM → parser. Test with fake LLM + `MemoryRetriever` + real `FileSystemPromptLoader` pointing at `templates/`.

**Wave 4 — Integration + exit**:
- **T10** — `examples/seo-analyzer-smoke.ts`: reads 3 actual rule files from `apps/seo-analyzer/src/analyzer/domain/rules/meta/` (read-only import — no modifications), feeds them as docs into `MemoryRetriever`, calls `rag.chain` with fake LLM returning a canned structured response, asserts findings match snapshot. Runnable via `node --loader tsx packages/seo-ai-core/examples/seo-analyzer-smoke.ts`.
- **T11** — Finalize `README.md`, `CHANGELOG.md`, run `/review`, fix blockers.

Each task = 1 atomic commit. Per `feedback_commit_scope_split`, all tasks use `feat(seo-ai-core):` prefix, separate from any `.claude/` tooling commits.

### § 5. Dependencies (explicit)

Added to `packages/seo-ai-core/package.json`:

| Package | Kind | Reason |
|---|---|---|
| `@langchain/core` | `dependencies` | Types + minimal runtime for adapter. Pinned `^0.3.0` (latest stable at 2026-04). |
| `@langchain/anthropic` | `dependencies` | `ChatAnthropic` client. |
| `zod` | `dependencies` | Output schemas + input validation. |
| `yaml` | `dependencies` | YAML prompt files. |
| `semver` | `dependencies` | Prompt version resolution. |
| `handlebars` | `dependencies` | Prompt templating, strict mode. |
| `pino` | `peerDependencies` (optional) | Logger adapter — consumer installs if used. |
| `vitest` | `devDependencies` | Tests. |
| `@types/semver`, `@types/node` | `devDependencies` | Types. |
| `@repo/typescript-config` | `devDependencies` | Shared tsconfig. |
| `@repo/eslint-config` | `devDependencies` | Shared lint config. |

**No new root-level deps.** All deps are package-local.

### § 6. Testing strategy

- **Unit tests (Vitest)** in `test/*.spec.ts` — 5 files, one per module group. Coverage target: `guardrails/**` and `chains/rag.chain.ts` ≥ 80% branch; others ≥ 60% line.
- **Fake adapter** (`test/_fixtures/fake-llm.adapter.ts`) returns scripted responses keyed by prompt hash → deterministic.
- **Integration test** (`test/llm.anthropic.integration.spec.ts`) — live call to Anthropic. Skipped unless `ANTHROPIC_API_KEY` env set. Never runs in CI by default.
- **Smoke (`examples/seo-analyzer-smoke.ts`)** runs in CI as a vitest test (`examples/*.smoke.spec.ts` wrapper) using fake LLM.
- **Lint gate** for the boundary: dedicated ESLint run (`npm run lint --filter=@repo/seo-ai-core`) fails if any file outside `src/llm/adapters/**` imports `@langchain/*`.

### § 7. Exit criteria (MVP done when ALL pass)

1. `npm run build --filter=@repo/seo-ai-core` → clean (tsc strict mode, no errors).
2. `npm run check-types` (turbo) across monorepo → no new errors introduced.
3. `npm run lint --filter=@repo/seo-ai-core` → zero warnings. `no-langchain-leak` rule active.
4. `npm run test --filter=@repo/seo-ai-core` → all green including smoke wrapper. Integration test skipped (expected).
5. `/review` → no HIGH-severity findings.
6. `packages/seo-ai-core/README.md` shows 3 working code samples (LLM call, prompt render, RAG chain).
7. `examples/seo-analyzer-smoke.ts` runs end-to-end and prints a structured `{ summary, issues[] }` payload.

### § 8. Out-of-scope (explicit freeze list)

To prevent scope creep during execution, the following are **frozen** — any mid-flight request to add them forces workflow re-classification (per `WORKFLOW.md` § Size Escalation):

- Agent executor, tool registry, tool builtins
- Additional LLM providers (OpenAI, Ollama, local)
- Real embeddings, pgvector/Qdrant retrievers
- Streaming API on chains
- OTel / LangSmith tracing
- Prompt registry CLI, prompt linting
- Integration into `apps/seo-analyzer` source (that is a SEPARATE phase)
- Public npm publish (stays private workspace-local)

## Risks / open items

1. **LangChain version churn** — `@langchain/core` had breaking renames between 0.2 and 0.3. Pin exact minor; plan Phase 2 audit on next upgrade. Mitigation: integration test on every `@langchain/*` bump.
2. **Fake embeddings may hide retriever bugs.** Acceptable for MVP because retriever is tested for ranking monotonicity, not semantic quality. Real-retriever validation is Phase 3's job.
3. **Prompt YAML vs TS tradeoff** — YAML loses type checking, but gains versioning + diffability + swap-without-recompile. Accepted. Strict Handlebars + variable declaration partially recovers safety.
4. **Handlebars CVE surface** — library has had template-injection CVEs in user-rendered contexts. We render trusted templates only; still, enforce strict mode and document the "do not accept user-provided templates" invariant in README.
5. **`applyPolicy` PII stripping is shallow (regex).** MVP policy is a nudge, not a guarantee. Real redaction is Phase 4 with a dedicated PII library.
6. **No streaming = report service blocked for long audits.** Acceptable for MVP because first consumer (`seo-analyzer`) doesn't stream. `apps/report` lands in M9 with streaming in Phase 2.

## References

- Brainstorm transcript: current session (2026-04-19)
- Workflow tier spec: `.claude/workflow/WORKFLOW.md`, `.claude/workflow/WORKFLOW-LARGE.md`
- Monorepo conventions: `packages/shared/package.json`, `packages/proto/package.json`, `turbo.json`
- Consumer target: `apps/seo-analyzer/src/analyzer/domain/rules/**`
- Memory constraint: `project_fe_be_integration_skill.md` (not applicable — this is a library, not FE/BE wiring)
- Memory constraint: `feedback_commit_scope_split.md` (applied — all commits `feat(seo-ai-core):`)
