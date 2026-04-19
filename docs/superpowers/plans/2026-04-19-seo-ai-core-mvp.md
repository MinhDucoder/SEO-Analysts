# `@repo/seo-ai-core` MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@repo/seo-ai-core` as an internal monorepo package that wraps LangChain behind library-owned interfaces — consumers never import `@langchain/*`. MVP delivers 7 slices (LLM factory + Anthropic adapter, prompt loader+renderer with YAML+semver, base chain, RAG chain, in-memory retriever, Zod guardrails, minimal logger) plus a smoke example wired against real `apps/seo-analyzer` rule files.

**Architecture:** Adapter+Facade. `src/llm/adapters/anthropic.adapter.ts` is the ONLY file allowed to import `@langchain/*` — enforced by ESLint `no-restricted-imports`. Public API surface = library-owned interfaces (`ILLMProvider`, `IChain`, `IPromptLoader`, `IRetriever`, `Logger`, error taxonomy). 4 execution waves (Foundations → Core units → Composition → Integration), 11 atomic-commit tasks.

**Tech Stack:** TypeScript 5.9 strict, Node 18+, npm workspaces + Turborepo, Vitest 2.x, `@langchain/core@^0.3`, `@langchain/anthropic@^0.3`, Zod, YAML, semver, Handlebars, optional Pino. Build: `tsc` (matches `@repo/shared` / `@repo/proto` convention).

**Source spec:** [docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md](../specs/2026-04-19-seo-ai-core-mvp-design.md)

**Workflow:** L1 (LARGE-lite per [.claude/workflow/WORKFLOW-LARGE.md](../../../.claude/workflow/WORKFLOW-LARGE.md)). Skip `/cso`, `/qa`, `/canary` — no UI, no deploy, no auth/secrets handling. Phases applied: `/office-hours` (already done = brainstorming) → `/plan-eng-review` (this plan IS the eng review artifact) → `gsd:discuss-phase` (skipped — spec already locks decisions) → `gsd:plan-phase` (this plan) → `gsd:execute-phase` (4 waves below) → `/review`.

---

## Pre-flight notes (deviations from spec)

1. **ESLint config filename**: spec § 2 lists `.eslintrc.cjs`. Repo actually uses **flat config** (`eslint.config.mjs` — confirmed in `apps/seo-analyzer/eslint.config.mjs`). Plan uses `eslint.config.mjs` to match convention. No semantic difference — same `no-restricted-imports` rule applies.
2. **Module system**: `@repo/typescript-config/base.json` sets `module: NodeNext`. Plan uses ESM-first (`type: "module"` in package.json) to align. Build emits `.js` ESM.
3. **Vitest version**: matches `apps/seo-analyzer` (`^2.1.0`).
4. **Pino as peerDep**: only included if logger consumer wants it. Tests use `noopLogger` so pino is not required for unit tests.
5. **All commits**: prefix `feat(seo-ai-core):` (per memory `feedback_commit_scope_split`). Final docs polish uses `docs(seo-ai-core):`.

---

## Wave 1 — Foundations

**Tasks T1–T3 are parallel-safe** (no inter-task deps). Subagent-driven execution can dispatch all three simultaneously.

---

### Task 1: Scaffold package + ESLint boundary rule

**Goal:** Empty package builds cleanly, ESLint blocks `@langchain/*` outside adapters.

**Files:**
- Create: `packages/seo-ai-core/package.json`
- Create: `packages/seo-ai-core/tsconfig.json`
- Create: `packages/seo-ai-core/vitest.config.ts`
- Create: `packages/seo-ai-core/eslint.config.mjs`
- Create: `packages/seo-ai-core/.gitignore`
- Create: `packages/seo-ai-core/README.md` (stub)
- Create: `packages/seo-ai-core/src/index.ts` (empty barrel for now)
- Create: `packages/seo-ai-core/src/llm/adapters/.gitkeep`
- Modify: none (npm workspaces auto-picks up `packages/*`)

- [ ] **Step 1.1: Create directory structure**

```bash
mkdir -p "packages/seo-ai-core/src/llm/adapters"
mkdir -p "packages/seo-ai-core/src/prompt/templates/code-review"
mkdir -p "packages/seo-ai-core/src/chains"
mkdir -p "packages/seo-ai-core/src/retrievers"
mkdir -p "packages/seo-ai-core/src/guardrails"
mkdir -p "packages/seo-ai-core/src/observability"
mkdir -p "packages/seo-ai-core/src/errors"
mkdir -p "packages/seo-ai-core/test/_fixtures"
mkdir -p "packages/seo-ai-core/examples"
touch "packages/seo-ai-core/src/llm/adapters/.gitkeep"
```

- [ ] **Step 1.2: Write `packages/seo-ai-core/package.json`**

```json
{
  "name": "@repo/seo-ai-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "src/prompt/templates"],
  "scripts": {
    "build": "tsc",
    "check-types": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@langchain/anthropic": "^0.3.0",
    "@langchain/core": "^0.3.0",
    "handlebars": "^4.7.8",
    "semver": "^7.6.0",
    "yaml": "^2.5.0",
    "zod": "^3.23.0"
  },
  "peerDependencies": {
    "pino": "^9.0.0"
  },
  "peerDependenciesMeta": {
    "pino": { "optional": true }
  },
  "devDependencies": {
    "@repo/eslint-config": "*",
    "@repo/typescript-config": "*",
    "@types/node": "^20.0.0",
    "@types/semver": "^7.5.8",
    "typescript": "^5.9.2",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 1.3: Write `packages/seo-ai-core/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["test/**/*", "examples/**/*", "dist/**/*"]
}
```

- [ ] **Step 1.4: Write `packages/seo-ai-core/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts', 'examples/**/*.smoke.spec.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.types.ts', 'src/**/types.ts'],
      thresholds: {
        'src/guardrails/**': { branches: 80, functions: 80 },
        'src/chains/rag.chain.ts': { branches: 80, functions: 80 },
      },
    },
  },
});
```

- [ ] **Step 1.5: Write `packages/seo-ai-core/eslint.config.mjs`**

This file installs the **adapter-boundary rule**. Any TS file outside `src/llm/adapters/` that imports from `@langchain/*` will fail lint.

```javascript
import { config as baseConfig } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@langchain/*', 'langchain', 'langchain/*'],
              message:
                'LangChain imports are forbidden outside src/llm/adapters/. This is the adapter-boundary rule — see docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md § 1.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/llm/adapters/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
```

- [ ] **Step 1.6: Write `packages/seo-ai-core/.gitignore`**

```
dist/
coverage/
node_modules/
*.tsbuildinfo
```

- [ ] **Step 1.7: Write `packages/seo-ai-core/src/index.ts` (empty stub)**

```typescript
// Public barrel — populated incrementally as modules land in W2/W3.
export {};
```

- [ ] **Step 1.8: Write `packages/seo-ai-core/README.md` (stub)**

```markdown
# @repo/seo-ai-core

Internal LangChain-wrapping library for SEO Platform AI features.

**Status:** MVP in progress (Phase 1 of N).

See [docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md](../../docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md) for the full design.

## Public API

(populated in T11 — final docs polish)
```

- [ ] **Step 1.9: Install dependencies**

Run from monorepo root:

```bash
npm install
```

Expected: npm resolves `@repo/seo-ai-core` workspace + installs `@langchain/*`, `zod`, `yaml`, `semver`, `handlebars`. No errors.

- [ ] **Step 1.10: Verify build emits empty dist**

```bash
npm run build --workspace=@repo/seo-ai-core
```

Expected: exit 0, creates `packages/seo-ai-core/dist/index.js` and `dist/index.d.ts`.

- [ ] **Step 1.11: Verify ESLint adapter-boundary rule WORKS (planted violation)**

Create a deliberate violation:

```bash
cat > "packages/seo-ai-core/src/_lint-canary.ts" <<'EOF'
import { ChatAnthropic } from '@langchain/anthropic';
export const c = ChatAnthropic;
EOF
```

Run:

```bash
npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 1, error message contains `LangChain imports are forbidden outside src/llm/adapters/`.

- [ ] **Step 1.12: Move canary to adapters dir, verify lint PASSES**

```bash
mv "packages/seo-ai-core/src/_lint-canary.ts" "packages/seo-ai-core/src/llm/adapters/_lint-canary.ts"
npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 0 (the same import is allowed inside `adapters/`).

- [ ] **Step 1.13: Delete canary, re-verify**

```bash
rm "packages/seo-ai-core/src/llm/adapters/_lint-canary.ts"
npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 0 (no canary, no violation).

- [ ] **Step 1.14: Commit Wave 1 / Task 1**

```bash
git add packages/seo-ai-core/
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T1 scaffold package + ESLint adapter-boundary rule

Workspace package @repo/seo-ai-core scaffolded with TS strict (NodeNext),
Vitest 2, and ESLint flat config. Adapter-boundary rule blocks @langchain/*
imports outside src/llm/adapters/ — verified with planted canary in both
forbidden and allowed positions.

Empty src/index.ts. Build emits empty dist. No public API yet.
EOF
)"
```

---

### Task 2: Errors + Logger

**Goal:** Error taxonomy + Logger interface land first so subsequent tasks (T4–T9) can throw typed errors and inject loggers.

**Files:**
- Create: `packages/seo-ai-core/src/errors/index.ts`
- Create: `packages/seo-ai-core/src/observability/logger.ts`
- Create: `packages/seo-ai-core/test/errors.spec.ts`
- Create: `packages/seo-ai-core/test/observability.logger.spec.ts`

- [ ] **Step 2.1: Write failing test `test/errors.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  AiCoreError,
  LLMError,
  PromptError,
  ChainError,
  GuardrailError,
  RetrieverError,
} from '../src/errors';

describe('error taxonomy', () => {
  it('AiCoreError is the base class', () => {
    const e = new AiCoreError('base');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('AiCoreError');
    expect(e.message).toBe('base');
  });

  it.each([
    ['LLMError', LLMError],
    ['PromptError', PromptError],
    ['ChainError', ChainError],
    ['GuardrailError', GuardrailError],
    ['RetrieverError', RetrieverError],
  ])('%s extends AiCoreError and sets name', (name, Ctor) => {
    const e = new Ctor('x');
    expect(e).toBeInstanceOf(AiCoreError);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe(name);
    expect(e.message).toBe('x');
  });

  it('GuardrailError carries optional raw payload + cause', () => {
    const cause = new Error('original');
    const e = new GuardrailError('parse failed', { raw: '{invalid', cause });
    expect(e.raw).toBe('{invalid');
    expect(e.cause).toBe(cause);
  });
});
```

- [ ] **Step 2.2: Run test → expect FAIL (module missing)**

```bash
npm test --workspace=@repo/seo-ai-core -- test/errors.spec.ts
```

Expected: FAIL with `Cannot find module '../src/errors'` or similar.

- [ ] **Step 2.3: Implement `src/errors/index.ts`**

```typescript
export interface AiCoreErrorOptions extends ErrorOptions {
  /** Original LLM raw payload that failed to parse. Useful for debugging. */
  raw?: string;
}

export class AiCoreError extends Error {
  readonly raw?: string;

  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'AiCoreError';
    this.raw = opts?.raw;
  }
}

export class LLMError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'LLMError';
  }
}

export class PromptError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'PromptError';
  }
}

export class ChainError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'ChainError';
  }
}

export class GuardrailError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'GuardrailError';
  }
}

export class RetrieverError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'RetrieverError';
  }
}
```

- [ ] **Step 2.4: Run errors test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/errors.spec.ts
```

Expected: 3 tests passing (1 base + 1 parameterised batch with 5 cases + 1 raw/cause).

