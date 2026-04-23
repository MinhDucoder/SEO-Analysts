# SEO Public API — Plan 3c: CLI + Narrative Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `packages/seo-check-cli/` (a workspace-local Node CLI — `seo-check --url ... --keyword ... --fail-on error`) plus 9 narrative markdown files under `docs/public-api/` so engineers can adopt the Public API from CI pipelines and from first-touch documentation — without touching any backend code.

**Architecture:** The CLI is a thin command-line front-end to the same `POST /public/check` endpoint the web playground hits. It uses `commander` to parse flags, a minimal `fetch`-based client, and `chalk`-colored terminal formatting. Exit codes drive CI gating: 0 pass, 1 CI criterion tripped, 2 network/auth, 3 bad usage. The docs directory is 9 self-contained markdown files — README as landing, 8 topic pages — that the gateway Swagger UI + Plan 3b playground link to for narrative context.

**Tech Stack:** Node 18+ (CLI), TypeScript strict, `commander` ^12, `chalk` ^5 (ESM), Vitest for tests. Zero runtime deps for docs (pure markdown).

**Spec:** `docs/superpowers/specs/2026-04-22-seo-public-api-design.md` — "SDK snippet", "CLI", "Docs structure".

**Predecessor:** tag `public-api-plan-2-done` is sufficient — Plan 3c does NOT depend on Plan 3a or 3b. It can run in parallel.

**Successor:** none for Plan 3. Future: npm publish + GitHub Action wrapper (deferred to v0.2).

**Scope out of this plan:**
- npm publish of CLI (stays workspace-local — `npm exec --workspace packages/seo-check-cli -- seo-check ...`)
- CLI SDK package on registry
- GitHub Action (referenced from docs, not shipped)
- Playground web UI (3b)
- apps/web scaffold (3a)

---

## File Structure

### New files

```
packages/seo-check-cli/
├── package.json                    CREATE (bin, commander, chalk)
├── tsconfig.json                   CREATE (extends @repo/typescript-config/base.json)
├── tsconfig.build.json             CREATE
├── vitest.config.ts                CREATE
├── eslint.config.mjs               CREATE
├── .gitignore                      CREATE
├── README.md                       CREATE
├── src/
│   ├── index.ts                    CREATE (barrel: SeoClient, formatResult for programmatic use)
│   ├── cli.ts                      CREATE (commander entry — #!/usr/bin/env node)
│   ├── client.ts                   CREATE (fetch wrapper, Bearer sk_*)
│   ├── formatter.ts                CREATE (chalk terminal output + gate evaluation)
│   └── args.ts                     CREATE (parse + validate args; extracted for testability)
└── test/
    ├── client.spec.ts              CREATE (mocked fetch: happy + 4xx + 5xx)
    ├── formatter.spec.ts           CREATE (evaluateGate + render snapshot-ish)
    └── args.spec.ts                CREATE (arg validation matrix)

docs/public-api/
├── README.md                       CREATE (overview + links)
├── getting-started.md              CREATE (register → create key → first cURL)
├── input-types.md                  CREATE (url / markdown / html with examples)
├── output-schema.md                CREATE (field-by-field PublicCheckResponse reference)
├── error-codes.md                  CREATE (15 error codes from spec table)
├── rate-limits.md                  CREATE (buckets + headers + Retry-After semantics)
├── sdk-js.md                       CREATE (40-line TS snippet for consumers)
├── cli.md                          CREATE (CLI usage + GitHub Action example)
└── changelog.md                    CREATE (additive v1 log)
```

### Modified files

```
package-lock.json                   MODIFY (new workspace package)
```

### Dependency direction

```
packages/seo-check-cli  →  depends on: commander, chalk only
                          (no monorepo deps — self-contained, future-publishable)
                          (NO dep on @repo/seo-ai-core, @repo/shared, gateway)
```

Keeping zero workspace deps makes eventual `npm publish` frictionless — the CLI ships a minimal footprint.

---

## Conventions used in this plan

- All file paths absolute to repo root.
- TDD order for every code task: test → fail → implement → pass → commit. Docs tasks ship the markdown; no test loop.
- Commit scope: `cli` for `packages/seo-check-cli/`; `docs` for `docs/public-api/**`.
- Never `--no-verify`.
- No Claude trailer in commits.
- CLI dev loop: `npm run build --workspace=@repo/seo-check-cli && node packages/seo-check-cli/dist/cli.js --help`. (After Plan 3c lands, the preferred invocation is `npm exec -w packages/seo-check-cli seo-check -- --help`.)
- Node 18+ target (native `fetch`, no node-fetch dep).
- Chalk 5 is ESM-only. The CLI uses ESM output (`"type": "module"` in package.json + `module: NodeNext`).
- The CLI never reads the environment unless `--env <VAR_NAME>` is passed (opt-in), to prevent accidental leakage of `ANTHROPIC_API_KEY` (which belongs to the gateway) into CLI logs.

---

# Phase C — Package bootstrap

## Task C1: `packages/seo-check-cli/package.json` + tsconfig + vitest + eslint + .gitignore

**Files:**
- Create: `packages/seo-check-cli/package.json`
- Create: `packages/seo-check-cli/tsconfig.json`
- Create: `packages/seo-check-cli/tsconfig.build.json`
- Create: `packages/seo-check-cli/vitest.config.ts`
- Create: `packages/seo-check-cli/eslint.config.mjs`
- Create: `packages/seo-check-cli/.gitignore`

- [ ] **Step 1: `packages/seo-check-cli/package.json`**

```json
{
  "name": "@repo/seo-check-cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "bin": {
    "seo-check": "./dist/cli.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json && chmod +x dist/cli.js",
    "check-types": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "*",
    "@repo/typescript-config": "*",
    "@types/node": "^22.10.2",
    "eslint": "^9.39.1",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  },
  "engines": {
    "node": ">=18.18.0"
  }
}
```

- [ ] **Step 2: `packages/seo-check-cli/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test", "**/*.spec.ts"]
}
```

- [ ] **Step 3: `packages/seo-check-cli/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["dist", "node_modules", "test", "**/*.spec.ts"]
}
```

- [ ] **Step 4: `packages/seo-check-cli/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
  },
});
```

- [ ] **Step 5: `packages/seo-check-cli/eslint.config.mjs`**

```javascript
import { config as base } from '@repo/eslint-config/base';

export default [
  ...base,
  {
    ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**'],
  },
];
```

- [ ] **Step 6: `packages/seo-check-cli/.gitignore`**

```
dist
.turbo
coverage
*.tsbuildinfo
```

- [ ] **Step 7: Install**

Run: `npm install` (from repo root)
Expected: packages added; `commander` + `chalk` resolved.

- [ ] **Step 8: Commit**

