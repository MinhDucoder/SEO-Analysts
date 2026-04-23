# @repo/seo-ai-core

MVP 0.1.0 — LLM facade + prompt-as-code + guardrails for monorepo services.

## What's in

- `createLLM({ provider: 'anthropic', model, defaultMaxTokens })` → `ILLM`
- `FileSystemPromptLoader({ baseDir })` — semver-versioned YAML prompts
- `ZodOutputParser(zodSchema)` — JSON fence strip + repair + Zod validation
- `BaseChain({ name, run, retry, logger })` — retry + timeout + error mapping
- Error taxonomy: `LLMError`, `PromptError`, `GuardrailError`, `ChainError`

## What's NOT in (yet)

- Retriever / RAG chain — deferred (see `ANALYSIS.md`)
- OpenAI / additional providers
- Streaming / tool use
- Auto-applied policies (clamp, redact)

## Usage

```typescript
import {
  createLLM,
  FileSystemPromptLoader,
  ZodOutputParser,
  BaseChain,
  GuardrailError,
  LLMError,
} from '@repo/seo-ai-core';
import { z } from 'zod';

const OutSchema = z.object({ summary: z.string() });

const llm = createLLM({ provider: 'anthropic', model: 'claude-sonnet-4-6', defaultMaxTokens: 1024 });
const loader = new FileSystemPromptLoader({ baseDir: './prompts' });
const parser = new ZodOutputParser(OutSchema);

const chain = new BaseChain({
  name: 'summarize',
  retry: { maxAttempts: 2, backoffMs: 500 },
  run: async (input: { text: string }, { signal }) => {
    const { messages } = await loader.render('summarize', { text: input.text }, { version: '^1.0.0' });
    const res = await llm.invoke({ messages }, signal);
    return parser.parse(res.content);
  },
});

try {
  const out = await chain.run({ text: 'hello world' }, { timeoutMs: 8000, traceId: 'req-1' });
  console.log(out.summary);
} catch (err) {
  if (err instanceof GuardrailError) { /* bad JSON; log err.raw */ }
  if (err instanceof LLMError) { /* transient network */ }
  throw err;
}
```

## Adapter boundary

`@langchain/*` must only be imported from `src/llm/adapters/**`. An ESLint rule enforces this.

## Env

- `ANTHROPIC_API_KEY` — required when `createLLM({ provider: 'anthropic' })` is called without explicit `apiKey`.