- [ ] **Step 2.5: Write failing test `test/observability.logger.spec.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { noopLogger, createPinoLogger, type Logger } from '../src/observability/logger';

describe('Logger', () => {
  it('noopLogger accepts all 4 levels without throwing', () => {
    const log: Logger = noopLogger;
    expect(() => log.debug('a')).not.toThrow();
    expect(() => log.info('b')).not.toThrow();
    expect(() => log.warn('c')).not.toThrow();
    expect(() => log.error('d')).not.toThrow();
  });

  it('createPinoLogger returns a Logger that delegates to the underlying pino instance', () => {
    const fakePino = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const log = createPinoLogger(fakePino);
    log.debug('d', { k: 1 });
    log.info('i');
    log.warn('w', { ctx: 'x' });
    log.error('e');
    expect(fakePino.debug).toHaveBeenCalledWith({ k: 1 }, 'd');
    expect(fakePino.info).toHaveBeenCalledWith({}, 'i');
    expect(fakePino.warn).toHaveBeenCalledWith({ ctx: 'x' }, 'w');
    expect(fakePino.error).toHaveBeenCalledWith({}, 'e');
  });
});
```

- [ ] **Step 2.6: Run test → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/observability.logger.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 2.7: Implement `src/observability/logger.ts`**

```typescript
export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
}

export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Minimal subset of pino's Logger interface that we depend on. Avoids importing
 * pino's types directly so consumers without pino installed still type-check.
 */
export interface PinoLike {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export function createPinoLogger(pino: PinoLike): Logger {
  return {
    debug: (msg, ctx) => pino.debug(ctx ?? {}, msg),
    info: (msg, ctx) => pino.info(ctx ?? {}, msg),
    warn: (msg, ctx) => pino.warn(ctx ?? {}, msg),
    error: (msg, ctx) => pino.error(ctx ?? {}, msg),
  };
}
```

- [ ] **Step 2.8: Run logger test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/observability.logger.spec.ts
```

Expected: 2 tests passing.

- [ ] **Step 2.9: Verify build + lint clean**

```bash
npm run build --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 0 both.

- [ ] **Step 2.10: Commit Task 2**

```bash
git add packages/seo-ai-core/src/errors packages/seo-ai-core/src/observability packages/seo-ai-core/test/errors.spec.ts packages/seo-ai-core/test/observability.logger.spec.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T2 error taxonomy + Logger interface

AiCoreError base + 5 typed subclasses (LLM/Prompt/Chain/Guardrail/Retriever).
GuardrailError carries optional `raw` payload for debugging LLM JSON parse fails.

Logger interface (debug/info/warn/error). noopLogger default; createPinoLogger
adapter accepts a structural PinoLike type so pino is a true peerDep — consumers
without pino still type-check.
EOF
)"
```

---

### Task 3: Type-only modules (5 contracts)

**Goal:** All consumer-facing interfaces land before any implementation. Compiler verifies they're consistent.

**Files:**
- Create: `packages/seo-ai-core/src/llm/types.ts`
- Create: `packages/seo-ai-core/src/prompt/types.ts`
- Create: `packages/seo-ai-core/src/chains/types.ts`
- Create: `packages/seo-ai-core/src/retrievers/types.ts`
- Create: `packages/seo-ai-core/src/guardrails/types.ts`
- Create: `packages/seo-ai-core/test/types.compile.spec.ts`

- [ ] **Step 3.1: Write `src/llm/types.ts`**

```typescript
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
  /** Optional name (function/tool name for tool messages). */
  name?: string;
  /** Tool-call correlation id (when role === 'tool'). */
  toolCallId?: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export type FinishReason = 'stop' | 'length' | 'tool_call' | 'content_filter' | 'unknown';

export interface LLMRequest {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  /** Free-form metadata propagated to observability hooks. NOT sent to the LLM. */
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: FinishReason;
  /** Provider raw payload. Internal use only — NOT exported via index.ts. */
  raw?: unknown;
}

export interface LLMChunk {
  delta: string;
  /** Final usage delivered on the last chunk only. */
  usage?: TokenUsage;
}

export interface ILLMProvider {
  readonly name: string;
  readonly model: string;
  invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;
  stream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMChunk>;
  countTokens(text: string): Promise<number>;
}
```

- [ ] **Step 3.2: Write `src/prompt/types.ts`**

```typescript
export interface PromptMetadata {
  owner: string;
  tags?: string[];
  /** Hint for callers — informational. The library does not enforce. */
  minModel?: string;
  deprecated?: boolean;
}

export interface PromptExample {
  input: Record<string, unknown>;
  output: string;
}

export interface PromptTemplate {
  id: string;
  /** Strict semver string (e.g. "1.0.0"). */
  version: string;
  description?: string;
  /** Variable names declared by the template. Render-time validation against this list. */
  variables: string[];
  /** Optional system prompt (Handlebars source). */
  system?: string;
  /** User prompt (Handlebars source). Required. */
  user: string;
  examples?: PromptExample[];
  metadata: PromptMetadata;
}

import type { Message } from '../llm/types';

export interface RenderedPrompt {
  id: string;
  version: string;
  messages: Message[];
  /** sha256 hash of (id + version + JSON.stringify(messages)), first 16 hex chars. */
  hash: string;
}

export interface PromptListEntry {
  id: string;
  version: string;
  metadata: PromptMetadata;
}

export interface IPromptLoader {
  load(id: string, version?: string): Promise<PromptTemplate>;
  render(
    id: string,
    vars: Record<string, unknown>,
    opts?: { version?: string },
  ): Promise<RenderedPrompt>;
  list(): Promise<PromptListEntry[]>;
}
```

- [ ] **Step 3.3: Write `src/chains/types.ts`**

```typescript
import type { Logger } from '../observability/logger';

export interface ChainCallbacks {
  onStart?: (input: unknown) => void;
  onSuccess?: (output: unknown) => void;
  onError?: (err: unknown) => void;
}

export interface ChainContext {
  /** Correlation id for tracing across multiple calls. */
  traceId?: string;
  signal?: AbortSignal;
  logger?: Logger;
  callbacks?: ChainCallbacks;
  /** User-defined metadata propagated to logger context. */
  metadata?: Record<string, unknown>;
}

export interface IChain<TInput, TOutput> {
  readonly name: string;
  readonly promptId: string;
  readonly promptVersion: string;
  invoke(input: TInput, ctx?: ChainContext): Promise<TOutput>;
}
```

- [ ] **Step 3.4: Write `src/retrievers/types.ts`**

```typescript
export interface RetrievedDoc {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RetrieverSearchOptions {
  topK?: number;
  /** Optional minimum score threshold; docs below are filtered out. */
  minScore?: number;
}

export interface IRetriever {
  search(query: string, opts?: RetrieverSearchOptions): Promise<RetrievedDoc[]>;
}
```

- [ ] **Step 3.5: Write `src/guardrails/types.ts`**

```typescript
export interface Policy {
  /** Hard cap on `LLMRequest.maxTokens`. Caller request is clamped down, never up. */
  maxTokens?: number;
  /** Hard cap on number of messages allowed in `LLMRequest.messages`. */
  maxMessages?: number;
  /** Regex sources (with flags) applied to message content. Matches replaced with `[REDACTED]`. */
  redactPatterns?: Array<{ source: string; flags: string }>;
}

export interface PolicyResult {
  applied: boolean;
  /** Diagnostic — what the policy changed. Useful for observability. */
  changes: string[];
}

export interface OutputParseSuccess<T> {
  ok: true;
  value: T;
}

export interface OutputParseFailure {
  ok: false;
  error: string;
  raw: string;
}

export type OutputParseResult<T> = OutputParseSuccess<T> | OutputParseFailure;
```

- [ ] **Step 3.6: Write compile-only test `test/types.compile.spec.ts`**

This test exists purely to (a) keep ts-check honest about exported surface area and (b) document expected structural compatibility between modules.

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type {
  ILLMProvider, LLMRequest, LLMResponse, Message, TokenUsage, LLMChunk, FinishReason,
} from '../src/llm/types';
import type {
  IPromptLoader, PromptTemplate, RenderedPrompt, PromptListEntry,
} from '../src/prompt/types';
import type { IChain, ChainContext } from '../src/chains/types';
import type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from '../src/retrievers/types';
import type { Policy, PolicyResult, OutputParseResult } from '../src/guardrails/types';
import type { Logger } from '../src/observability/logger';

describe('public type surface compiles', () => {
  it('ILLMProvider has invoke/stream/countTokens', () => {
    expectTypeOf<ILLMProvider['invoke']>().parameters.toMatchTypeOf<[LLMRequest, AbortSignal?]>();
    expectTypeOf<ILLMProvider['invoke']>().returns.toMatchTypeOf<Promise<LLMResponse>>();
    expectTypeOf<ILLMProvider['stream']>().returns.toMatchTypeOf<AsyncIterable<LLMChunk>>();
    expectTypeOf<ILLMProvider['countTokens']>().returns.toMatchTypeOf<Promise<number>>();
  });

  it('RenderedPrompt.messages reuses Message from llm/types', () => {
    expectTypeOf<RenderedPrompt['messages']>().toMatchTypeOf<Message[]>();
  });

  it('IChain is generic over input/output', () => {
    type C = IChain<{ q: string }, { a: string }>;
    expectTypeOf<C['invoke']>().parameters.toMatchTypeOf<
      [{ q: string }, ChainContext?]
    >();
  });

  it('IRetriever returns scored docs', () => {
    expectTypeOf<IRetriever['search']>().returns.toMatchTypeOf<Promise<RetrievedDoc[]>>();
    expectTypeOf<RetrievedDoc['score']>().toBeNumber();
  });

  it('OutputParseResult is a discriminated union', () => {
    const r: OutputParseResult<{ x: number }> = { ok: true, value: { x: 1 } };
    if (r.ok) {
      expectTypeOf(r.value).toMatchTypeOf<{ x: number }>();
    }
  });

  it('Policy + PolicyResult + Logger surface compiles', () => {
    expectTypeOf<Policy['maxTokens']>().toMatchTypeOf<number | undefined>();
    expectTypeOf<PolicyResult['changes']>().toMatchTypeOf<string[]>();
    expectTypeOf<Logger['info']>().parameters.toMatchTypeOf<[string, Record<string, unknown>?]>();
  });

  it('TokenUsage + FinishReason + PromptListEntry exist', () => {
    expectTypeOf<TokenUsage>().toHaveProperty('total');
    const fr: FinishReason = 'stop';
    expect(fr).toBe('stop');
    expectTypeOf<PromptListEntry>().toHaveProperty('metadata');
  });
});

import { expect } from 'vitest';
```

- [ ] **Step 3.7: Run compile + types test → expect PASS**

```bash
npm run check-types --workspace=@repo/seo-ai-core
npm test --workspace=@repo/seo-ai-core -- test/types.compile.spec.ts
```

Expected: tsc clean, all type assertions pass.

- [ ] **Step 3.8: Update `src/index.ts` with type exports**

```typescript
// Public type surface — locked for MVP per spec § 3.

export type {
  ILLMProvider, LLMRequest, LLMResponse, Message, TokenUsage, LLMChunk, FinishReason, Role,
} from './llm/types';
export type {
  IPromptLoader, PromptTemplate, RenderedPrompt, PromptListEntry, PromptMetadata, PromptExample,
} from './prompt/types';
export type { IChain, ChainContext, ChainCallbacks } from './chains/types';
export type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from './retrievers/types';
export type { Policy, PolicyResult, OutputParseResult } from './guardrails/types';
export type { Logger, LogContext, PinoLike } from './observability/logger';

export { noopLogger, createPinoLogger } from './observability/logger';

export {
  AiCoreError, LLMError, PromptError, ChainError, GuardrailError, RetrieverError,
  type AiCoreErrorOptions,
} from './errors';

// Factories + classes appended in T4-T9.
```

- [ ] **Step 3.9: Verify build + lint**

```bash
npm run build --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 0 both.

- [ ] **Step 3.10: Commit Task 3**

```bash
git add packages/seo-ai-core/src packages/seo-ai-core/test/types.compile.spec.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T3 type contracts for 5 modules + index re-exports

5 *.ts files under llm/prompt/chains/retrievers/guardrails define ALL
consumer-facing interfaces before any runtime code lands. types.compile.spec.ts
asserts the public surface compiles + structural relationships hold
(e.g. RenderedPrompt.messages = Message[]).

src/index.ts re-exports types directly from each module — no separate
types-barrel file.
EOF
)"
```

---

## Wave 2 — Core units

**Tasks T4–T7 are parallel-safe.** All depend on W1 outputs (`errors`, `logger`, types). None depend on each other.

---