```bash
git add packages/seo-check-cli/package.json packages/seo-check-cli/tsconfig.json packages/seo-check-cli/tsconfig.build.json packages/seo-check-cli/vitest.config.ts packages/seo-check-cli/eslint.config.mjs packages/seo-check-cli/.gitignore package-lock.json
git commit -m "chore(cli): bootstrap @repo/seo-check-cli (commander + chalk)"
```

---

# Phase D — CLI source

## Task D1: Typed response + `client.ts`

**Files:**
- Create: `packages/seo-check-cli/src/client.ts`
- Create: `packages/seo-check-cli/test/client.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/seo-check-cli/test/client.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeoClient, SeoApiError } from '../src/client';

describe('SeoClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('check(): POSTs JSON with Bearer header and returns parsed response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ score: 90, issues: [], meta: { enrichMode: 'llm' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const c = new SeoClient({ apiBase: 'http://x/v1', apiKey: 'sk_live_K' });
    const res = await c.check({
      input: { type: 'url', url: 'https://x' },
      targetKeyword: 'seo',
    });
    expect(res.score).toBe(90);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://x/v1/public/check');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk_live_K');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('4xx: throws SeoApiError with status + parsed code', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_API_KEY', message: 'bad key' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const c = new SeoClient({ apiBase: 'http://x/v1', apiKey: 'bad' });
    let caught: unknown;
    try {
      await c.check({ input: { type: 'url', url: 'https://x' }, targetKeyword: 's' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SeoApiError);
    expect((caught as SeoApiError).status).toBe(401);
    expect((caught as SeoApiError).code).toBe('INVALID_API_KEY');
  });

  it('network error: throws SeoApiError with status=0', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const c = new SeoClient({ apiBase: 'http://x/v1', apiKey: 'k' });
    let caught: unknown;
    try {
      await c.check({ input: { type: 'url', url: 'https://x' }, targetKeyword: 's' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SeoApiError);
    expect((caught as SeoApiError).status).toBe(0);
    expect((caught as SeoApiError).message).toContain('ECONNREFUSED');
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npm test --workspace=@repo/seo-check-cli -- client`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/client.ts`**

```typescript
/**
 * @file Minimal fetch wrapper for POST /public/check. Zero monorepo
 * deps — the CLI should eventually be publishable as a standalone npm
 * package.
 */

export interface SeoClientOptions {
  apiBase: string;
  apiKey: string;
}

export interface PublicCheckRequest {
  input:
    | { type: 'url'; url: string }
    | { type: 'markdown'; markdown: string }
    | { type: 'html'; html: string };
  targetKeyword: string;
  secondaryKeywords?: string[];
  options?: {
    enrichMode?: 'off' | 'template' | 'llm';
    language?: 'vi' | 'en';
    includeSummary?: boolean;
    filter?: {
      categories?: string[];
      audiences?: Array<'writer' | 'dev'>;
      minSeverity?: 'info' | 'warning' | 'error';
    };
  };
}

export interface SuggestionOut {
  type: 'rewrite' | 'add' | 'remove' | 'reorder';
  text: string;
  rationale: string;
}

export interface IssueOut {
  ruleId: string;
  severity: 'info' | 'warning' | 'error';
  category: string;
  audience: Array<'writer' | 'dev'>;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestion: SuggestionOut | null;
  docRef?: string;
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: IssueOut[];
  summary?: { writer: string; dev: string };
  meta: {
    inputType: 'url' | 'markdown' | 'html';
    resolvedUrl?: string;
    contentStats: { words: number; characters: number; readingTimeSec: number };
    processingTimeMs: number;
    ruleVersion: string;
    enrichMode: 'off' | 'template' | 'llm';
    suggestionSource: 'llm' | 'template' | 'mixed' | 'none';
    degraded: boolean;
    cached: boolean;
    requestId: string;
    usage: {
      remaining: { minute: number; day: number };
      resetAt: { minute: string; day: string };
    };
  };
}

export class SeoApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly raw?: unknown;
  constructor(message: string, status: number, code?: string, raw?: unknown) {
    super(message);
    this.name = 'SeoApiError';
    this.status = status;
    this.code = code;
    this.raw = raw;
  }
}

export class SeoClient {
  constructor(private readonly opts: SeoClientOptions) {}

  async check(body: PublicCheckRequest): Promise<PublicCheckResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.opts.apiBase}/public/check`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new SeoApiError(
        err instanceof Error ? err.message : 'network error',
        0,
        'NETWORK',
        err,
      );
    }
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) {
      const p = parsed as { message?: string; code?: string } | null;
      throw new SeoApiError(
        p?.message ?? `HTTP ${res.status}`,
        res.status,
        p?.code,
        parsed,
      );
    }
    return parsed as PublicCheckResponse;
  }
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@repo/seo-check-cli -- client`
Expected: PASS 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/seo-check-cli/src/client.ts packages/seo-check-cli/test/client.spec.ts
git commit -m "feat(cli): SeoClient (fetch wrapper, Bearer auth, SeoApiError)"
```

---

## Task D2: Args parser + validation

**Files:**
- Create: `packages/seo-check-cli/src/args.ts`
- Create: `packages/seo-check-cli/test/args.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/seo-check-cli/test/args.spec.ts
import { describe, it, expect } from 'vitest';
import { validateArgs, type ParsedArgs } from '../src/args';

function makeArgs(partial: Partial<ParsedArgs> = {}): ParsedArgs {
  return {
    url: undefined,
    file: undefined,
    mode: undefined,
    keyword: 'seo',
    secondary: [],
    enrich: 'llm',
    language: 'vi',
    format: 'pretty',
    failOn: undefined,
    minScore: undefined,
    apiKey: 'sk_test_K',
    apiBase: 'http://localhost:3000/api/v1',
    ...partial,
  };
}

