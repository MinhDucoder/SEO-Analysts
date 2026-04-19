# Changelog

All notable changes to `@repo/seo-ai-core` are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-04-19 — MVP

### Added

- `createLLM(cfg)` factory + Anthropic adapter (only file allowed to
  import `@langchain/*`).
- `FileSystemPromptLoader` with semver version resolution, YAML parsing,
  Handlebars strict-mode rendering, sha256 prompt-hash for trace
  correlation.
- `createBaseChain(cfg)` with structured logging, AbortSignal threading,
  1 retry on transient `LLMError` only.
- `createRagChain(cfg)` composing Retriever → PromptLoader → LLM →
  `parseStructured` (Zod-validated structured output).
- `MemoryRetriever` with deterministic fake embeddings (token-hash
  cosine) for offline CI smoke testing.
- `parseStructured<S>(raw, schema)` — fence strip + JSON repair pass +
  Zod validation; throws `GuardrailError` carrying raw payload on final
  failure.
- `applyPolicy(req, policy)` — clamps `maxTokens` DOWN, truncates messages
  keeping last N, redacts PII regex matches.
- Error taxonomy: `AiCoreError` base → `LLMError`, `PromptError`,
  `ChainError`, `GuardrailError`, `RetrieverError`.
- `Logger` interface with `noopLogger` default + `createPinoLogger`
  adapter (pino is a true peerDep — optional).
- ESLint adapter-boundary rule blocks `@langchain/*` outside
  `src/llm/adapters/**`.
- Smoke example wires `apps/seo-analyzer` rule files into a RAG chain
  end-to-end (offline, deterministic).

### Known follow-ups (deferred to future phases)

- Structured `code` field on `LLMError` for retry-policy discrimination
  (Phase 2 retry policy).
- `tsconfig.test.json` for strict type-checking of `test/**/*.ts`
  (currently picked up at vitest runtime via esbuild only).
- Per-call temperature override in Anthropic adapter (LangChain
  `ChatAnthropicCallOptions` doesn't expose this; constructor-only).
- Turbo `no-undeclared-env-vars` warnings for `ANTHROPIC_API_KEY` in
  `anthropic.adapter.ts` and the integration spec. Known; informational
  only (build/test still pass). Resolve by adding `ANTHROPIC_API_KEY` to
  `turbo.json`'s global env list in a future tidy-up commit.
- Test coverage gap on `opts`-forwarding for the 4 error subclasses
  other than `GuardrailError`. Base class correctness is proven, but
  `raw` + `cause` propagation is only explicitly asserted on
  `GuardrailError`. Add parameterised test in Phase 2 test-debt pass.