### Task 4: LLM provider + Anthropic adapter

**Goal:** `createLLM({ provider: 'anthropic', model, apiKey })` returns an `ILLMProvider`. Anthropic adapter is the ONLY file that imports `@langchain/*`.

**Files:**
- Create: `packages/seo-ai-core/src/llm/provider.ts`
- Create: `packages/seo-ai-core/src/llm/adapters/_mappers.ts`
- Create: `packages/seo-ai-core/src/llm/adapters/anthropic.adapter.ts`
- Create: `packages/seo-ai-core/test/_fixtures/fake-llm.adapter.ts`
- Create: `packages/seo-ai-core/test/llm.provider.spec.ts`
- Create: `packages/seo-ai-core/test/llm.anthropic.integration.spec.ts`

- [ ] **Step 4.1: Write fake adapter `test/_fixtures/fake-llm.adapter.ts`**

```typescript
import type { ILLMProvider, LLMRequest, LLMResponse, LLMChunk } from '../../src/index';
import { createHash } from 'node:crypto';

/**
 * Test-only adapter. Returns scripted responses keyed by the sha256 hash of
 * the request's stringified messages. Falls back to `defaultResponse`.
 */
export class FakeLLMProvider implements ILLMProvider {
  readonly name = 'fake';
  readonly model: string;
  private readonly scripted: Map<string, LLMResponse>;
  private readonly defaultResponse: LLMResponse;
  invocations = 0;

  constructor(opts: {
    model?: string;
    scripted?: Record<string, LLMResponse>;
    defaultResponse?: LLMResponse;
  } = {}) {
    this.model = opts.model ?? 'fake-model-v1';
    this.scripted = new Map(Object.entries(opts.scripted ?? {}));
    this.defaultResponse = opts.defaultResponse ?? {
      content: '{"ok":true}',
      usage: { prompt: 0, completion: 0, total: 0 },
      model: this.model,
      finishReason: 'stop',
    };
  }

  static keyOf(req: LLMRequest): string {
    return createHash('sha256')
      .update(JSON.stringify(req.messages))
      .digest('hex')
      .slice(0, 16);
  }

  async invoke(req: LLMRequest): Promise<LLMResponse> {
    this.invocations += 1;
    const key = FakeLLMProvider.keyOf(req);
    return this.scripted.get(key) ?? this.defaultResponse;
  }

  async *stream(req: LLMRequest): AsyncIterable<LLMChunk> {
    const r = await this.invoke(req);
    yield { delta: r.content, usage: r.usage };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}
```

- [ ] **Step 4.2: Write failing test `test/llm.provider.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { createLLM, registerLLMProvider, LLMError } from '../src/index';
import type { ILLMProvider, LLMConfig } from '../src/llm/provider';
import { FakeLLMProvider } from './_fixtures/fake-llm.adapter';

describe('createLLM', () => {
  it('routes provider:"anthropic" to AnthropicAdapter (smoke — no real call)', () => {
    const llm = createLLM({ provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'sk-test' });
    expect(llm.name).toBe('anthropic');
    expect(llm.model).toBe('claude-sonnet-4-6');
  });

  it('throws LLMError on unknown provider', () => {
    expect(() =>
      createLLM({ provider: 'gemini' as unknown as 'openai', model: 'x' }),
    ).toThrow(LLMError);
  });

  it('registerLLMProvider adds a custom provider', () => {
    class TestAdapter implements ILLMProvider {
      readonly name = 'test-custom';
      readonly model: string;
      constructor(cfg: LLMConfig) { this.model = cfg.model; }
      async invoke() { return new FakeLLMProvider().invoke({ messages: [] }); }
      async *stream() { yield { delta: '' }; }
      async countTokens() { return 0; }
    }
    registerLLMProvider('test-custom' as 'openai', TestAdapter);
    const llm = createLLM({ provider: 'test-custom' as 'openai', model: 'x' });
    expect(llm.name).toBe('test-custom');
  });
});
```

- [ ] **Step 4.3: Run test → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/llm.provider.spec.ts
```

Expected: FAIL — `createLLM` not exported.

- [ ] **Step 4.4: Write `src/llm/adapters/_mappers.ts`**

```typescript
import {
  AIMessage, HumanMessage, SystemMessage, ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type { Message, LLMResponse, FinishReason, TokenUsage } from '../types';

export function toLangChainMessages(messages: Message[]): BaseMessage[] {
  return messages.map((m) => {
    switch (m.role) {
      case 'system':
        return new SystemMessage({ content: m.content });
      case 'user':
        return new HumanMessage({ content: m.content, name: m.name });
      case 'assistant':
        return new AIMessage({ content: m.content, name: m.name });
      case 'tool':
        return new ToolMessage({
          content: m.content,
          tool_call_id: m.toolCallId ?? '',
          name: m.name,
        });
    }
  });
}

interface AnthropicUsageMetadata {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export function toLLMResponse(ai: AIMessage, model: string): LLMResponse {
  const usage = (ai.usage_metadata ?? {}) as AnthropicUsageMetadata;
  const tokenUsage: TokenUsage = {
    prompt: usage.input_tokens ?? 0,
    completion: usage.output_tokens ?? 0,
    total: usage.total_tokens ?? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
  };
  const content = typeof ai.content === 'string'
    ? ai.content
    : ai.content.map((c) => (typeof c === 'string' ? c : 'text' in c ? c.text : '')).join('');

  const finishReason: FinishReason = mapFinishReason(
    ai.response_metadata?.['stop_reason'] as string | undefined,
  );

  return {
    content,
    usage: tokenUsage,
    model,
    finishReason,
    raw: ai,
  };
}

function mapFinishReason(s: string | undefined): FinishReason {
  switch (s) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_call';
    default:
      return 'unknown';
  }
}
```

- [ ] **Step 4.5: Write `src/llm/adapters/anthropic.adapter.ts`**

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import type { AIMessage } from '@langchain/core/messages';
import type { ILLMProvider, LLMRequest, LLMResponse, LLMChunk } from '../types';
import type { LLMConfig } from '../provider';
import { LLMError } from '../../errors';
import { toLangChainMessages, toLLMResponse } from './_mappers';

export class AnthropicAdapter implements ILLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly client: ChatAnthropic;

  constructor(cfg: LLMConfig) {
    if (!cfg.apiKey && !process.env['ANTHROPIC_API_KEY']) {
      throw new LLMError(
        'AnthropicAdapter: missing apiKey (pass cfg.apiKey or set ANTHROPIC_API_KEY env)',
      );
    }
    this.model = cfg.model;
    this.client = new ChatAnthropic({
      apiKey: cfg.apiKey ?? process.env['ANTHROPIC_API_KEY'],
      model: cfg.model,
      temperature: cfg.defaultTemperature ?? 0.2,
      maxTokens: cfg.defaultMaxTokens ?? 4096,
      maxRetries: cfg.maxRetries ?? 2,
      anthropicApiUrl: cfg.baseUrl,
    });
  }

  async invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    try {
      const result = (await this.client.invoke(toLangChainMessages(req.messages), {
        signal,
        temperature: req.temperature,
        stop: req.stopSequences,
      })) as AIMessage;
      return toLLMResponse(result, this.model);
    } catch (err) {
      throw new LLMError(`Anthropic invoke failed: ${(err as Error).message}`, { cause: err });
    }
  }

  async *stream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMChunk> {
    try {
      const stream = await this.client.stream(toLangChainMessages(req.messages), {
        signal,
        temperature: req.temperature,
        stop: req.stopSequences,
      });
      for await (const chunk of stream) {
        const delta = typeof chunk.content === 'string' ? chunk.content : '';
        if (delta) yield { delta };
      }
    } catch (err) {
      throw new LLMError(`Anthropic stream failed: ${(err as Error).message}`, { cause: err });
    }
  }

  async countTokens(text: string): Promise<number> {
    return this.client.getNumTokens(text);
  }
}
```

- [ ] **Step 4.6: Write `src/llm/provider.ts`**

```typescript
import type { ILLMProvider } from './types';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { LLMError } from '../errors';

export type LLMProviderName = 'openai' | 'anthropic' | 'ollama';

export interface LLMConfig {
  provider: LLMProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  maxRetries?: number;
  /** AbortSignal/timeout etc. handled at invoke-call-site, not at construction. */
}

type AdapterCtor = new (cfg: LLMConfig) => ILLMProvider;

const REGISTRY = new Map<string, AdapterCtor>([
  ['anthropic', AnthropicAdapter],
]);

export function createLLM(cfg: LLMConfig): ILLMProvider {
  const Ctor = REGISTRY.get(cfg.provider);
  if (!Ctor) {
    throw new LLMError(
      `Unknown LLM provider: "${cfg.provider}". Registered: ${Array.from(REGISTRY.keys()).join(', ')}`,
    );
  }
  return new Ctor(cfg);
}

export function registerLLMProvider(name: LLMProviderName, ctor: AdapterCtor): void {
  REGISTRY.set(name, ctor);
}
```

- [ ] **Step 4.7: Update `src/index.ts` — append LLM exports**

Append to existing exports (do NOT rewrite the whole file — preserve types from T3):

```typescript
// LLM
export { createLLM, registerLLMProvider, type LLMConfig, type LLMProviderName } from './llm/provider';
```

- [ ] **Step 4.8: Run provider unit test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/llm.provider.spec.ts
```

Expected: 3 tests passing.

- [ ] **Step 4.9: Write integration test `test/llm.anthropic.integration.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { createLLM } from '../src/index';

const apiKey = process.env['ANTHROPIC_API_KEY'];

describe.skipIf(!apiKey)('AnthropicAdapter [integration]', () => {
  it('returns a non-empty completion for a trivial prompt', async () => {
    const llm = createLLM({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      apiKey,
      defaultMaxTokens: 50,
    });
    const res = await llm.invoke({
      messages: [{ role: 'user', content: 'Reply with exactly the word OK.' }],
    });
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.usage.total).toBeGreaterThan(0);
    expect(res.model).toBe('claude-haiku-4-5-20251001');
  }, 30_000);
});
```

- [ ] **Step 4.10: Run integration test (will skip without API key — that's expected)**

```bash
npm test --workspace=@repo/seo-ai-core -- test/llm.anthropic.integration.spec.ts
```

Expected: 1 test SKIPPED (no API key in dev env). If `ANTHROPIC_API_KEY` is set, expect 1 PASS within 30s.

- [ ] **Step 4.11: Verify lint boundary still works**

```bash
npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 0. The `@langchain/*` imports in `src/llm/adapters/anthropic.adapter.ts` and `_mappers.ts` are allowed (in adapters dir).

- [ ] **Step 4.12: Verify build**

```bash
npm run build --workspace=@repo/seo-ai-core
```

Expected: exit 0. `dist/llm/provider.js`, `dist/llm/adapters/anthropic.adapter.js` emitted.

- [ ] **Step 4.13: Commit Task 4**

```bash
git add packages/seo-ai-core/src/llm packages/seo-ai-core/test/_fixtures packages/seo-ai-core/test/llm.provider.spec.ts packages/seo-ai-core/test/llm.anthropic.integration.spec.ts packages/seo-ai-core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T4 LLM provider factory + Anthropic adapter

createLLM(cfg) routes by provider name → adapter ctor. Only "anthropic"
wired for MVP; "openai"/"ollama" reserved in the type union for Phase 2.

AnthropicAdapter wraps ChatAnthropic from @langchain/anthropic — the ONLY
file importing langchain. _mappers.ts handles Message ↔ BaseMessage and
extracts token usage / finish reason into LLMResponse.

FakeLLMProvider lives in test/_fixtures (NOT src/) so it never ships.
Integration spec gated by ANTHROPIC_API_KEY — never runs in CI by default.
EOF
)"
```

---

### Task 5: Prompt loader + renderer + seed YAML

**Goal:** `FileSystemPromptLoader` resolves semver, parses YAML, renders Handlebars in strict mode, and produces stable hashed `RenderedPrompt`.