describe('validateArgs', () => {
  it('passes when --url + --keyword provided', () => {
    const r = validateArgs(makeArgs({ url: 'https://x' }));
    expect(r.ok).toBe(true);
  });

  it('fails when neither --url nor --file provided', () => {
    const r = validateArgs(makeArgs());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--url or --file/i);
  });

  it('fails when both --url and --file provided', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', file: '/tmp/a.md' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/exactly one/i);
  });

  it('fails when --file without --mode', () => {
    const r = validateArgs(makeArgs({ file: '/tmp/a.md' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--mode/i);
  });

  it('fails when --keyword is empty', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', keyword: '' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/keyword/i);
  });

  it('fails when --apikey missing', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', apiKey: '' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/api key/i);
  });

  it('fails when --min-score out of range', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', minScore: 150 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/min-score/i);
  });

  it('fails when --fail-on invalid', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', failOn: 'garbage' as never }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/fail-on/i);
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npm test --workspace=@repo/seo-check-cli -- args`
Expected: FAIL.

- [ ] **Step 3: Implement `src/args.ts`**

```typescript
/**
 * @file Arg validation extracted from commander so the rules are
 * unit-testable. `validateArgs` returns a discriminated union so the
 * CLI entry-point can map error → exit code 3 cleanly.
 */

export type EnrichMode = 'off' | 'template' | 'llm';
export type Language = 'vi' | 'en';
export type Format = 'pretty' | 'json';
export type FailOn = 'error' | 'warning' | 'info';
export type InputMode = 'markdown' | 'html';

export interface ParsedArgs {
  url?: string;
  file?: string;
  mode?: InputMode;
  keyword: string;
  secondary: string[];
  enrich: EnrichMode;
  language: Language;
  format: Format;
  failOn?: FailOn;
  minScore?: number;
  apiKey: string;
  apiBase: string;
}

export type ValidationResult =
  | { ok: true; args: ParsedArgs }
  | { ok: false; error: string };

const FAIL_ON: readonly FailOn[] = ['error', 'warning', 'info'] as const;
const ENRICH: readonly EnrichMode[] = ['off', 'template', 'llm'] as const;
const LANG: readonly Language[] = ['vi', 'en'] as const;
const FORMAT: readonly Format[] = ['pretty', 'json'] as const;
const MODE: readonly InputMode[] = ['markdown', 'html'] as const;

export function validateArgs(args: ParsedArgs): ValidationResult {
  if (!args.apiKey || args.apiKey.trim().length === 0) {
    return { ok: false, error: 'Missing API key. Pass --api-key or --env SEO_API_KEY.' };
  }
  const hasUrl = typeof args.url === 'string' && args.url.length > 0;
  const hasFile = typeof args.file === 'string' && args.file.length > 0;
  if (!hasUrl && !hasFile) {
    return { ok: false, error: 'Provide --url or --file.' };
  }
  if (hasUrl && hasFile) {
    return { ok: false, error: 'Provide exactly one of --url or --file.' };
  }
  if (hasFile && !args.mode) {
    return { ok: false, error: '--file requires --mode markdown|html.' };
  }
  if (args.mode && !MODE.includes(args.mode)) {
    return { ok: false, error: `Invalid --mode (must be one of: ${MODE.join('|')}).` };
  }
  if (!args.keyword || args.keyword.trim().length === 0) {
    return { ok: false, error: 'Missing --keyword.' };
  }
  if (!ENRICH.includes(args.enrich)) {
    return { ok: false, error: `Invalid --enrich (must be one of: ${ENRICH.join('|')}).` };
  }
  if (!LANG.includes(args.language)) {
    return { ok: false, error: `Invalid --language (must be one of: ${LANG.join('|')}).` };
  }
  if (!FORMAT.includes(args.format)) {
    return { ok: false, error: `Invalid --format (must be one of: ${FORMAT.join('|')}).` };
  }
  if (args.failOn !== undefined && !FAIL_ON.includes(args.failOn)) {
    return { ok: false, error: `Invalid --fail-on (must be one of: ${FAIL_ON.join('|')}).` };
  }
  if (
    args.minScore !== undefined &&
    (Number.isNaN(args.minScore) || args.minScore < 0 || args.minScore > 100)
  ) {
    return { ok: false, error: '--min-score must be an integer in [0, 100].' };
  }
  return { ok: true, args };
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@repo/seo-check-cli -- args`
Expected: PASS 8 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/seo-check-cli/src/args.ts packages/seo-check-cli/test/args.spec.ts
git commit -m "feat(cli): args parser + validator"
```

---

## Task D3: Formatter + CI gate evaluator

**Files:**
- Create: `packages/seo-check-cli/src/formatter.ts`
- Create: `packages/seo-check-cli/test/formatter.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/seo-check-cli/test/formatter.spec.ts
import { describe, it, expect } from 'vitest';
import { evaluateGate, type GateInput } from '../src/formatter';
import type { PublicCheckResponse } from '../src/client';

function resp(extras: Partial<PublicCheckResponse> = {}): PublicCheckResponse {
  return {
    score: 80,
    scoreBreakdown: { meta: 80, content: 80 },
    issues: [],
    meta: {
      inputType: 'html',
      contentStats: { words: 1, characters: 1, readingTimeSec: 1 },
      processingTimeMs: 100,
      ruleVersion: '1.2.0',
      enrichMode: 'template',
      suggestionSource: 'template',
      degraded: false,
      cached: false,
      requestId: 'req_1',
      usage: {
        remaining: { minute: 19, day: 499 },
        resetAt: { minute: '', day: '' },
      },
    },
    ...extras,
  };
}

const issue = (severity: 'info' | 'warning' | 'error') => ({
  ruleId: 'x',
  severity,
  category: 'meta',
  audience: ['writer' as const],
  title: 't',
  description: 'd',
  evidence: {},
  suggestion: null,
});

describe('evaluateGate', () => {
  it('pass when no gates set', () => {
    const g: GateInput = { response: resp(), failOn: undefined, minScore: undefined };
    const r = evaluateGate(g);
    expect(r.pass).toBe(true);
  });

  it('fails on --min-score when score below', () => {
    const g: GateInput = { response: resp({ score: 50 }), failOn: undefined, minScore: 70 };
    const r = evaluateGate(g);
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/min-score/i);
  });

  it('passes when score >= --min-score', () => {
    const g: GateInput = { response: resp({ score: 80 }), failOn: undefined, minScore: 70 };
    expect(evaluateGate(g).pass).toBe(true);
  });

  it('fails on --fail-on=error when any error issue exists', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('warning'), issue('error')] }),
      failOn: 'error',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(false);
  });

  it('passes --fail-on=error when only warnings', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('warning'), issue('info')] }),
      failOn: 'error',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(true);
  });

  it('--fail-on=warning catches warnings + errors', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('warning')] }),
      failOn: 'warning',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(false);
  });

  it('--fail-on=info catches everything including info', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('info')] }),
      failOn: 'info',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npm test --workspace=@repo/seo-check-cli -- formatter`
Expected: FAIL.

- [ ] **Step 3: Implement `src/formatter.ts`**

```typescript
/**
 * @file Terminal rendering + CI-gate evaluation. `renderPretty` writes
 * chalk-colored output to stdout; `renderJson` dumps raw JSON.
 * `evaluateGate` is the pure function the CLI uses to decide exit
 * code 1 (gate tripped) vs 0 (pass).
 */
import chalk from 'chalk';
import type { PublicCheckResponse, IssueOut } from './client.js';
import type { FailOn } from './args.js';

const SEVERITY_ORDER: Record<'info' | 'warning' | 'error', number> = {
  info: 0,
  warning: 1,
  error: 2,
};

const SEVERITY_THRESHOLD: Record<FailOn, number> = {
  error: SEVERITY_ORDER.error,
  warning: SEVERITY_ORDER.warning,
  info: SEVERITY_ORDER.info,
};

export interface GateInput {
  response: PublicCheckResponse;
  failOn: FailOn | undefined;
  minScore: number | undefined;
}

export type GateResult =
  | { pass: true }
  | { pass: false; reason: string };

export function evaluateGate(g: GateInput): GateResult {
  if (typeof g.minScore === 'number' && g.response.score < g.minScore) {
    return {
      pass: false,
      reason: `score ${g.response.score} < --min-score ${g.minScore}`,
    };
  }
  if (g.failOn) {
    const threshold = SEVERITY_THRESHOLD[g.failOn];
    const offending = g.response.issues.find(
      (i) => SEVERITY_ORDER[i.severity] >= threshold,
    );
    if (offending) {
      return {
        pass: false,
        reason: `--fail-on ${g.failOn} tripped by rule ${offending.ruleId} (${offending.severity})`,
      };
    }
  }
  return { pass: true };
}

function severityColor(sev: 'info' | 'warning' | 'error'): (s: string) => string {
  switch (sev) {
    case 'error':
      return chalk.red.bold;
    case 'warning':
      return chalk.yellow.bold;
    case 'info':
      return chalk.cyan;
  }
}

export function renderPretty(response: PublicCheckResponse): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold(`SEO score: ${chalk.cyan(response.score)}/100`));
  lines.push(
    chalk.dim(
      `  rule v${response.meta.ruleVersion} · ${response.meta.enrichMode} · ${response.meta.processingTimeMs}ms` +
        (response.meta.degraded ? chalk.yellow(' · degraded') : '') +
        (response.meta.cached ? chalk.dim(' · cached') : ''),
    ),
  );

  const breakdown = Object.entries(response.scoreBreakdown);
  if (breakdown.length) {
    lines.push('');
    lines.push(chalk.bold('Breakdown'));
    for (const [cat, score] of breakdown) {
      const bar = '█'.repeat(Math.max(1, Math.round(score / 5))).padEnd(20, ' ');
      lines.push(`  ${cat.padEnd(14)} ${chalk.cyan(bar)} ${score}`);
    }
  }

  if (response.issues.length === 0) {
    lines.push('');
    lines.push(chalk.green('No issues.'));
  } else {
    lines.push('');
    lines.push(chalk.bold(`Issues (${response.issues.length})`));
    for (const issue of response.issues) renderIssue(issue, lines);
  }

  lines.push('');
  lines.push(
    chalk.dim(
      `Usage: ${response.meta.usage.remaining.minute}/min · ${response.meta.usage.remaining.day}/day · req=${response.meta.requestId}`,
    ),
  );
  lines.push('');
  return lines.join('\n');
}

function renderIssue(issue: IssueOut, out: string[]): void {
  const color = severityColor(issue.severity);
  const tag = color(`[${issue.severity.toUpperCase()}]`);
  out.push(`  ${tag} ${chalk.bold(issue.title)} ${chalk.dim('(' + issue.ruleId + ')')}`);
  out.push(`    ${chalk.dim(issue.category + ' · ' + issue.audience.join(','))}`);
  out.push(`    ${issue.description}`);
  if (issue.suggestion) {
    out.push(
      `    ${chalk.green('→')} ${chalk.italic(issue.suggestion.text)}`,
    );
    if (issue.suggestion.rationale) {
      out.push(`      ${chalk.dim(issue.suggestion.rationale)}`);
    }
  }
}

export function renderJson(response: PublicCheckResponse): string {
  return JSON.stringify(response, null, 2);
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@repo/seo-check-cli -- formatter`
Expected: PASS 7 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/seo-check-cli/src/formatter.ts packages/seo-check-cli/test/formatter.spec.ts
git commit -m "feat(cli): evaluateGate + renderPretty/renderJson"
```

---

## Task D4: CLI entry + barrel

**Files:**
- Create: `packages/seo-check-cli/src/index.ts`
- Create: `packages/seo-check-cli/src/cli.ts`

- [ ] **Step 1: Write `src/index.ts` (programmatic barrel)**

```typescript
export { SeoClient, SeoApiError } from './client.js';
export type {
  SeoClientOptions,
  PublicCheckRequest,
  PublicCheckResponse,
  IssueOut,
  SuggestionOut,
} from './client.js';
export { evaluateGate, renderPretty, renderJson } from './formatter.js';
export type { GateInput, GateResult } from './formatter.js';
export { validateArgs } from './args.js';
export type {
  ParsedArgs,
  EnrichMode,
  Language,
  Format,
  FailOn,
  InputMode,
  ValidationResult,
} from './args.js';
```

- [ ] **Step 2: Write `src/cli.ts`**

```typescript
#!/usr/bin/env node
/**
 * @file seo-check CLI entry. Parses argv via commander, validates,
 * reads file contents when --file is used, calls SeoClient, and
 * applies the gate. Exit codes:
 *   0  pass (or criterion satisfied)
 *   1  CI gate tripped (--fail-on / --min-score)
 *   2  network / auth / API error
 *   3  invalid usage
 */
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  validateArgs,
  type EnrichMode,
  type FailOn,
  type Format,
  type InputMode,
  type Language,
} from './args.js';
import {
  SeoApiError,
  SeoClient,
  type PublicCheckRequest,
} from './client.js';
import { evaluateGate, renderJson, renderPretty } from './formatter.js';

interface CliOpts {
  url?: string;
  file?: string;
  mode?: string;
  keyword?: string;
  secondary?: string;
  enrich?: string;
  language?: string;
  format?: string;
  failOn?: string;
  minScore?: string;
  apiKey?: string;
  apiBase?: string;
  env?: string;
}

export async function runCli(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name('seo-check')
    .description('SEO Analyst Public API CLI')
    .option('--url <url>', 'URL to analyze')
    .option('--file <path>', 'Path to markdown or HTML file')
    .option('--mode <markdown|html>', 'File mode when --file is used')
    .option('--keyword <kw>', 'Target keyword (required)')
    .option('--secondary <csv>', 'Secondary keywords (comma-separated, ≤5)')
    .option('--enrich <off|template|llm>', 'Enrichment mode', 'llm')
    .option('--language <vi|en>', 'Suggestion language', 'vi')
    .option('--format <pretty|json>', 'Output format', 'pretty')
    .option('--fail-on <error|warning|info>', 'CI gate: exit 1 if any issue at/above severity')
    .option('--min-score <n>', 'CI gate: exit 1 if score below N')
    .option('--api-key <key>', 'API key (sk_live_…|sk_test_…)')
    .option('--env <VAR>', 'Read API key from env var (opt-in)', 'SEO_API_KEY')
    .option('--api-base <url>', 'Gateway base URL', 'http://localhost:3000/api/v1')
    .parse(argv, { from: 'user' });

  const opts = program.opts<CliOpts>();

  const apiKey = opts.apiKey ?? (opts.env ? process.env[opts.env] : undefined) ?? '';
  const validation = validateArgs({
    url: opts.url,
    file: opts.file,
    mode: opts.mode as InputMode | undefined,
    keyword: opts.keyword ?? '',
    secondary: (opts.secondary ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    enrich: (opts.enrich as EnrichMode | undefined) ?? 'llm',
    language: (opts.language as Language | undefined) ?? 'vi',
    format: (opts.format as Format | undefined) ?? 'pretty',
    failOn: opts.failOn as FailOn | undefined,
    minScore: opts.minScore !== undefined ? Number(opts.minScore) : undefined,
    apiKey,
    apiBase: opts.apiBase ?? 'http://localhost:3000/api/v1',
  });

  if (!validation.ok) {
    process.stderr.write(chalk.red(`error: ${validation.error}\n`));
    return 3;
  }

  const args = validation.args;
  let body: PublicCheckRequest;
  if (args.url) {
    body = {
      input: { type: 'url', url: args.url },
      targetKeyword: args.keyword,
      secondaryKeywords: args.secondary.slice(0, 5),
      options: { enrichMode: args.enrich, language: args.language },
    };
  } else {
    let text: string;
    try {
      text = await readFile(args.file!, 'utf8');
    } catch (err) {
      process.stderr.write(
        chalk.red(`error: cannot read --file ${args.file}: ${err instanceof Error ? err.message : String(err)}\n`),
      );
      return 3;
    }
    body = {
      input:
        args.mode === 'html'
          ? { type: 'html', html: text }
          : { type: 'markdown', markdown: text },
      targetKeyword: args.keyword,
      secondaryKeywords: args.secondary.slice(0, 5),
      options: { enrichMode: args.enrich, language: args.language },
    };
  }

  const client = new SeoClient({ apiBase: args.apiBase, apiKey: args.apiKey });
  let response;
  try {
    response = await client.check(body);
  } catch (err) {
    if (err instanceof SeoApiError) {
      process.stderr.write(
        chalk.red(`error (${err.status}${err.code ? ' ' + err.code : ''}): ${err.message}\n`),
      );
    } else {
      process.stderr.write(
        chalk.red(`error: ${err instanceof Error ? err.message : String(err)}\n`),
      );
    }
    return 2;
  }

  if (args.format === 'json') {
    process.stdout.write(renderJson(response) + '\n');
  } else {
    process.stdout.write(renderPretty(response));
  }

  const gate = evaluateGate({
    response,
    failOn: args.failOn,
    minScore: args.minScore,
  });
  if (!gate.pass) {
    process.stderr.write(chalk.yellow(`gate tripped: ${gate.reason}\n`));
    return 1;
  }
  return 0;
}

// ESM entry
// In tests we import `runCli` directly and do not execute this branch.
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((code) => process.exit(code));
}
```

- [ ] **Step 3: Build + smoke `--help`**

```bash
npm run build --workspace=@repo/seo-check-cli
node packages/seo-check-cli/dist/cli.js --help
```
Expected: help text including all flags; no runtime errors.

- [ ] **Step 4: Smoke with bad args (exit 3)**

```bash
node packages/seo-check-cli/dist/cli.js --keyword seo ; echo "exit=$?"
```
Expected: `error: Missing API key…` or `error: Provide --url or --file.`; `exit=3`.

- [ ] **Step 5: Smoke against live stack (optional — requires docker up + a real key)**

```bash
node packages/seo-check-cli/dist/cli.js \
  --url https://example.com --keyword seo \
  --api-key $SEO_API_KEY --enrich template --format json
```
Expected: JSON response body; `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add packages/seo-check-cli/src/cli.ts packages/seo-check-cli/src/index.ts
git commit -m "feat(cli): seo-check entry — commander + validate + client + gate"
```

---

## Task D5: README

**Files:**
- Create: `packages/seo-check-cli/README.md`

- [ ] **Step 1: Write the README**

```markdown
# @repo/seo-check-cli

Command-line front-end for the SEO Analyst Public API.

## Install (workspace-local)

```bash
# From the monorepo root
npm exec -w packages/seo-check-cli seo-check -- --help
```

## Usage

```bash
# Analyze a URL
seo-check --url https://your-blog.com/post \
  --keyword "seo 2026" \
  --api-key $SEO_API_KEY

# Analyze a local file
seo-check --file ./article.md --mode markdown \
  --keyword "on-page seo" \
  --api-key $SEO_API_KEY

# CI gate: exit 1 if any error issue OR score below 70
seo-check --url https://... --keyword "seo" \
  --fail-on error --min-score 70 \
  --api-key $SEO_API_KEY

# Machine-readable
seo-check --url https://... --keyword "seo" --format json
```

## Exit codes

- `0` — pass (or criterion met)
- `1` — CI gate tripped (`--fail-on` or `--min-score`)
- `2` — network / auth / API error
- `3` — invalid usage

## Flags

| Flag | Description | Default |
|---|---|---|
| `--url <url>` | URL to analyze | — |
| `--file <path>` | Local markdown or HTML file | — |
| `--mode markdown\|html` | Required when `--file` is used | — |
| `--keyword <kw>` | Target keyword (required) | — |
| `--secondary <csv>` | Secondary keywords, ≤5 | — |
| `--enrich off\|template\|llm` | Enrichment mode | `llm` |
| `--language vi\|en` | Suggestion language | `vi` |
| `--format pretty\|json` | Output format | `pretty` |
| `--fail-on error\|warning\|info` | CI severity gate | off |
| `--min-score <n>` | CI score gate [0,100] | off |
| `--api-key <key>` | Inline API key | — |
| `--env <VAR>` | Read API key from env var | `SEO_API_KEY` |
| `--api-base <url>` | Gateway base URL | `http://localhost:3000/api/v1` |

## Programmatic use

```typescript
import { SeoClient } from '@repo/seo-check-cli';

const client = new SeoClient({ apiBase: '…', apiKey: 'sk_live_…' });
const res = await client.check({
  input: { type: 'url', url: 'https://…' },
  targetKeyword: 'seo 2026',
});
console.log(res.score);
```
```

- [ ] **Step 2: Commit**

```bash
git add packages/seo-check-cli/README.md
git commit -m "docs(cli): README — usage, flags, exit codes, programmatic example"
```

---

# Phase E — Narrative docs

## Task E1: `docs/public-api/README.md`

**Files:**
- Create: `docs/public-api/README.md`

- [ ] **Step 1: Write**

```markdown
# SEO Analyst — Public API

> HTTP + JSON API for SEO content checks. For content writers working in a CMS, for engineers gating CI on-page SEO rules, and for anyone who doesn't want to paste into a tool.

## Quick links

- [Getting started](./getting-started.md)
- [Input types](./input-types.md) — URL / Markdown / HTML
- [Output schema](./output-schema.md)
- [Error codes](./error-codes.md)
- [Rate limits](./rate-limits.md)
- [JavaScript SDK snippet](./sdk-js.md)
- [CLI](./cli.md)
- [Changelog](./changelog.md)
- Interactive Swagger UI: `http://<gateway>/api/v1/public/docs`
- Playground (paste-and-check): `http://<web>/playground`

## At a glance

- One endpoint: `POST /api/v1/public/check`
- Three input shapes: `url`, `markdown`, `html`
- Three enrichment modes: `off` (rule-level only), `template` (rule-rendered suggestion string), `llm` (LLM-rewritten suggestion)
- Sync response — no queue, no webhook; p95 < 4s even with LLM
- Auth: single `Authorization: Bearer sk_live_…` header
- Rate limits: 20/min/key, 500/day/key (see [rate-limits.md](./rate-limits.md))

## Next

Read [getting-started.md](./getting-started.md) for a first successful request in under two minutes.
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/README.md
git commit -m "docs(public-api): README overview + navigation"
```

---

## Task E2: `getting-started.md`

**Files:**
- Create: `docs/public-api/getting-started.md`

- [ ] **Step 1: Write**

```markdown
# Getting started

## 1. Create an account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"StrongPass123!","fullName":"You"}'
```

Or register via the web UI at `/register`.

## 2. Log in and copy your access token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"StrongPass123!"}'
# → { "user": {...}, "accessToken": "<jwt>" }
```

## 3. Create an API key

```bash
curl -X POST http://localhost:3000/api/v1/users/me/api-keys \
  -H "authorization: Bearer <jwt>" \
  -H 'content-type: application/json' \
  -d '{"name":"My CI","environment":"test"}'
# → { "id": "...", "prefix": "sk_test_abc12345", "plaintext": "sk_test_abc12345xxxxxx..." }
```

> **Save `plaintext` immediately** — the server won't show it again.

## 4. Make your first check

```bash
curl -X POST http://localhost:3000/api/v1/public/check \
  -H "authorization: Bearer sk_test_abc12345..." \
  -H 'content-type: application/json' \
  -d '{
    "input": { "type": "url", "url": "https://example.com/post" },
    "targetKeyword": "seo 2026",
    "options": { "enrichMode": "template", "language": "vi" }
  }'
```

The response is documented in [output-schema.md](./output-schema.md).

## 5. Next steps

- Try other input types: [input-types.md](./input-types.md)
- Gate CI with the CLI: [cli.md](./cli.md)
- Understand errors: [error-codes.md](./error-codes.md)
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/getting-started.md
git commit -m "docs(public-api): getting-started walkthrough"
```

---

## Task E3: `input-types.md`

**Files:**
- Create: `docs/public-api/input-types.md`

- [ ] **Step 1: Write**

```markdown
# Input types

`POST /public/check` accepts three mutually-exclusive input shapes via `input.type`.

## URL

```json
{
  "input": { "type": "url", "url": "https://draft.example/post-123" },
  "targetKeyword": "seo 2026"
}
```

Behavior:
- Gateway calls the crawler's `LiteFetch` (Cheerio-only, no Playwright).
- SSRF rules reject private IPs, loopback, link-local, AWS metadata, `.local` hostnames.
- Timeout 10s (configurable server-side).
- `meta.resolvedUrl` echoes the final URL after redirects.

## Markdown

```json
{
  "input": { "type": "markdown", "markdown": "# Title\n\nBody…" },
  "targetKeyword": "on-page"
}
```

Gateway renders markdown → HTML via the `marked` library then analyzes the resulting HTML. Max 200 KB.

## HTML

```json
{
  "input": { "type": "html", "html": "<html><title>...</title><body>...</body></html>" },
  "targetKeyword": "seo"
}
```

Raw HTML. Max 200 KB. Useful for CMS plugins that already have the rendered page.

## Only one field may be set

```json
{
  "input": { "type": "url", "markdown": "..." }   // ❌ 422 INPUT_TYPE_MISMATCH
}
```

The gateway validates that `input.type` matches exactly one of `url` / `markdown` / `html` and that the other two are absent.
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/input-types.md
git commit -m "docs(public-api): input-types reference"
```

---

## Task E4: `output-schema.md`

**Files:**
- Create: `docs/public-api/output-schema.md`

- [ ] **Step 1: Write**

```markdown
# Output schema

Every `POST /public/check` response follows this shape:

```jsonc
{
  "score": 78,                             // 0–100 composite
  "scoreBreakdown": {
    "content": 85, "meta": 70, "technical": 72, "accessibility": 88
  },
  "issues": [
    {
      "ruleId": "title-length",
      "severity": "warning",               // "error" | "warning" | "info"
      "category": "meta",                  // content | meta | technical | accessibility | headings | images | links
      "audience": ["writer"],              // subset of ["writer", "dev"]
      "title": "Title quá ngắn",
      "description": "Title có 25 ký tự, khuyến nghị 50-60.",
      "evidence": { "current": "Cách viết SEO", "currentLength": 25 },
      "suggestion": {
        "type": "rewrite",                 // rewrite | add | remove | reorder
        "text": "Cách viết SEO 2026: hướng dẫn chi tiết cho beginner",
        "rationale": "Thêm năm và đối tượng để tăng tính thời sự"
      },
      "docRef": "https://docs/rules/title-length"
    }
  ],
  "summary": {                             // only when options.includeSummary=true
    "writer": "Bài đang thiếu từ khóa chính ở H1 và title hơi ngắn…",
    "dev": "Meta title length + H1 keyword relevance là 2 blocker…"
  },
  "meta": {
    "inputType": "url",
    "resolvedUrl": "https://draft.example/post-123",
    "contentStats": { "words": 1243, "characters": 8420, "readingTimeSec": 312 },
    "processingTimeMs": 876,
    "ruleVersion": "1.2.0",
    "enrichMode": "llm",
    "suggestionSource": "llm",             // llm | template | mixed | none
    "degraded": false,                     // true when LLM was requested but not delivered
    "cached": false,
    "requestId": "req_01HW9…",
    "usage": {
      "remaining": { "minute": 17, "day": 482 },
      "resetAt": { "minute": "2026-04-22T14:08:00Z", "day": "2026-04-23T00:00:00Z" }
    }
  }
}
```

## Field-by-field

### `score`

Integer 0–100. Weighted average of rule scores (each rule is 0 / 50 / 100).

### `scoreBreakdown`

Object keyed by rule category. Each value is 0–100 computed from rules in that category.

### `issues[].severity`

- `error` — blocks good SEO (e.g., missing title, missing H1)
- `warning` — sub-optimal (e.g., title too short)
- `info` — nice-to-have

### `issues[].suggestion`

Null when `enrichMode=off`. When present:
- `type=rewrite` replaces the offending span
- `type=add` prepends content
- `type=remove` deletes matching span
- `type=reorder` (advisory only — no automatic patch)

### `meta.suggestionSource`

- `llm` — all suggestions from the LLM
- `template` — all suggestions from rule templates (default fallback)
- `mixed` — LLM produced some, template filled gaps
- `none` — `enrichMode=off`

### `meta.degraded`

`true` when `enrichMode=llm` was requested but the server fell back to template (no API key, timeout, concurrency cap, etc.). Response is **still 200 OK** — you never need to special-case this as a failure.

## Rate-limit headers

Every response also carries:

```
X-RateLimit-Limit-Minute: 20
X-RateLimit-Remaining-Minute: 17
X-RateLimit-Limit-Day: 500
X-RateLimit-Remaining-Day: 482
X-Request-Id: req_01HW9…
X-Rule-Version: 1.2.0
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/output-schema.md
git commit -m "docs(public-api): output-schema field-by-field reference"
```

---

## Task E5: `error-codes.md`

**Files:**
- Create: `docs/public-api/error-codes.md`

- [ ] **Step 1: Write**

```markdown
# Error codes

Every non-2xx response uses a consistent shape:

```json
{
  "statusCode": 422,
  "error": "ValidationError",
  "code": "INPUT_TYPE_MISMATCH",
  "message": "input.type=\"url\" but input.url is missing",
  "requestId": "req_01HW9…",
  "details": [{ "field": "input.url", "issue": "required when input.type=\"url\"" }]
}
```

Dispatch on `code` — it's stable across versions; `message` is human-readable and may change.

## Table

| HTTP | code | When |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not parseable JSON |
| 401 | `MISSING_API_KEY` | No `Authorization` header |
| 401 | `INVALID_API_KEY` | Format wrong / revoked / unknown |
| 403 | `KEY_DISABLED` | Key exists but associated account is locked |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 200 KB |
| 422 | `INPUT_TYPE_MISMATCH` | `input.type` doesn't match the payload field |
| 422 | `INVALID_URL` | Bad URL, private IP, or SSRF reject |
| 422 | `INVALID_MARKDOWN` | Markdown parser error |
| 422 | `MISSING_TARGET_KEYWORD` | `targetKeyword` absent or empty |
| 424 | `URL_FETCH_FAILED` | Target site returned 4xx/5xx |
| 424 | `URL_FETCH_TIMEOUT` | Target site timeout (>10s) |
| 429 | `RATE_LIMIT_EXCEEDED` | Bucket exhausted. Include `Retry-After` header. |
| 500 | `INTERNAL` | Unexpected gateway error |
| 502 | `ANALYZER_UNAVAILABLE` | gRPC analyzer down |
| 502 | `CRAWLER_UNAVAILABLE` | gRPC crawler down (URL input only) |
| 503 | `SERVICE_UNAVAILABLE` | Maintenance / circuit-breaker open |

## LLM failure is never an error

`enrichMode=llm` degrading to `template` returns **200 OK** with `meta.degraded: true`. Do not treat this as an error.

## Idempotency

Optionally include `Idempotency-Key: <uuid>` to deduplicate retries within 24h.
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/error-codes.md
git commit -m "docs(public-api): error-codes table + dispatch guidance"
```

---

## Task E6: `rate-limits.md`

**Files:**
- Create: `docs/public-api/rate-limits.md`

- [ ] **Step 1: Write**

```markdown
# Rate limits

Public API is billed per request against four buckets.

| Bucket | Limit | Window |
|---|---|---|
| Per key / minute | 20 | 60s sliding |
| Per key / day | 500 | 24h (UTC reset) |
| LLM concurrency per key | 5 | instant |
| Per IP / minute | 100 | 60s sliding (anti-brute) |

## Headers on every response

```
X-RateLimit-Limit-Minute: 20
X-RateLimit-Remaining-Minute: 17
X-RateLimit-Limit-Day: 500
X-RateLimit-Remaining-Day: 482
```

## 429 behavior

```
HTTP/1.1 429 Too Many Requests
Retry-After: 35
X-RateLimit-Remaining-Minute: 0
```

Back off for `Retry-After` seconds, then retry. Do not retry faster than the header indicates — repeated 429s may trip the per-IP brute bucket.

## Daily cap semantics

Daily usage resets at **00:00 UTC** regardless of your local timezone. Plan batch jobs with that in mind.

## Concurrency cap

`enrichMode=llm` is capped at **5 simultaneous requests per key**. Excess requests degrade to `template` (200 OK, `meta.degraded=true`) rather than 429, so your integration stays functional.

## Roadmap

Tiered plans (higher limits, annual billing) are planned post-MVP. Until then every key gets the same free-tier quota.
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/rate-limits.md
git commit -m "docs(public-api): rate-limits — buckets, headers, 429 semantics"
```

---

## Task E7: `sdk-js.md`

**Files:**
- Create: `docs/public-api/sdk-js.md`

- [ ] **Step 1: Write**

```markdown
# JavaScript SDK snippet

No npm package in v0.1. Copy-paste this 40-line TypeScript snippet into your project — zero deps, works in Node 18+ and modern browsers.

```typescript
// seo-client.ts
export interface PublicCheckRequest {
  input:
    | { type: 'url'; url: string }
    | { type: 'markdown'; markdown: string }
    | { type: 'html'; html: string };
  targetKeyword: string;
  secondaryKeywords?: string[];
  options?: {
    enrichMode?: 'off' | 'template' | 'llm';
    language?: 'vi' | 'en';
    includeSummary?: boolean;
    filter?: {
      categories?: string[];
      audiences?: Array<'writer' | 'dev'>;
      minSeverity?: 'info' | 'warning' | 'error';
    };
  };
}

export class SeoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SeoApiError';
  }
}

