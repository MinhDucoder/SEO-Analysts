# @repo/seo-ai-core

Internal LangChain wrapper for the SEO Platform monorepo. Public API surface
is owned by this library — consumers never `import` from `@langchain/*`.

## Why

- Single source of truth for LLM access, prompt versioning, structured-output
  parsing, retrieval, and observability across `apps/*`.
- Adapter+facade pattern: swap `@langchain/anthropic` → another SDK by
  changing one file (`src/llm/adapters/anthropic.adapter.ts`).
- Prompt-as-code: YAML files versioned via semver, loaded at runtime,
  rendered with strict Handlebars (HTML-escaped by default).
- Zod-validated output: chains throw `GuardrailError` on schema mismatch,
  not silent garbage downstream.

## Status

MVP (`0.1.0`) — Anthropic only, in-memory retriever (deterministic fake
embeddings), no streaming, no agents/tools yet.

See [design spec](../../docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md)
for full scope and the locked freeze list.

## Install

Internal workspace package — already linked via npm workspaces. In a
consumer's `package.json`:

```json
{ "dependencies": { "@repo/seo-ai-core": "*" } }
```

## Configuration

| Env var | Used by | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | `AnthropicAdapter` | Yes (or pass `cfg.apiKey`) |

## Examples

### 1. Direct LLM call

```typescript
import { createLLM } from '@repo/seo-ai-core';

const llm = createLLM({
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  defaultMaxTokens: 1024,
});

const res = await llm.invoke({
  messages: [{ role: 'user', content: 'Summarize SEO best practices in 1 sentence.' }],
});
console.log(res.content, res.usage);
```

### 2. Prompt loader + render

Prompt files live under `<baseDir>/<id>/v<version>.prompt.yaml` (strict semver
in the filename — `v1.0.0.prompt.yaml`, NOT `v1.prompt.yaml`).

```typescript
import { FileSystemPromptLoader } from '@repo/seo-ai-core';

const loader = new FileSystemPromptLoader({
  baseDir: './prompts',
});

const rendered = await loader.render(
  'code-review',
  { filePath: 'foo.ts', fileContent: '...', rules: '...', contextDocs: '...' },
  { version: '^1.0.0' },
);
console.log(rendered.messages);  // [{ role: 'system', content: '...' }, { role: 'user', content: '...' }]
console.log(rendered.hash);       // stable 16-char sha256 prefix for tracing
```

### 3. RAG chain with structured output

```typescript
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import {
  createRagChain, createLLM, FileSystemPromptLoader, MemoryRetriever,
} from '@repo/seo-ai-core';

const Schema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    rule: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    line: z.number(),
    suggestion: z.string(),
  })),
});

const chain = createRagChain({
  name: 'code-review',
  promptId: 'code-review',
  promptVersion: '^1.0.0',
  retriever: new MemoryRetriever([
    { id: 'rule-1', content: 'Always include alt text on images.' },
    { id: 'rule-2', content: 'Canonical link tags prevent duplicate content.' },
  ]),
  llm: createLLM({ provider: 'anthropic', model: 'claude-sonnet-4-6' }),
  promptLoader: new FileSystemPromptLoader({ baseDir: './prompts' }),
  outputSchema: Schema,
  buildVariables: (input: { query: string; filePath: string; fileContent: string; rules: string },
                   contextDocs) => ({
    filePath: input.filePath,
    fileContent: input.fileContent,
    rules: input.rules,
    contextDocs,
  }),
  topK: 5,
});

const review = await chain.invoke({
  query: 'Review src/foo.ts for SEO rule violations',
  filePath: 'src/foo.ts',
  fileContent: await fs.readFile('src/foo.ts', 'utf-8'),
  rules: 'image-alt, canonical-link',
});
```

## Public API

### Factories

- `createLLM(cfg)` → `ILLMProvider`
- `createRagChain(cfg)` → `IChain<TIn, TOut>`
- `createBaseChain(cfg)` → `IChain<TIn, TOut>`
- `registerLLMProvider(name, ctor)` — register a custom adapter

### Classes

- `FileSystemPromptLoader` — implements `IPromptLoader`
- `MemoryRetriever` — implements `IRetriever`

### Functions

- `parseStructured<S>(raw, zodSchema)` — strip fences, parse, repair, Zod validate
- `applyPolicy(req, policy)` — clamp tokens, truncate messages, redact PII
- `renderTemplate(source, vars)` — Handlebars strict-mode render
- `noopLogger`, `createPinoLogger(pino)` — Logger constructors

### Types

`ILLMProvider`, `IChain`, `IPromptLoader`, `IRetriever`, `Logger`,
`Message`, `LLMRequest`, `LLMResponse`, `TokenUsage`, `LLMChunk`,
`PromptTemplate`, `RenderedPrompt`, `ChainContext`, `RetrievedDoc`,
`Policy`, `PolicyResult`, `OutputParseResult<T>`.

### Errors (use `instanceof` for retry / log decisions)

`AiCoreError` (base) → `LLMError`, `PromptError`, `ChainError`,
`GuardrailError`, `RetrieverError`.

## Security invariants

- **Do not render user-controlled Handlebars templates.** Templates are
  trusted assets shipped in `templates/`. Render-time variables ARE
  user-controlled but are HTML-escaped by default. Use triple-stash
  (`{{{var}}}`) only when the variable is trusted (e.g., context strings
  built by the library, not raw user input).
- **Adapter boundary**: `@langchain/*` imports forbidden outside
  `src/llm/adapters/**`. Enforced by ESLint — see `eslint.config.mjs`.
- **Output parser** never returns garbage — failure throws `GuardrailError`
  with the original raw payload attached.

## Roadmap (post-MVP)

- Phase 2: Agents + tools registry, streaming chains, structured error code
  on `LLMError` for retry-policy discrimination.
- Phase 3: pgvector / Qdrant retriever adapters, real embeddings.
- Phase 4: OTel/LangSmith tracing bridge, prompt registry CLI.
- Phase 5: Additional LLM providers (OpenAI, Ollama, Bedrock).