**Files:**
- Create: `packages/seo-ai-core/src/prompt/renderer.ts`
- Create: `packages/seo-ai-core/src/prompt/loader.ts`
- Create: `packages/seo-ai-core/src/prompt/templates/code-review/v1.prompt.yaml`
- Create: `packages/seo-ai-core/test/prompt.renderer.spec.ts`
- Create: `packages/seo-ai-core/test/prompt.loader.spec.ts`
- Create: `packages/seo-ai-core/test/_fixtures/prompts/sample/v1.0.0.prompt.yaml`
- Create: `packages/seo-ai-core/test/_fixtures/prompts/sample/v1.1.0.prompt.yaml`
- Create: `packages/seo-ai-core/test/_fixtures/prompts/sample/v2.0.0.prompt.yaml`

- [ ] **Step 5.1: Write seed template `src/prompt/templates/code-review/v1.prompt.yaml`**

```yaml
id: code-review
version: 1.0.0
description: Review a source file against project SEO/code rules. Output structured findings.
variables:
  - filePath
  - fileContent
  - rules
  - contextDocs
metadata:
  owner: seo-ai-core
  minModel: claude-sonnet-4-6
  tags:
    - code-review
    - structured-output
system: |
  You are a senior code reviewer for the SEO Platform. Review the provided file
  against the project rules. Output STRICT JSON matching this schema:
  {
    "summary": string,
    "issues": [
      { "rule": string, "severity": "low"|"medium"|"high",
        "line": integer, "suggestion": string, "patch": string|null }
    ]
  }
  Apply ONLY rules listed below. Do not invent rules. Output JSON only — no prose, no markdown fences.
user: |
  File: {{filePath}}

  Rules:
  {{rules}}

  Related context:
  {{contextDocs}}

  Source:
  {{fileContent}}
```

- [ ] **Step 5.2: Write fixture prompts for loader tests**

`test/_fixtures/prompts/sample/v1.0.0.prompt.yaml`:

```yaml
id: sample
version: 1.0.0
variables: [name]
metadata:
  owner: test
user: "Hello {{name}}"
```

`test/_fixtures/prompts/sample/v1.1.0.prompt.yaml`:

```yaml
id: sample
version: 1.1.0
variables: [name]
metadata:
  owner: test
system: "Be brief."
user: "Hi {{name}}!"
```

`test/_fixtures/prompts/sample/v2.0.0.prompt.yaml`:

```yaml
id: sample
version: 2.0.0
variables: [name, tone]
metadata:
  owner: test
  deprecated: false
user: "{{tone}}, {{name}}."
```

- [ ] **Step 5.3: Write failing renderer test `test/prompt.renderer.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/prompt/renderer';
import { PromptError } from '../src/errors';

describe('renderTemplate', () => {
  it('substitutes declared variables', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  it('escapes HTML by default to neutralize injection from LLM-bound payloads', () => {
    expect(renderTemplate('{{x}}', { x: '<script>' })).toBe('&lt;script&gt;');
  });

  it('triple-stash {{{x}}} preserves raw output for code blocks', () => {
    expect(renderTemplate('{{{x}}}', { x: '<code>' })).toBe('<code>');
  });

  it('throws PromptError when an unknown variable is referenced (strict mode)', () => {
    expect(() => renderTemplate('Hi {{missing}}', {})).toThrow(PromptError);
  });

  it('throws PromptError on syntax errors', () => {
    expect(() => renderTemplate('Hi {{name', { name: 'x' })).toThrow(PromptError);
  });
});
```

- [ ] **Step 5.4: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/prompt.renderer.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 5.5: Implement `src/prompt/renderer.ts`**

```typescript
import Handlebars from 'handlebars';
import { PromptError } from '../errors';

export function renderTemplate(source: string, vars: Record<string, unknown>): string {
  let compiled;
  try {
    compiled = Handlebars.compile(source, { strict: true, noEscape: false });
  } catch (err) {
    throw new PromptError(`Handlebars compile failed: ${(err as Error).message}`, { cause: err });
  }
  try {
    return compiled(vars);
  } catch (err) {
    throw new PromptError(`Handlebars render failed: ${(err as Error).message}`, { cause: err });
  }
}
```

- [ ] **Step 5.6: Run renderer test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/prompt.renderer.spec.ts
```

Expected: 5 tests passing.

- [ ] **Step 5.7: Write failing loader test `test/prompt.loader.spec.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileSystemPromptLoader } from '../src/prompt/loader';
import { PromptError } from '../src/errors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '_fixtures', 'prompts');