export class SeoClient {
  constructor(private readonly apiBase: string, private readonly apiKey: string) {}

  async check<T = unknown>(body: PublicCheckRequest): Promise<T> {
    const res = await fetch(`${this.apiBase}/public/check`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const p = payload as { message?: string; code?: string } | null;
      throw new SeoApiError(p?.message ?? `HTTP ${res.status}`, res.status, p?.code, payload);
    }
    return payload as T;
  }
}
```

## Usage

```typescript
import { SeoClient, SeoApiError } from './seo-client';

const client = new SeoClient('http://localhost:3000/api/v1', process.env.SEO_API_KEY!);

try {
  const res = await client.check({
    input: { type: 'url', url: 'https://your-blog.com/post' },
    targetKeyword: 'seo 2026',
    options: { enrichMode: 'llm', language: 'vi' },
  });
  console.log(`Score: ${(res as any).score}`);
} catch (err) {
  if (err instanceof SeoApiError && err.status === 429) {
    /* back off based on Retry-After */
  }
  throw err;
}
```

For stricter typing of the response, mirror the `PublicCheckResponse` shape from [output-schema.md](./output-schema.md).
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/sdk-js.md
git commit -m "docs(public-api): 40-line JS SDK copy-paste snippet"
```

---

## Task E8: `cli.md`

**Files:**
- Create: `docs/public-api/cli.md`

- [ ] **Step 1: Write**

```markdown
# CLI

Workspace-local CLI delivered as `packages/seo-check-cli/`. After the monorepo is installed, run:

```bash
npm exec -w packages/seo-check-cli seo-check -- --help
```

## Basic usage

```bash
seo-check --url https://your-blog.com/post \
  --keyword "seo 2026" \
  --api-key $SEO_API_KEY
```

## File input

```bash
seo-check --file ./article.md --mode markdown \
  --keyword "on-page seo" \
  --api-key $SEO_API_KEY
```

## Machine output

```bash
seo-check --url https://... --keyword "seo" --format json > report.json
```

## CI gating

Exit `1` when any error issue is present **or** when score is below 70:

```bash
seo-check --url $URL --keyword "$KW" \
  --fail-on error --min-score 70 \
  --api-key $SEO_API_KEY
```

## GitHub Action example

```yaml
# .github/workflows/seo-gate.yml
name: SEO gate

on:
  pull_request:
    paths: ['content/**/*.md']

jobs:
  seo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - name: Check article
        env:
          SEO_API_KEY: ${{ secrets.SEO_API_KEY }}
        run: |
          npm exec -w packages/seo-check-cli seo-check -- \
            --file content/latest.md --mode markdown \
            --keyword "$(jq -r .targetKeyword content/latest.meta.json)" \
            --fail-on error --min-score 70
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | pass |
| 1 | CI gate tripped (`--fail-on` / `--min-score`) |
| 2 | network / auth / API error |
| 3 | invalid usage |