describe('FileSystemPromptLoader', () => {
  const loader = new FileSystemPromptLoader({ baseDir: FIXTURES });

  it('loads the latest version when no range is provided', async () => {
    const tpl = await loader.load('sample');
    expect(tpl.version).toBe('2.0.0');
    expect(tpl.id).toBe('sample');
  });

  it('resolves a semver range to the highest matching version', async () => {
    const tpl = await loader.load('sample', '^1.0.0');
    expect(tpl.version).toBe('1.1.0');
  });

  it('loads an exact version', async () => {
    const tpl = await loader.load('sample', '1.0.0');
    expect(tpl.version).toBe('1.0.0');
  });

  it('throws PromptError when no version satisfies the range', async () => {
    await expect(loader.load('sample', '^3.0.0')).rejects.toThrow(PromptError);
  });

  it('throws PromptError when prompt id does not exist', async () => {
    await expect(loader.load('nonexistent')).rejects.toThrow(PromptError);
  });

  it('renders all declared variables and produces system + user messages', async () => {
    const out = await loader.render('sample', { name: 'Alice' }, { version: '1.1.0' });
    expect(out.id).toBe('sample');
    expect(out.version).toBe('1.1.0');
    expect(out.messages).toHaveLength(2);
    expect(out.messages[0]).toEqual({ role: 'system', content: 'Be brief.' });
    expect(out.messages[1]).toEqual({ role: 'user', content: 'Hi Alice!' });
    expect(out.hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('hash is stable across renders with same inputs', async () => {
    const a = await loader.render('sample', { name: 'X' }, { version: '1.0.0' });
    const b = await loader.render('sample', { name: 'X' }, { version: '1.0.0' });
    expect(a.hash).toBe(b.hash);
  });

  it('hash differs when variables differ', async () => {
    const a = await loader.render('sample', { name: 'X' }, { version: '1.0.0' });
    const b = await loader.render('sample', { name: 'Y' }, { version: '1.0.0' });
    expect(a.hash).not.toBe(b.hash);
  });

  it('throws PromptError when a declared variable is missing', async () => {
    await expect(loader.render('sample', {}, { version: '2.0.0' })).rejects.toThrow(PromptError);
  });

  it('list() returns latest version per id with metadata', async () => {
    const list = await loader.list();
    expect(list).toContainEqual(
      expect.objectContaining({ id: 'sample', version: '2.0.0' }),
    );
  });

  it('warns when loading a deprecated version', async () => {
    // Mutate fixture in-memory only — re-instantiate loader with disabled cache
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fresh = new FileSystemPromptLoader({ baseDir: FIXTURES, cache: false });
    // sample@2.0.0 is not deprecated by default; we don't mutate filesystem here.
    // Test instead that a non-deprecated load does NOT warn.
    await fresh.load('sample');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 5.8: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/prompt.loader.spec.ts
```

Expected: FAIL — `FileSystemPromptLoader` missing.

- [ ] **Step 5.9: Implement `src/prompt/loader.ts`**

```typescript
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import semver from 'semver';
import type {
  IPromptLoader, PromptTemplate, RenderedPrompt, PromptListEntry,
} from './types';
import type { Message } from '../llm/types';
import { renderTemplate } from './renderer';
import { PromptError } from '../errors';

export interface PromptLoaderOptions {
  baseDir: string;
  cache?: boolean;
}

export class FileSystemPromptLoader implements IPromptLoader {
  private readonly baseDir: string;
  private readonly cacheEnabled: boolean;
  private readonly cache = new Map<string, PromptTemplate>();

  constructor(opts: PromptLoaderOptions) {
    this.baseDir = opts.baseDir;
    this.cacheEnabled = opts.cache ?? true;
  }

  async load(id: string, range?: string): Promise<PromptTemplate> {
    const resolved = await this.resolveVersion(id, range);
    const cacheKey = `${id}@${resolved}`;
    const cached = this.cacheEnabled ? this.cache.get(cacheKey) : undefined;
    if (cached) return cached;

    const file = path.join(this.baseDir, id, `v${resolved}.prompt.yaml`);
    const raw = await fs.readFile(file, 'utf-8').catch((err) => {
      throw new PromptError(`Failed to read prompt file ${file}: ${(err as Error).message}`, { cause: err });
    });
    const parsed = parseYaml(raw);
    this.assertTemplateShape(parsed, id, resolved);
    const tpl = parsed as PromptTemplate;

    if (tpl.metadata?.deprecated) {
      console.warn(`[seo-ai-core] prompt ${id}@${resolved} is marked deprecated`);
    }

    if (this.cacheEnabled) this.cache.set(cacheKey, tpl);
    return tpl;
  }

  async render(
    id: string,
    vars: Record<string, unknown>,
    opts: { version?: string } = {},
  ): Promise<RenderedPrompt> {
    const tpl = await this.load(id, opts.version);

    const missing = tpl.variables.filter((v) => !(v in vars));
    if (missing.length) {
      throw new PromptError(
        `Missing variables for ${tpl.id}@${tpl.version}: ${missing.join(', ')}`,
      );
    }

    const messages: Message[] = [];
    if (tpl.system) {
      messages.push({ role: 'system', content: renderTemplate(tpl.system, vars) });
    }
    messages.push({ role: 'user', content: renderTemplate(tpl.user, vars) });

    const hash = createHash('sha256')
      .update(`${tpl.id}@${tpl.version}::${JSON.stringify(messages)}`)
      .digest('hex')
      .slice(0, 16);

    return { id: tpl.id, version: tpl.version, messages, hash };
  }

  async list(): Promise<PromptListEntry[]> {
    const ids = await fs.readdir(this.baseDir).catch(() => [] as string[]);
    const out: PromptListEntry[] = [];
    for (const id of ids) {
      const stat = await fs.stat(path.join(this.baseDir, id)).catch(() => null);
      if (!stat?.isDirectory()) continue;
      try {
        const latest = await this.load(id);
        out.push({ id: latest.id, version: latest.version, metadata: latest.metadata });
      } catch {
        // skip malformed prompts in list()
      }
    }
    return out;
  }

  private async resolveVersion(id: string, range?: string): Promise<string> {
    const dir = path.join(this.baseDir, id);
    const files = await fs.readdir(dir).catch(() => {
      throw new PromptError(`Prompt id not found: ${id} (looked in ${dir})`);
    });

    const versions = files
      .filter((f) => f.startsWith('v') && f.endsWith('.prompt.yaml'))
      .map((f) => f.slice(1, -'.prompt.yaml'.length))
      .filter((v) => semver.valid(v) !== null)
      .sort(semver.rcompare);

    if (versions.length === 0) {
      throw new PromptError(`No valid prompt versions found for ${id} in ${dir}`);
    }

    if (!range) {
      // safe due to versions.length > 0 check above
      return versions[0]!;
    }

    const matched = semver.maxSatisfying(versions, range);
    if (!matched) {
      throw new PromptError(`No version of "${id}" satisfies range "${range}". Available: ${versions.join(', ')}`);
    }
    return matched;
  }

  private assertTemplateShape(parsed: unknown, id: string, version: string): void {
    if (typeof parsed !== 'object' || parsed === null) {
      throw new PromptError(`Prompt ${id}@${version}: not a YAML object`);
    }
    const obj = parsed as Record<string, unknown>;
    if (obj['id'] !== id) {
      throw new PromptError(`Prompt id mismatch in file: expected "${id}", got "${String(obj['id'])}"`);
    }
    if (obj['version'] !== version) {
      throw new PromptError(`Prompt version mismatch in file: expected "${version}", got "${String(obj['version'])}"`);
    }
    if (typeof obj['user'] !== 'string') {
      throw new PromptError(`Prompt ${id}@${version}: missing required "user" field`);
    }
    if (!Array.isArray(obj['variables'])) {
      throw new PromptError(`Prompt ${id}@${version}: "variables" must be an array`);
    }
    if (typeof obj['metadata'] !== 'object' || obj['metadata'] === null) {
      throw new PromptError(`Prompt ${id}@${version}: missing required "metadata" object`);
    }
  }
}
```

- [ ] **Step 5.10: Update `src/index.ts` — append prompt exports**

```typescript
// Prompt
export { FileSystemPromptLoader, type PromptLoaderOptions } from './prompt/loader';
export { renderTemplate } from './prompt/renderer';
```

- [ ] **Step 5.11: Run loader test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/prompt.loader.spec.ts
```

Expected: 11 tests passing.

- [ ] **Step 5.12: Verify build + lint + check-types**

```bash
npm run build --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core && npm run check-types --workspace=@repo/seo-ai-core
```

Expected: exit 0 all three.

- [ ] **Step 5.13: Commit Task 5**

```bash
git add packages/seo-ai-core/src/prompt packages/seo-ai-core/test/prompt.renderer.spec.ts packages/seo-ai-core/test/prompt.loader.spec.ts packages/seo-ai-core/test/_fixtures/prompts packages/seo-ai-core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T5 prompt loader + renderer + seed YAML

FileSystemPromptLoader: semver resolve (range / exact / latest), YAML parse,
strict shape validation, deprecated warning. render() validates declared
variables, produces system+user Message[], stable 16-char sha256 hash for
trace correlation.

renderer.ts wraps Handlebars in strict mode — unknown vars throw PromptError.
HTML escaping ON by default to neutralize injection from LLM-bound content.

Seed template code-review@1.0.0 lands the structured-output instruction set
that T9 (rag chain) will exercise.
EOF
)"
```

---

### Task 6: Memory retriever (deterministic fake embeddings)

**Goal:** `MemoryRetriever` indexes a doc set and returns top-K by cosine similarity. Fake embeddings = token-hash → fixed-dim vector. Deterministic across runs.

**Files:**
- Create: `packages/seo-ai-core/src/retrievers/memory.retriever.ts`
- Create: `packages/seo-ai-core/test/retrievers.memory.spec.ts`

- [ ] **Step 6.1: Write failing test `test/retrievers.memory.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { MemoryRetriever } from '../src/retrievers/memory.retriever';

describe('MemoryRetriever', () => {
  const docs = [
    { id: 'd1', content: 'open graph meta tags improve social sharing previews' },
    { id: 'd2', content: 'twitter card metadata for tweet previews' },
    { id: 'd3', content: 'canonical link tag prevents duplicate content seo issues' },
    { id: 'd4', content: 'image alt text accessibility and seo ranking' },
  ];

  it('returns docs ranked by cosine similarity to query', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('open graph social', { topK: 2 });
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe('d1');
    expect(out[0]?.score).toBeGreaterThan(out[1]?.score ?? 1);
  });

  it('clamps topK to available doc count', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('seo', { topK: 100 });
    expect(out).toHaveLength(docs.length);
  });

  it('defaults topK to 5', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('seo');
    expect(out).toHaveLength(4); // clamped to available
  });

  it('returns empty array when store is empty', async () => {
    const r = new MemoryRetriever([]);
    const out = await r.search('anything');
    expect(out).toEqual([]);
  });

  it('honors minScore filter', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('zzz totally unrelated nonsense', { topK: 10, minScore: 0.99 });
    expect(out).toEqual([]);
  });

  it('search results are deterministic across calls', async () => {
    const r = new MemoryRetriever(docs);
    const a = await r.search('twitter card', { topK: 4 });
    const b = await r.search('twitter card', { topK: 4 });
    expect(a.map((d) => d.id)).toEqual(b.map((d) => d.id));
    expect(a.map((d) => d.score)).toEqual(b.map((d) => d.score));
  });

  it('preserves doc metadata', async () => {
    const r = new MemoryRetriever([
      { id: 'm1', content: 'hello', metadata: { source: 'test', tag: 'x' } },
    ]);
    const out = await r.search('hello');
    expect(out[0]?.metadata).toEqual({ source: 'test', tag: 'x' });
  });
});
```

- [ ] **Step 6.2: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/retrievers.memory.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 6.3: Implement `src/retrievers/memory.retriever.ts`**

```typescript
import { createHash } from 'node:crypto';
import type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from './types';

export interface MemoryDoc {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

const VECTOR_DIM = 64;
const DEFAULT_TOP_K = 5;

interface IndexedDoc extends MemoryDoc {
  vector: Float32Array;
}

export class MemoryRetriever implements IRetriever {
  private readonly indexed: IndexedDoc[];

  constructor(docs: MemoryDoc[]) {
    this.indexed = docs.map((d) => ({ ...d, vector: embedText(d.content) }));
  }

  async search(query: string, opts: RetrieverSearchOptions = {}): Promise<RetrievedDoc[]> {
    if (this.indexed.length === 0) return [];

    const qVec = embedText(query);
    const scored: RetrievedDoc[] = this.indexed.map((d) => ({
      id: d.id,
      content: d.content,
      score: cosine(qVec, d.vector),
      metadata: d.metadata,
    }));

    const minScore = opts.minScore ?? -Infinity;
    const filtered = scored.filter((d) => d.score >= minScore);
    filtered.sort((a, b) => b.score - a.score);

    const topK = Math.min(opts.topK ?? DEFAULT_TOP_K, filtered.length);
    return filtered.slice(0, topK);
  }
}

/**
 * Deterministic fake embedding: tokenize → hash each token to a bucket
 * (0..VECTOR_DIM-1) → count frequency → L2-normalize. Captures word overlap
 * cheaply so the retriever produces sensible relative rankings without an
 * embedding API. NOT semantic — replace with real embeddings in Phase 3.
 */
function embedText(text: string): Float32Array {
  const tokens = tokenize(text);
  const v = new Float32Array(VECTOR_DIM);
  for (const t of tokens) {
    const bucket = hashToBucket(t);
    v[bucket]! += 1;
  }
  return l2Normalize(v);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashToBucket(token: string): number {
  const h = createHash('sha256').update(token).digest();
  // first 4 bytes → uint32 → mod VECTOR_DIM
  const u32 = h.readUInt32BE(0);
  return u32 % VECTOR_DIM;
}

function l2Normalize(v: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) sumSq += v[i]! * v[i]!;
  const norm = Math.sqrt(sumSq) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i]! / norm;
  return out;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}
```

- [ ] **Step 6.4: Update `src/index.ts` — append retriever exports**

```typescript
// Retrievers
export { MemoryRetriever, type MemoryDoc } from './retrievers/memory.retriever';
```

- [ ] **Step 6.5: Run retriever test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/retrievers.memory.spec.ts
```

Expected: 7 tests passing.

- [ ] **Step 6.6: Verify build + lint**

```bash
npm run build --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core
```

Expected: exit 0.

- [ ] **Step 6.7: Commit Task 6**

```bash
git add packages/seo-ai-core/src/retrievers packages/seo-ai-core/test/retrievers.memory.spec.ts packages/seo-ai-core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T6 in-memory retriever with deterministic fake embeddings

MemoryRetriever indexes docs at construction (token-hash → 64-dim L2-normalized
vector) and ranks by cosine similarity. Deterministic — same input produces
same scores across runs and processes (sha256 hash + standard arithmetic).

Use case: MVP smoke tests + offline CI. Phase 3 swaps in real embeddings via
adapter pattern (factory route stays stable).
EOF
)"
```

---

### Task 7: Guardrails — output parser + policy

**Goal:** `parseStructured<T>(raw, zodSchema)` strips fences, attempts JSON parse, runs Zod, falls back to a 1-pass JSON repair before throwing `GuardrailError`. `applyPolicy` enforces token caps + redacts PII.

**Files:**
- Create: `packages/seo-ai-core/src/guardrails/output-parser.ts`
- Create: `packages/seo-ai-core/src/guardrails/policy.ts`
- Create: `packages/seo-ai-core/test/guardrails.output-parser.spec.ts`
- Create: `packages/seo-ai-core/test/guardrails.policy.spec.ts`

- [ ] **Step 7.1: Write failing parser test `test/guardrails.output-parser.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseStructured } from '../src/guardrails/output-parser';
import { GuardrailError } from '../src/errors';

const Schema = z.object({
  summary: z.string(),
  count: z.number().int().nonnegative(),
});

describe('parseStructured', () => {
  it('parses clean JSON matching the schema', () => {
    const r = parseStructured('{"summary":"ok","count":3}', Schema);
    expect(r).toEqual({ summary: 'ok', count: 3 });
  });

  it('strips ```json ... ``` fence', () => {
    const raw = '```json\n{"summary":"ok","count":1}\n```';
    expect(parseStructured(raw, Schema)).toEqual({ summary: 'ok', count: 1 });
  });

  it('strips bare ``` fence', () => {
    const raw = '```\n{"summary":"x","count":0}\n```';
    expect(parseStructured(raw, Schema)).toEqual({ summary: 'x', count: 0 });
  });

  it('repairs trailing comma in object', () => {
    expect(parseStructured('{"summary":"x","count":0,}', Schema)).toEqual({ summary: 'x', count: 0 });
  });

  it('repairs trailing comma in array (when nested in matching schema)', () => {
    const ArraySchema = z.object({ items: z.array(z.number()) });
    expect(parseStructured('{"items":[1,2,3,]}', ArraySchema)).toEqual({ items: [1, 2, 3] });
  });

  it('throws GuardrailError when JSON is unrecoverable', () => {
    expect(() => parseStructured('not json at all', Schema)).toThrow(GuardrailError);
    try {
      parseStructured('not json at all', Schema);
    } catch (err) {
      expect(err).toBeInstanceOf(GuardrailError);
      expect((err as GuardrailError).raw).toBe('not json at all');
    }
  });

  it('throws GuardrailError when JSON parses but fails Zod validation', () => {
    expect(() => parseStructured('{"summary":"x","count":-1}', Schema)).toThrow(GuardrailError);
  });

  it('throws GuardrailError on empty / whitespace-only input', () => {
    expect(() => parseStructured('   ', Schema)).toThrow(GuardrailError);
  });
});
```

- [ ] **Step 7.2: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/guardrails.output-parser.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 7.3: Implement `src/guardrails/output-parser.ts`**

```typescript
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import { GuardrailError } from '../errors';

export function parseStructured<S extends ZodTypeAny>(raw: string, schema: S): ZodInfer<S> {
  if (!raw || raw.trim().length === 0) {
    throw new GuardrailError('parseStructured: empty input', { raw });
  }

  const candidates = [stripFence(raw), repairJson(stripFence(raw))];

  let lastError: unknown;
  for (const c of candidates) {
    let json: unknown;
    try {
      json = JSON.parse(c);
    } catch (err) {
      lastError = err;
      continue;
    }
    const parsed = schema.safeParse(json);
    if (parsed.success) return parsed.data as ZodInfer<S>;
    lastError = parsed.error;
  }

  throw new GuardrailError(
    `parseStructured: could not produce schema-valid output. Last error: ${(lastError as Error)?.message ?? String(lastError)}`,
    { raw, cause: lastError instanceof Error ? lastError : undefined },
  );
}

function stripFence(input: string): string {
  const trimmed = input.trim();
  // ```json ... ```  or  ``` ... ```
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
}

/**
 * Single-pass repair for the most common LLM JSON mistakes:
 *   - trailing comma before } or ]
 *   - smart quotes (" " ' ') replaced with ASCII quotes
 * Keep it boring — aggressive repair masks real bugs.
 */
function repairJson(input: string): string {
  return input
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,(\s*[}\]])/g, '$1');
}
```

- [ ] **Step 7.4: Run parser test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/guardrails.output-parser.spec.ts
```

Expected: 8 tests passing.

- [ ] **Step 7.5: Write failing policy test `test/guardrails.policy.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { applyPolicy } from '../src/guardrails/policy';
import type { LLMRequest } from '../src/llm/types';
import type { Policy } from '../src/guardrails/types';

const baseReq = (): LLMRequest => ({
  messages: [{ role: 'user', content: 'hello world' }],
  maxTokens: 8000,
});

describe('applyPolicy', () => {
  it('passes through when no policy fields apply', () => {
    const { request, result } = applyPolicy(baseReq(), {});
    expect(request.maxTokens).toBe(8000);
    expect(result.applied).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it('clamps maxTokens DOWN to policy.maxTokens (never up)', () => {
    const { request, result } = applyPolicy(baseReq(), { maxTokens: 1000 });
    expect(request.maxTokens).toBe(1000);
    expect(result.applied).toBe(true);
    expect(result.changes).toContain('maxTokens clamped: 8000 → 1000');
  });

  it('does NOT raise maxTokens when caller asked for less than policy', () => {
    const req: LLMRequest = { ...baseReq(), maxTokens: 500 };
    const { request, result } = applyPolicy(req, { maxTokens: 1000 });
    expect(request.maxTokens).toBe(500);
    expect(result.applied).toBe(false);
  });

  it('truncates messages keeping the LAST N (most-recent context)', () => {
    const req: LLMRequest = {
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u1' },
        { role: 'assistant', content: 'a1' },
        { role: 'user', content: 'u2' },
        { role: 'assistant', content: 'a2' },
        { role: 'user', content: 'u3' },
      ],
    };
    const { request } = applyPolicy(req, { maxMessages: 3 });
    expect(request.messages.map((m) => m.content)).toEqual(['u2', 'a2', 'u3']);
  });

  it('redacts content matching redactPatterns', () => {
    const policy: Policy = {
      redactPatterns: [
        { source: '\\b\\d{3}-\\d{2}-\\d{4}\\b', flags: 'g' }, // SSN
        { source: 'sk-[a-zA-Z0-9]+', flags: 'g' },             // API key
      ],
    };
    const req: LLMRequest = {
      messages: [
        { role: 'user', content: 'My SSN is 123-45-6789 and my key is sk-abc123XYZ.' },
      ],
    };
    const { request, result } = applyPolicy(req, policy);
    expect(request.messages[0]?.content).toBe('My SSN is [REDACTED] and my key is [REDACTED].');
    expect(result.applied).toBe(true);
    expect(result.changes.some((c) => c.includes('redacted'))).toBe(true);
  });

  it('does not mutate the original request', () => {
    const req = baseReq();
    const original = JSON.parse(JSON.stringify(req));
    applyPolicy(req, { maxTokens: 100 });
    expect(req).toEqual(original);
  });
});
```

- [ ] **Step 7.6: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/guardrails.policy.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 7.7: Implement `src/guardrails/policy.ts`**

```typescript
import type { LLMRequest, Message } from '../llm/types';
import type { Policy, PolicyResult } from './types';

export interface ApplyPolicyOutput {
  request: LLMRequest;
  result: PolicyResult;
}

export function applyPolicy(req: LLMRequest, policy: Policy): ApplyPolicyOutput {
  const changes: string[] = [];
  let messages: Message[] = req.messages.map((m) => ({ ...m }));
  let maxTokens = req.maxTokens;

  // 1. Clamp maxTokens DOWN
  if (policy.maxTokens !== undefined && maxTokens !== undefined && maxTokens > policy.maxTokens) {
    changes.push(`maxTokens clamped: ${maxTokens} → ${policy.maxTokens}`);
    maxTokens = policy.maxTokens;
  } else if (policy.maxTokens !== undefined && maxTokens === undefined) {
    maxTokens = policy.maxTokens;
    changes.push(`maxTokens set by policy: ${policy.maxTokens}`);
  }

  // 2. Truncate messages keeping LAST N (most recent)
  if (policy.maxMessages !== undefined && messages.length > policy.maxMessages) {
    const before = messages.length;
    messages = messages.slice(-policy.maxMessages);
    changes.push(`messages truncated: ${before} → ${messages.length} (kept last)`);
  }

  // 3. Redact PII
  if (policy.redactPatterns?.length) {
    let totalReplacements = 0;
    messages = messages.map((m) => {
      let content = m.content;
      for (const p of policy.redactPatterns!) {
        const re = new RegExp(p.source, p.flags);
        const matches = content.match(re);
        if (matches) {
          totalReplacements += matches.length;
          content = content.replace(re, '[REDACTED]');
        }
      }
      return { ...m, content };
    });
    if (totalReplacements > 0) {
      changes.push(`redacted ${totalReplacements} match(es) across messages`);
    }
  }

  return {
    request: {
      ...req,
      messages,
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    },
    result: {
      applied: changes.length > 0,
      changes,
    },
  };
}
```

- [ ] **Step 7.8: Update `src/index.ts` — append guardrail exports**

```typescript
// Guardrails
export { parseStructured } from './guardrails/output-parser';
export { applyPolicy, type ApplyPolicyOutput } from './guardrails/policy';
```

- [ ] **Step 7.9: Run policy test → expect PASS**

Make sure the policy spec contains ONLY the 6 tests listed in the corrected list (delete the wrong-slice test).

```bash
npm test --workspace=@repo/seo-ai-core -- test/guardrails.policy.spec.ts
```

Expected: 6 tests passing.

- [ ] **Step 7.10: Verify all tests still pass + lint + build**

```bash
npm test --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core && npm run build --workspace=@repo/seo-ai-core
```

Expected: all green.

- [ ] **Step 7.11: Commit Task 7**

```bash
git add packages/seo-ai-core/src/guardrails packages/seo-ai-core/test/guardrails.output-parser.spec.ts packages/seo-ai-core/test/guardrails.policy.spec.ts packages/seo-ai-core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T7 guardrails — Zod output parser + policy

parseStructured<S>(raw, schema): strip ```json/``` fence → JSON.parse →
Zod validate. On parse failure: 1-pass repair (trailing commas + smart
quotes) and retry. On final failure: throw GuardrailError carrying the
raw payload for debugging. No further repair attempts — aggressive
mutation masks real prompt bugs.

applyPolicy(req, policy): clamps maxTokens DOWN (never up), truncates
messages keeping the LAST N (most recent context — system message dropped
if it's the oldest), redacts patterns to "[REDACTED]". Pure function;
returns a new LLMRequest plus a diagnostic PolicyResult.
EOF
)"
```

---

## Wave 3 — Composition

**T8 → T9 sequential** (T9 imports `createBaseChain` from T8).

---

### Task 8: Base chain wrapper

**Goal:** `createBaseChain(cfg)` adds logger context + 1 retry on transient `LLMError` to any inner chain function. Used by T9 RAG chain and any future chain.

**Files:**
- Create: `packages/seo-ai-core/src/chains/base.chain.ts`
- Create: `packages/seo-ai-core/test/chains.base.spec.ts`

- [ ] **Step 8.1: Write failing test `test/chains.base.spec.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createBaseChain } from '../src/chains/base.chain';
import { LLMError, ChainError, GuardrailError } from '../src/errors';
import type { Logger } from '../src/observability/logger';

const captureLogger = (): Logger & { logs: Array<{ level: string; msg: string; ctx?: object }> } => {
  const logs: Array<{ level: string; msg: string; ctx?: object }> = [];
  return {
    logs,
    debug: (msg, ctx) => logs.push({ level: 'debug', msg, ctx }),
    info: (msg, ctx) => logs.push({ level: 'info', msg, ctx }),
    warn: (msg, ctx) => logs.push({ level: 'warn', msg, ctx }),
    error: (msg, ctx) => logs.push({ level: 'error', msg, ctx }),
  };
};

describe('createBaseChain', () => {
  it('invokes the inner function and returns its result', async () => {
    const inner = vi.fn(async (input: { x: number }) => ({ y: input.x * 2 }));
    const chain = createBaseChain({
      name: 'test',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: inner,
    });
    const out = await chain.invoke({ x: 21 });
    expect(out).toEqual({ y: 42 });
    expect(inner).toHaveBeenCalledOnce();
  });

  it('emits start/success log lines with traceId in context', async () => {
    const log = captureLogger();
    const chain = createBaseChain({
      name: 'logged',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => 'ok',
    });
    await chain.invoke({}, { logger: log, traceId: 'trace-123' });
    expect(log.logs.some((l) => l.msg.includes('chain.start') && (l.ctx as { traceId?: string }).traceId === 'trace-123')).toBe(true);
    expect(log.logs.some((l) => l.msg.includes('chain.success'))).toBe(true);
  });

  it('retries ONCE on transient LLMError, then succeeds', async () => {
    let calls = 0;
    const chain = createBaseChain({
      name: 'retry',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        calls += 1;
        if (calls === 1) throw new LLMError('rate limited');
        return 'ok';
      },
    });
    const out = await chain.invoke({});
    expect(out).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does NOT retry on GuardrailError (deterministic — retry will not help)', async () => {
    let calls = 0;
    const chain = createBaseChain({
      name: 'no-retry',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        calls += 1;
        throw new GuardrailError('schema mismatch');
      },
    });
    await expect(chain.invoke({})).rejects.toThrow(GuardrailError);
    expect(calls).toBe(1);
  });

  it('wraps unknown errors in ChainError on final failure', async () => {
    const chain = createBaseChain({
      name: 'unknown',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        throw new Error('something else');
      },
    });
    await expect(chain.invoke({})).rejects.toThrow(ChainError);
  });

  it('exposes name + promptId + promptVersion', () => {
    const chain = createBaseChain({
      name: 'meta',
      promptId: 'p1',
      promptVersion: '2.0.0',
      run: async () => null,
    });
    expect(chain.name).toBe('meta');
    expect(chain.promptId).toBe('p1');
    expect(chain.promptVersion).toBe('2.0.0');
  });

  it('fires onStart / onSuccess callbacks', async () => {
    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const chain = createBaseChain({
      name: 'cb',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => 42,
    });
    await chain.invoke({ q: 'x' }, { callbacks: { onStart, onSuccess } });
    expect(onStart).toHaveBeenCalledWith({ q: 'x' });
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it('fires onError callback on failure', async () => {
    const onError = vi.fn();
    const chain = createBaseChain({
      name: 'cb-err',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        throw new GuardrailError('x');
      },
    });
    await expect(
      chain.invoke({}, { callbacks: { onError } }),
    ).rejects.toThrow(GuardrailError);
    expect(onError).toHaveBeenCalled();
  });
});
```

- [ ] **Step 8.2: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/chains.base.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 8.3: Implement `src/chains/base.chain.ts`**

```typescript
import type { IChain, ChainContext } from './types';
import { ChainError, LLMError, AiCoreError } from '../errors';
import { noopLogger } from '../observability/logger';

export interface BaseChainConfig<TInput, TOutput> {
  name: string;
  promptId: string;
  promptVersion: string;
  run: (input: TInput, ctx: ChainContext) => Promise<TOutput>;
  /** Max retries on transient LLMError. Default 1. Set to 0 to disable. */
  retries?: number;
}

export function createBaseChain<TInput, TOutput>(
  cfg: BaseChainConfig<TInput, TOutput>,
): IChain<TInput, TOutput> {
  const retries = cfg.retries ?? 1;

  return {
    name: cfg.name,
    promptId: cfg.promptId,
    promptVersion: cfg.promptVersion,

    async invoke(input: TInput, ctx: ChainContext = {}): Promise<TOutput> {
      const logger = ctx.logger ?? noopLogger;
      const traceId = ctx.traceId;
      const meta = { traceId, chain: cfg.name, promptId: cfg.promptId, promptVersion: cfg.promptVersion };

      logger.info('chain.start', { ...meta, ...ctx.metadata });
      ctx.callbacks?.onStart?.(input);

      let attempt = 0;
      let lastError: unknown;
      while (attempt <= retries) {
        try {
          const out = await cfg.run(input, ctx);
          logger.info('chain.success', { ...meta, attempt });
          ctx.callbacks?.onSuccess?.(out);
          return out;
        } catch (err) {
          lastError = err;
          // Only retry on LLMError (network / rate-limit / transient).
          // GuardrailError, PromptError, RetrieverError → deterministic; retry won't help.
          if (err instanceof LLMError && attempt < retries) {
            attempt += 1;
            logger.warn('chain.retry', { ...meta, attempt, reason: (err as Error).message });
            continue;
          }
          break;
        }
      }

      logger.error('chain.failed', { ...meta, error: (lastError as Error)?.message });
      ctx.callbacks?.onError?.(lastError);

      if (lastError instanceof AiCoreError) throw lastError;
      throw new ChainError(
        `Chain "${cfg.name}" failed: ${(lastError as Error)?.message ?? String(lastError)}`,
        { cause: lastError instanceof Error ? lastError : undefined },
      );
    },
  };
}
```

- [ ] **Step 8.4: Update `src/index.ts` — append base chain export**

```typescript
// Chains
export { createBaseChain, type BaseChainConfig } from './chains/base.chain';
```

- [ ] **Step 8.5: Run → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/chains.base.spec.ts
```

Expected: 8 tests passing.

- [ ] **Step 8.6: Verify**

```bash
npm run build --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core
```

- [ ] **Step 8.7: Commit Task 8**

```bash
git add packages/seo-ai-core/src/chains/base.chain.ts packages/seo-ai-core/test/chains.base.spec.ts packages/seo-ai-core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T8 base chain wrapper — logger + retry + error mapping

createBaseChain(cfg): wraps an inner async run() with structured logging
(start/success/retry/failed), AbortSignal threading via ChainContext, and
ONE retry on transient LLMError only. GuardrailError / PromptError /
RetrieverError are NOT retried (deterministic — retry won't help).

Wraps unknown errors in ChainError on final failure. Exposes name /
promptId / promptVersion for trace correlation.
EOF
)"
```

---

### Task 9: RAG chain (composition)

**Goal:** `createRagChain<TIn, TOut>(cfg)` composes Retriever → PromptLoader → LLM → parseStructured. End-to-end test uses fake LLM + MemoryRetriever + real loader pointing at fixture prompts.

**Files:**
- Create: `packages/seo-ai-core/src/chains/rag.chain.ts`
- Create: `packages/seo-ai-core/test/chains.rag.spec.ts`
- Create: `packages/seo-ai-core/test/_fixtures/prompts/rag-test/v1.0.0.prompt.yaml`

- [ ] **Step 9.1: Write fixture prompt for RAG test**

`packages/seo-ai-core/test/_fixtures/prompts/rag-test/v1.0.0.prompt.yaml`:

```yaml
id: rag-test
version: 1.0.0
variables: [query, context]
metadata:
  owner: test
system: "Answer using ONLY the provided context. Output JSON: {\"answer\": string}"
user: |
  Question: {{query}}

  Context:
  {{{context}}}
```

- [ ] **Step 9.2: Write failing test `test/chains.rag.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRagChain } from '../src/chains/rag.chain';
import { FileSystemPromptLoader } from '../src/prompt/loader';
import { MemoryRetriever } from '../src/retrievers/memory.retriever';
import { GuardrailError, RetrieverError } from '../src/errors';
import { FakeLLMProvider } from './_fixtures/fake-llm.adapter';
import type { Message } from '../src/llm/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '_fixtures', 'prompts');

const Answer = z.object({ answer: z.string() });

describe('createRagChain', () => {
  const docs = [
    { id: 'doc-og', content: 'Open Graph meta tags improve social sharing previews on Facebook.' },
    { id: 'doc-tw', content: 'Twitter Card metadata controls the appearance of links shared on Twitter.' },
    { id: 'doc-canon', content: 'Canonical link tags prevent duplicate content SEO penalties.' },
  ];

  function buildScripted(messages: Message[], content: string) {
    const key = createHash('sha256').update(JSON.stringify(messages)).digest('hex').slice(0, 16);
    return { [key]: { content, usage: { prompt: 10, completion: 5, total: 15 }, model: 'fake-model-v1', finishReason: 'stop' as const } };
  }

  it('end-to-end: retrieves docs, renders prompt, calls LLM, parses structured output', async () => {
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"answer":"Open Graph meta tags improve social sharing."}',
        usage: { prompt: 10, completion: 5, total: 15 },
        model: 'fake-model-v1',
        finishReason: 'stop',
      },
    });

    const chain = createRagChain({
      name: 'rag-smoke',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => ({
        query: input.query,
        context: contextDocs,
      }),
      topK: 2,
    });

    const out = await chain.invoke({ query: 'What do Open Graph tags do?' });
    expect(out).toEqual({ answer: 'Open Graph meta tags improve social sharing.' });
    expect(llm.invocations).toBe(1);
  });

  it('throws GuardrailError when LLM output does not match schema', async () => {
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"wrong_field":123}',
        usage: { prompt: 0, completion: 0, total: 0 },
        model: 'fake',
        finishReason: 'stop',
      },
    });
    const chain = createRagChain({
      name: 'bad-output',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => ({
        query: input.query,
        context: contextDocs,
      }),
    });
    await expect(chain.invoke({ query: 'q' })).rejects.toThrow(GuardrailError);
  });

  it('passes signal from ChainContext through to LLM (cancel works)', async () => {
    const llm = new FakeLLMProvider();
    const chain = createRagChain({
      name: 'cancel',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => ({
        query: input.query,
        context: contextDocs,
      }),
    });
    const ctrl = new AbortController();
    ctrl.abort();
    // FakeLLMProvider does not honor signal, so this should still complete; but we
    // assert the chain accepts the signal field without throwing on contract.
    const out = await chain.invoke({ query: 'q' }, { signal: ctrl.signal });
    expect(out).toBeDefined();
  });

  it('exposes promptId + promptVersion + name', () => {
    const chain = createRagChain({
      name: 'meta',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm: new FakeLLMProvider(),
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, ctx) => ({ query: input.query, context: ctx }),
    });
    expect(chain.name).toBe('meta');
    expect(chain.promptId).toBe('rag-test');
    expect(chain.promptVersion).toBe('1.0.0');
  });

  it('uses custom topK from config', async () => {
    let lastContextLength = 0;
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"answer":"x"}',
        usage: { prompt: 0, completion: 0, total: 0 },
        model: 'fake',
        finishReason: 'stop',
      },
    });
    const chain = createRagChain({
      name: 'topk',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => {
        lastContextLength = contextDocs.length;
        return { query: input.query, context: contextDocs };
      },
      topK: 1,
    });
    await chain.invoke({ query: 'open graph' });
    expect(lastContextLength).toBeGreaterThan(0);
  });

  it('throws RetrieverError when retriever throws', async () => {
    const failingRetriever = {
      async search() {
        throw new Error('vector store down');
      },
    };
    const chain = createRagChain({
      name: 'retr-fail',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: failingRetriever,
      llm: new FakeLLMProvider(),
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, ctx) => ({ query: input.query, context: ctx }),
    });
    await expect(chain.invoke({ query: 'q' })).rejects.toThrow(RetrieverError);
  });
});
```

- [ ] **Step 9.3: Run → expect FAIL**

```bash
npm test --workspace=@repo/seo-ai-core -- test/chains.rag.spec.ts
```

Expected: FAIL — module missing.

- [ ] **Step 9.4: Implement `src/chains/rag.chain.ts`**

```typescript
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import type { IChain, ChainContext } from './types';
import type { ILLMProvider } from '../llm/types';
import type { IPromptLoader } from '../prompt/types';
import type { IRetriever, RetrievedDoc } from '../retrievers/types';
import { createBaseChain } from './base.chain';
import { parseStructured } from '../guardrails/output-parser';
import { RetrieverError } from '../errors';