## Programmatic use

```typescript
import { SeoClient, evaluateGate } from '@repo/seo-check-cli';

const client = new SeoClient({ apiBase: '...', apiKey: '...' });
const res = await client.check({ ... });
const gate = evaluateGate({ response: res, failOn: 'error', minScore: 70 });
if (!gate.pass) throw new Error(gate.reason);
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/cli.md
git commit -m "docs(public-api): CLI usage + GitHub Action example"
```

---

## Task E9: `changelog.md`

**Files:**
- Create: `docs/public-api/changelog.md`

- [ ] **Step 1: Write**

```markdown
# Changelog

## v0.3 — 2026-04-XX (Plan 3)

**DX surfaces.** No API-surface changes.

- Added: `apps/web/` — Next.js 14 app (auth flow, playground, settings/api-keys)
- Added: `packages/seo-check-cli/` — workspace-local CLI (`seo-check`)
- Added: `docs/public-api/` — 8 narrative markdown files + this changelog

## v0.2 — 2026-04-23 (Plan 2)

**LLM enrichment.**

- `enrichMode=llm` produces LLM-written suggestions instead of degrading to template
- New internal package `@repo/seo-ai-core` (LLM facade + prompt loader + output parser + BaseChain)
- Added `SuggestionEnricherService` with Redis cache (`suggest:<hash>`, TTL 1h) and per-key concurrency cap (5)
- On LLM timeout / schema violation / missing key: graceful degrade to template with `meta.degraded=true` (200 OK)

## v0.1 — 2026-04-22 (Plan 1)

**Foundation.**

- `POST /api/v1/public/check` with URL / Markdown / HTML input
- `enrichMode=off` / `template`; `llm` shimmed to template degrade
- API-key CRUD at `/api/v1/users/me/api-keys`
- Rate limits (20/min, 500/day, 100/ip/min)
- Scope-limited Swagger UI at `/api/v1/public/docs`
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/changelog.md
git commit -m "docs(public-api): changelog — v0.1/v0.2/v0.3"
```