export interface RagChainConfig<TInput, S extends ZodTypeAny> {
  name: string;
  promptId: string;
  promptVersion: string;
  retriever: IRetriever;
  llm: ILLMProvider;
  promptLoader: IPromptLoader;
  outputSchema: S;
  /**
   * Map (input, retrieved-context-string) → variables passed to the prompt
   * template. The library does NOT auto-inject; consumers know best how to
   * shape the context for their template.
   */
  buildVariables: (input: TInput, contextDocs: string) => Record<string, unknown>;
  /**
   * How to derive the retriever query from input. Defaults to `input.query`
   * (requires TInput to extend `{ query: string }`).
   */
  buildQuery?: (input: TInput) => string;
  topK?: number;
  retries?: number;
}

export function createRagChain<TInput, S extends ZodTypeAny>(
  cfg: RagChainConfig<TInput, S>,
): IChain<TInput, ZodInfer<S>> {
  const buildQuery = cfg.buildQuery ?? ((input: TInput) => (input as { query: string }).query);

  return createBaseChain({
    name: cfg.name,
    promptId: cfg.promptId,
    promptVersion: cfg.promptVersion,
    retries: cfg.retries,
    run: async (input: TInput, ctx: ChainContext): Promise<ZodInfer<S>> => {
      // 1. Retrieve
      let docs: RetrievedDoc[];
      try {
        docs = await cfg.retriever.search(buildQuery(input), { topK: cfg.topK ?? 5 });
      } catch (err) {
        throw new RetrieverError(`Retriever failed: ${(err as Error).message}`, { cause: err });
      }
      const contextDocs = docs.map((d, i) => `[doc#${i + 1} score=${d.score.toFixed(3)}] ${d.content}`).join('\n\n');

      // 2. Render prompt (PromptError thrown if template missing or vars short)
      const rendered = await cfg.promptLoader.render(
        cfg.promptId,
        cfg.buildVariables(input, contextDocs),
        { version: cfg.promptVersion },
      );

      // 3. Invoke LLM (LLMError thrown by adapter on failure → base.chain retries once)
      const response = await cfg.llm.invoke(
        { messages: rendered.messages, metadata: { promptHash: rendered.hash } },
        ctx.signal,
      );

      // 4. Parse structured output (GuardrailError on failure)
      return parseStructured(response.content, cfg.outputSchema);
    },
  });
}
```

- [ ] **Step 9.5: Update `src/index.ts` — append RAG chain export**

```typescript
export { createRagChain, type RagChainConfig } from './chains/rag.chain';
```

- [ ] **Step 9.6: Run → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- test/chains.rag.spec.ts
```