---

# Phase F — Final verification

## Task F1: Full regression

**Files:** (none — verification)

- [ ] **Step 1: CLI package tests**

Run: `npm test --workspace=@repo/seo-check-cli`
Expected: PASS ≥ 18 tests (3 client + 8 args + 7 formatter).

- [ ] **Step 2: CLI type-check + lint + build**

Run: `npx turbo run lint check-types build --filter=@repo/seo-check-cli`
Expected: 3 tasks green; `dist/cli.js` is executable.

- [ ] **Step 3: Root regression**

Run: `npm run check-types && npm run lint && npm test`
Expected: all packages green. (Gateway, seo-ai-core, web if Plans 3a/3b are also landed.)

- [ ] **Step 4: Manual `--help` smoke**

```bash
npm exec -w packages/seo-check-cli seo-check -- --help
```
Expected: help text lists all flags + exit codes.

- [ ] **Step 5: Manual live run (optional — needs docker up + a real key)**

```bash
npm exec -w packages/seo-check-cli seo-check -- \
  --url https://example.com --keyword seo \
  --enrich template --format pretty \
  --api-key $SEO_API_KEY
echo "exit=$?"
```
Expected: pretty-printed output; `exit=0`.

- [ ] **Step 6: Verify docs rendered properly**

Manually view each of the 9 markdown files in a rendered view (VS Code preview, GitHub, or the playground's sibling page) and confirm:
- All internal links resolve (`./README.md`, `./getting-started.md`, etc.)
- No broken code fences
- Tables render in both GitHub-flavored and Markdown-lite readers

- [ ] **Step 7: Tag Plan 3c**

```bash
git tag public-api-plan-3c-done
```

- [ ] **Step 8: No push without explicit user approval.**

---

## Self-review checklist

- [ ] `packages/seo-check-cli/package.json` declares `bin: { "seo-check": "./dist/cli.js" }`, `type: module`, Node ≥ 18.18
- [ ] CLI has ZERO monorepo deps (no `@repo/*`) — only `commander` + `chalk`
- [ ] `SeoClient` handles happy path (200), error path (4xx/5xx with parsed `code`), and network failure (status=0)
- [ ] `validateArgs` rejects: missing url/file, both, missing mode with file, empty keyword, missing API key, bad fail-on, out-of-range min-score
- [ ] `evaluateGate` enforces `--min-score` and `--fail-on` correctly
- [ ] Exit codes: 0 pass, 1 gate, 2 API, 3 usage
- [ ] `renderPretty` uses chalk for color; `renderJson` emits valid JSON (2-space indent)
- [ ] Prompt flag `--env SEO_API_KEY` is opt-in (explicit default) — never silently reads secrets
- [ ] `docs/public-api/` has 9 files: README + 8 topic + changelog
- [ ] All docs cross-link via relative paths that work from GitHub + VS Code preview
- [ ] `changelog.md` lists v0.1 / v0.2 / v0.3 with dates
- [ ] No Claude trailer on any commit
- [ ] Pre-commit hook never bypassed

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-seo-public-api-plan-3c-cli-docs.md`. Two execution options:

1. **Subagent-Driven (recommended)**
2. **Inline Execution**

Plan 3c is independent of 3a and 3b — it can be executed before, during, or after those. After `public-api-plan-3c-done` is tagged, Plan 3 (all three sub-plans) is complete; the spec's "Playground + Developer Experience" + "CLI" + "Docs" sections are fully delivered and the public API is ready for external consumers.