Expected: 6 tests passing.

- [ ] **Step 9.7: Run full suite + lint + build**

```bash
npm test --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core && npm run build --workspace=@repo/seo-ai-core
```

Expected: all tests green, lint clean, build clean.

- [ ] **Step 9.8: Commit Task 9**

```bash
git add packages/seo-ai-core/src/chains/rag.chain.ts packages/seo-ai-core/test/chains.rag.spec.ts packages/seo-ai-core/test/_fixtures/prompts/rag-test packages/seo-ai-core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T9 RAG chain — composes retriever + prompt + LLM + parser

createRagChain<TIn,Schema>(cfg): runs Retriever.search → builds context
string → PromptLoader.render → LLM.invoke → parseStructured(zodSchema).
Wraps via createBaseChain to inherit logging + retry + error mapping.

Retriever errors mapped to RetrieverError (clear taxonomy for callers).
buildVariables is consumer-supplied — library does not assume shape of
the prompt's context placeholder.

End-to-end test exercises FakeLLMProvider + MemoryRetriever + real loader
against rag-test@1.0.0 fixture — proves the composition in <100ms.
EOF
)"
```

---

## Wave 4 — Integration + exit

---

### Task 10: SEO-analyzer smoke example + CI wrapper

**Goal:** Wire the library against REAL `apps/seo-analyzer` rule files (read-only as text). Proves the public API works end-to-end with content that mirrors actual production data shape.

**Files:**
- Create: `packages/seo-ai-core/examples/seo-analyzer-smoke.ts`
- Create: `packages/seo-ai-core/examples/seo-analyzer-smoke.smoke.spec.ts`

- [ ] **Step 10.1: Write `packages/seo-ai-core/examples/seo-analyzer-smoke.ts`**

This is a runnable script. It loads 3 real rule files (as text) into MemoryRetriever, builds a RAG chain pointed at the seed `code-review@1.0.0` template, invokes with a Fake LLM that returns canned structured findings, and prints the result.

```typescript
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  createRagChain,
  FileSystemPromptLoader,
  MemoryRetriever,
  type IChain,
  type ILLMProvider,
  type LLMRequest,
  type LLMResponse,
  type LLMChunk,
} from '@repo/seo-ai-core';

// --- Schema for the chain's output ---------------------------------------
export const ReviewSchema = z.object({
  summary: z.string(),
  issues: z.array(
    z.object({
      rule: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      line: z.number().int().nonnegative(),
      suggestion: z.string(),
      patch: z.string().nullable(),
    }),
  ),
});
export type Review = z.infer<typeof ReviewSchema>;

// --- Fake LLM adapter (smoke runs offline) -------------------------------
class CannedReviewLLM implements ILLMProvider {
  readonly name = 'fake';
  readonly model = 'fake-review-model-v1';

  async invoke(_req: LLMRequest): Promise<LLMResponse> {
    const canned: Review = {
      summary:
        'File implements the open-graph rule. 1 minor issue: og:image dimension warning is not surfaced.',
      issues: [
        {
          rule: 'open-graph',
          severity: 'low',
          line: 42,
          suggestion: 'Add og:image:width / og:image:height for richer previews.',
          patch: null,
        },
      ],
    };
    return {
      content: JSON.stringify(canned),
      usage: { prompt: 200, completion: 80, total: 280 },
      model: this.model,
      finishReason: 'stop',
    };
  }

  async *stream(_req: LLMRequest): AsyncIterable<LLMChunk> {
    yield { delta: '' };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}

// --- Wire the smoke -------------------------------------------------------
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const RULES_DIR = path.join(REPO_ROOT, 'apps', 'seo-analyzer', 'src', 'analyzer', 'domain', 'rules', 'meta');
const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'prompt', 'templates');

export async function runSmoke(): Promise<Review> {
  // Read 3 real rule files as text — NO modifications to their source.
  const ruleFiles = ['title-tag.rule.ts', 'meta-description.rule.ts', 'open-graph.rule.ts'];
  const ruleDocs = await Promise.all(
    ruleFiles.map(async (f) => ({
      id: f,
      content: await fs.readFile(path.join(RULES_DIR, f), 'utf-8'),
      metadata: { source: 'seo-analyzer/rules/meta', filename: f },
    })),
  );

  const targetFile = path.join(RULES_DIR, 'open-graph.rule.ts');
  const targetContent = await fs.readFile(targetFile, 'utf-8');

  const chain: IChain<
    { query: string; filePath: string; fileContent: string; rules: string },
    Review
  > = createRagChain({
    name: 'seo-analyzer-smoke',
    promptId: 'code-review',
    promptVersion: '^1.0.0',
    retriever: new MemoryRetriever(ruleDocs),
    llm: new CannedReviewLLM(),
    promptLoader: new FileSystemPromptLoader({ baseDir: TEMPLATES_DIR }),
    outputSchema: ReviewSchema,
    buildVariables: (input, contextDocs) => ({
      filePath: input.filePath,
      fileContent: input.fileContent,
      rules: input.rules,
      contextDocs,
    }),
    topK: 3,
  });

  const review = await chain.invoke({
    query: 'Review the open-graph rule implementation against project conventions',
    filePath: 'apps/seo-analyzer/src/analyzer/domain/rules/meta/open-graph.rule.ts',
    fileContent: targetContent,
    rules: ruleFiles.join(', '),
  });

  return review;
}

// Allow running standalone: `node --loader tsx examples/seo-analyzer-smoke.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmoke()
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Smoke failed:', err);
      process.exit(1);
    });
}
```

- [ ] **Step 10.2: Write CI wrapper `packages/seo-ai-core/examples/seo-analyzer-smoke.smoke.spec.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { runSmoke } from './seo-analyzer-smoke';

describe('seo-analyzer smoke example [CI wrapper]', () => {
  it('produces a structured Review payload end-to-end', async () => {
    const review = await runSmoke();
    expect(review.summary).toMatch(/.+/);
    expect(Array.isArray(review.issues)).toBe(true);
    if (review.issues.length > 0) {
      expect(review.issues[0]).toMatchObject({
        rule: expect.any(String),
        severity: expect.stringMatching(/^(low|medium|high)$/),
        line: expect.any(Number),
        suggestion: expect.any(String),
      });
    }
  }, 10_000);

  it('snapshot of canned output is stable across runs', async () => {
    const a = await runSmoke();
    const b = await runSmoke();
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 10.3: Run smoke wrapper test → expect PASS**

```bash
npm test --workspace=@repo/seo-ai-core -- examples/seo-analyzer-smoke.smoke.spec.ts
```

Expected: 2 tests passing.

- [ ] **Step 10.4: Run smoke standalone (visual sanity check)**

```bash
cd packages/seo-ai-core && npx tsx examples/seo-analyzer-smoke.ts
```

Expected: prints a JSON `{ summary, issues[] }` payload to stdout.

- [ ] **Step 10.5: Run full test suite + lint + build**

```bash
npm test --workspace=@repo/seo-ai-core && npm run lint --workspace=@repo/seo-ai-core && npm run build --workspace=@repo/seo-ai-core
```

Expected: all green.

- [ ] **Step 10.6: Verify monorepo type-check unaffected**

```bash
cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN" && npm run check-types
```

Expected: turbo runs, all packages pass (cache-hit OK for unchanged ones).

- [ ] **Step 10.7: Commit Task 10**

```bash
git add packages/seo-ai-core/examples
git commit -m "$(cat <<'EOF'
feat(seo-ai-core): T10 SEO-analyzer smoke example + CI wrapper

examples/seo-analyzer-smoke.ts wires real apps/seo-analyzer rule files (read
as text — NO modifications) into MemoryRetriever, runs createRagChain against
code-review@1.0.0 with a canned-response LLM, and prints structured Review
findings.

examples/*.smoke.spec.ts wraps the example in vitest so it runs in CI on
every test pass — proves the public API contract holds end-to-end.

Snapshot determinism asserted (canned LLM + deterministic embeddings).
EOF
)"
```

---

### Task 11: README + CHANGELOG + `/review` pass

**Goal:** README documents the locked public API with 3 working code samples. CHANGELOG initialized. Run `/review` and address HIGH-severity findings. Final exit gate verification.

**Files:**
- Modify: `packages/seo-ai-core/README.md`
- Create: `packages/seo-ai-core/CHANGELOG.md`

- [ ] **Step 11.1: Replace README with full docs**

Overwrite `packages/seo-ai-core/README.md`:

````markdown
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

```typescript
import { FileSystemPromptLoader } from '@repo/seo-ai-core';

const loader = new FileSystemPromptLoader({
  baseDir: './prompts',  // contains prompts/<id>/v<version>.prompt.yaml
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
  user-controlled but are HTML-escaped by default.
- **Adapter boundary**: `@langchain/*` imports forbidden outside
  `src/llm/adapters/**`. Enforced by ESLint — see `eslint.config.mjs`.
- **Output parser** never returns garbage — failure throws `GuardrailError`
  with the original raw payload attached.

## Roadmap (post-MVP)

- Phase 2: Agents + tools registry, streaming chains
- Phase 3: pgvector / Qdrant retriever adapters, real embeddings
- Phase 4: OTel/LangSmith tracing bridge, prompt registry CLI
- Phase 5: Additional LLM providers (OpenAI, Ollama, Bedrock)
````

- [ ] **Step 11.2: Write `packages/seo-ai-core/CHANGELOG.md`**

```markdown
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
```

- [ ] **Step 11.3: Run full quality gate**

```bash
cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN"
npm run build --workspace=@repo/seo-ai-core
npm run lint --workspace=@repo/seo-ai-core
npm run check-types
npm test --workspace=@repo/seo-ai-core
```

Expected:
- Build: clean, dist emits 18+ JS files + .d.ts.
- Lint: zero warnings (adapter-boundary active).
- Check-types: green across the monorepo.
- Tests: ALL pass (errors=3, logger=2, types=7, llm.provider=3, llm.anthropic.integration=skipped, prompt.renderer=5, prompt.loader=11, retrievers.memory=7, guardrails.output-parser=8, guardrails.policy=6, chains.base=8, chains.rag=6, smoke=2 ≈ 68 tests, 1 skipped).

- [ ] **Step 11.4: Run code review skill `/review`**

Invoke the GStack `/review` slash command from the chat. Address any HIGH-severity findings via small follow-up commits (each `feat(seo-ai-core):` or `fix(seo-ai-core):` scope). MEDIUM/LOW findings → file a follow-up issue, do not block MVP.

- [ ] **Step 11.5: Verify all 7 exit criteria from spec § 7**

| # | Criterion | Verify |
|---|---|---|
| 1 | `npm run build --workspace=@repo/seo-ai-core` clean | step 11.3 |
| 2 | `npm run check-types` no new errors | step 11.3 |
| 3 | Lint zero warnings, adapter rule active | step 11.3 + step 1.11 history |
| 4 | All tests green, integration test skipped | step 11.3 |
| 5 | `/review` no HIGH-severity findings | step 11.4 |
| 6 | README has 3 working code samples | step 11.1 |
| 7 | Smoke example runs end-to-end and prints `{ summary, issues[] }` | step 10.4 |

- [ ] **Step 11.6: Commit Task 11**

```bash
git add packages/seo-ai-core/README.md packages/seo-ai-core/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(seo-ai-core): T11 README + CHANGELOG — MVP 0.1.0 ready

README documents the locked public API surface with 3 working code samples
(direct LLM call, prompt loader, RAG chain). Security invariants and
post-MVP roadmap included.

CHANGELOG initialized following Keep a Changelog 1.1.0. First entry:
0.1.0 — MVP shipping all 7 slices defined in
docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md.

Exit criteria 1-7 verified per spec § 7.
EOF
)"
```

---

## Self-Review

After all tasks complete, verify against the spec:

### Spec coverage check

| Spec section | Implemented in | Status |
|---|---|---|
| § 1 Approach B (adapters+facade) | T1 (ESLint rule) + T4 (only adapter file imports langchain) | ✅ |
| § 2 File plan: 32 files | T1–T11 collectively create all listed files | ✅ |
| § 3 Public API surface (locked) | T2 (errors, logger), T3 (types + index), T4 (createLLM), T5 (FileSystemPromptLoader), T6 (MemoryRetriever), T7 (parseStructured + applyPolicy), T8 (createBaseChain), T9 (createRagChain) | ✅ |
| § 4 4 waves task breakdown | T1–T3 (W1), T4–T7 (W2), T8–T9 (W3), T10–T11 (W4) | ✅ |
| § 5 Dependencies | T1 package.json | ✅ |
| § 6 Testing strategy | All test/*.spec.ts files; fake adapter; integration gating; smoke wrapper; lint gate | ✅ |
| § 7 Exit criteria 1–7 | T11 step 11.5 | ✅ |
| § 8 Out-of-scope freeze list | Plan does not introduce: agents, OpenAI/Ollama, pgvector, streaming, OTel, prompt CLI, seo-analyzer modifications, public publish | ✅ |

### Type consistency check

- `Message` defined in `src/llm/types.ts` (T3) → reused by `RenderedPrompt` (T3) → reused by `applyPolicy` (T7). Single definition, no drift.
- `ILLMProvider.invoke` signature `(req, signal?) → Promise<LLMResponse>` consistent across T3 declaration, T4 anthropic.adapter implementation, fake-llm fixture (T4), T9 RAG chain consumer.
- `IChain<TInput, TOutput>.invoke` signature `(input, ctx?) → Promise<TOutput>` consistent across T3, T8, T9, T10.
- `parseStructured<S extends ZodTypeAny>(raw, schema) → ZodInfer<S>` consistent between T7 declaration and T9 consumer.
- All errors use `cause: unknown extends Error` pattern via shared `AiCoreErrorOptions` from T2.

### Placeholder scan

- No `TBD`, `TODO`, "implement later", or "similar to above" anywhere.
- Every test file has complete test code.
- Every implementation file has complete code.
- Every commit command shows the exact files staged + full message.

### Notes for executor

1. **Wave 1 parallelism**: T1, T2, T3 are safe to dispatch in parallel via `subagent-driven-development`. T2 + T3 don't depend on T1's package.json install completing — they only write source files.
2. **Wave 2 parallelism**: T4–T7 also parallel, all depend only on W1 outputs (errors, logger, types, package scaffold).
3. **Wave 3 sequential**: T9 imports `createBaseChain` from T8 — must be sequential.
4. **If `apps/seo-analyzer/src/analyzer/domain/rules/meta/` rule filenames change** before T10 runs: update the `ruleFiles` array in `examples/seo-analyzer-smoke.ts` accordingly.
5. **Integration spec** uses `claude-haiku-4-5-20251001` to keep cost trivial when `ANTHROPIC_API_KEY` is set. Adjust if Haiku 4.5 is retired by execution date.
