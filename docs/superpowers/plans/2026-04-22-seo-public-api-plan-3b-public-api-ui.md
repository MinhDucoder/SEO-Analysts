# SEO Public API — Plan 3b: Playground + API Keys UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/playground` (public, API-key-driven) and `/settings/api-keys` (JWT-guarded) inside `apps/web/`, delivering the two primary consumer-facing UIs that sit on top of Plans 1 + 2's API surface.

**Architecture:** The playground is a single client page composed of four zones: input (tabs: URL | Markdown | HTML backed by lazy-loaded Monaco), options (enrichMode/language/filter/target keyword), submit bar (with Copy-as-cURL / Copy-as-JS / Copy-response), and result viewer (score card, category bars, filterable issue list, per-issue "Apply to input"). Settings/api-keys is a standard CRUD page: list + create modal that shows plaintext **once** + revoke confirmation. Both pages consume the `ApiClient` + TanStack Query scaffolding that Plan 3a wired up.

**Tech Stack:** Next.js 14.2+, React 19, `@monaco-editor/react` (dynamic import, SSR-safe), `@radix-ui/react-tabs`, `@radix-ui/react-select`, TanStack Query v5, react-hook-form + zod, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-22-seo-public-api-design.md` — sections "Playground + Developer Experience" and "`/settings/api-keys`".

**Predecessor:** tag `public-api-plan-3a-done`.

**Successor:** Plan 3c (CLI + narrative docs).

**Scope out of this plan:**
- CLI (3c)
- Narrative docs (3c)
- Usage chart on `/settings/api-keys` (spec lists it as optional; deferred to post-MVP)
- Streaming / SSE in the result viewer (future)
- Admin cross-user keys UI (admin scope; out of public-API MVP)

---

## File Structure

### New files

```
apps/web/src/
├── types/
│   └── api.ts                                  MODIFY (replace placeholder with PublicCheckRequest/Response + ApiKeyDto)
├── lib/
│   ├── api-public-check.ts                     CREATE (typed wrapper around ApiClient for /public/check)
│   ├── api-keys.ts                             CREATE (typed wrappers: list/create/revoke)
│   ├── playground-samples.ts                   CREATE (3 preloaded samples)
│   ├── snippet-builders.ts                     CREATE (Copy-as-cURL, Copy-as-JS, Copy-response)
│   └── local-storage.ts                        CREATE (typed LS accessors: apiKey + last-input)
├── components/
│   ├── ui/
│   │   ├── tabs.tsx                            CREATE (shadcn Tabs)
│   │   ├── select.tsx                          CREATE (shadcn Select)
│   │   ├── badge.tsx                           CREATE (rule severity/audience badges)
│   │   ├── textarea.tsx                        CREATE
│   │   └── separator.tsx                       CREATE
│   └── playground/
│       ├── monaco-editor.tsx                   CREATE (lazy import + textarea fallback)
│       ├── input-tabs.tsx                      CREATE (URL | Markdown | HTML)
│       ├── options-panel.tsx                   CREATE (enrichMode, language, filter, keyword, samples)
│       ├── result-viewer.tsx                   CREATE (score card + filter bar + issue cards)
│       ├── issue-card.tsx                      CREATE
│       ├── score-card.tsx                      CREATE
│       ├── copy-buttons.tsx                    CREATE (3 copy actions)
│       └── samples-menu.tsx                    CREATE
└── app/
    └── (app)/
        ├── playground/page.tsx                 CREATE
        └── settings/
            └── api-keys/page.tsx               CREATE

apps/web/test/
├── lib.snippet-builders.spec.ts                CREATE
├── lib.local-storage.spec.ts                   CREATE
└── components.issue-card.spec.tsx              CREATE (RTL unit: apply button, filter-by-severity render)

apps/web/tests/
├── playground.spec.ts                          CREATE (Playwright)
└── api-keys.spec.ts                            CREATE (Playwright)
```

### Modified files

```
apps/web/package.json                           MODIFY (+ @monaco-editor/react, + @radix-ui/react-tabs, + @radix-ui/react-select, + @radix-ui/react-separator)
apps/web/src/types/api.ts                       MODIFY (placeholder → full response mirror)
```

No backend, Prisma, proto, or shared-package changes.

---

## Conventions used in this plan

- All file paths are absolute to repo root.
- TDD order where a pure function exists (snippet-builders, local-storage, issue-card rendering). UI pages are verified via Playwright + manual smoke.
- Commit scope: `web` for all changes.
- Never `--no-verify`.
- No Claude trailer in commits.
- Plaintext API keys never logged to console, never persisted anywhere beyond an **in-component `useState`** that's cleared on modal close. No query cache, no ref, no localStorage.
- localStorage keys: `seo-playground-api-key` (user's key paste), `seo-playground-input` (draft persistence). Both under `apps/web/src/lib/local-storage.ts`.
- Monaco editor MUST be dynamic-imported (no SSR, no static bundle bloat). Fallback to `<textarea>` when Monaco hasn't hydrated yet.
- The playground is `/playground` under the `(app)` route group but is publicly accessible — users can paste a key without being logged in. To allow this, the `/playground` page opts out of the `(app)` auth guard by using its own wrapper. Implementation: put it under a new group `(public)` OR mark it as a top-level page at `app/playground/page.tsx` (not under `(app)`).

We choose: `app/playground/page.tsx` (top-level) — simpler than adding another group.

---

# Phase P — Types + data layer + install deps

## Task P1: Add UI deps to `apps/web/package.json`

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Read current `apps/web/package.json` (from Plan 3a).**

Run: `cat apps/web/package.json`

- [ ] **Step 2: Add the following to `dependencies`** (preserve alphabetical order where possible):

```
"@monaco-editor/react": "^4.6.0",
"@radix-ui/react-select": "^2.1.2",
"@radix-ui/react-separator": "^1.1.0",
"@radix-ui/react-tabs": "^1.1.1",
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: new packages added; Monaco editor available.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore(web): add Monaco + Radix Tabs/Select/Separator for playground UI"
```

---

## Task P2: API response + key types

**Files:**
- Modify: `apps/web/src/types/api.ts` (replaces placeholder `export {}`)

- [ ] **Step 1: Write `apps/web/src/types/api.ts`**

```typescript
/**
 * @file Mirrors of backend DTOs. Source of truth is
 * `apps/gateway/src/public-api/services/public-check.service.ts` and
 * `apps/gateway/src/public-api/dto/api-key.dto.ts`. Keep these aligned
 * on backend change.
 */

export type EnrichMode = 'off' | 'template' | 'llm';
export type Language = 'vi' | 'en';
export type IssueSeverity = 'info' | 'warning' | 'error';
export type IssueAudience = 'writer' | 'dev';
export type SuggestionSource = 'llm' | 'template' | 'mixed' | 'none';
export type ApiKeyEnvironment = 'live' | 'test';

export interface PublicCheckInput {
  type: 'url' | 'markdown' | 'html';
  url?: string;
  markdown?: string;
  html?: string;
}

export interface PublicCheckFilter {
  categories?: string[];
  audiences?: IssueAudience[];
  minSeverity?: IssueSeverity;
}

export interface PublicCheckOptions {
  enrichMode?: EnrichMode;
  language?: Language;
  includeSummary?: boolean;
  filter?: PublicCheckFilter;
}

export interface PublicCheckRequest {
  input: PublicCheckInput;
  targetKeyword: string;
  secondaryKeywords?: string[];
  options?: PublicCheckOptions;
}

export interface Suggestion {
  type: 'rewrite' | 'add' | 'remove' | 'reorder';
  text: string;
  rationale: string;
}

export interface PublicCheckIssue {
  ruleId: string;
  severity: IssueSeverity;
  category: string;
  audience: IssueAudience[];
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestion: Suggestion | null;
  docRef?: string;
}

export interface PublicCheckMeta {
  inputType: 'url' | 'markdown' | 'html';
  resolvedUrl?: string;
  contentStats: { words: number; characters: number; readingTimeSec: number };
  processingTimeMs: number;
  ruleVersion: string;
  enrichMode: EnrichMode;
  suggestionSource: SuggestionSource;
  degraded: boolean;
  cached: boolean;
  requestId: string;
  usage: {
    remaining: { minute: number; day: number };
    resetAt: { minute: string; day: string };
  };
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: PublicCheckIssue[];
  summary?: { writer: string; dev: string };
  meta: PublicCheckMeta;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  environment: ApiKeyEnvironment;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
  revokedAt: string | Date | null;
}

export interface CreateApiKeyInput {
  name: string;
  environment: ApiKeyEnvironment;
}

export interface CreateApiKeyResponse extends ApiKeyDto {
  plaintext: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/types/api.ts
git commit -m "feat(web): mirror PublicCheckResponse + ApiKeyDto types"
```

---

## Task P3: Typed API-keys wrapper

**Files:**
- Create: `apps/web/src/lib/api-keys.ts`

- [ ] **Step 1: Write `apps/web/src/lib/api-keys.ts`**

```typescript
/**
 * @file Typed wrappers around ApiClient for /users/me/api-keys.
 * Thin layer — each function is 3-4 lines — but centralizing the URL
 * path + return type avoids drift between consumers.
 */
import type { ApiClient } from './api';
import type { ApiKeyDto, CreateApiKeyInput, CreateApiKeyResponse } from '@/types/api';

export async function listApiKeys(client: ApiClient): Promise<ApiKeyDto[]> {
  return client.get<ApiKeyDto[]>('/users/me/api-keys');
}

export async function createApiKey(
  client: ApiClient,
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResponse> {
  return client.post<CreateApiKeyResponse>('/users/me/api-keys', input);
}

export async function revokeApiKey(client: ApiClient, id: string): Promise<void> {
  await client.delete<void>(`/users/me/api-keys/${id}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api-keys.ts
git commit -m "feat(web): typed api-keys wrappers (list/create/revoke)"
```

---

## Task P4: Public-check API wrapper

**Files:**
- Create: `apps/web/src/lib/api-public-check.ts`

- [ ] **Step 1: Write `apps/web/src/lib/api-public-check.ts`**

```typescript
/**
 * @file POST /public/check with Bearer sk_* instead of JWT. A
 * dedicated `runPublicCheck` builds its own fetch call because the
 * ApiClient scaffolding assumes JWT; the playground sends a user-
 * supplied API key (sk_live_... / sk_test_...).
 */
import type { PublicCheckRequest, PublicCheckResponse } from '@/types/api';
import { ApiError } from './api';
import { env } from './env';

export async function runPublicCheck(
  apiKey: string,
  body: PublicCheckRequest,
  signal?: AbortSignal,
): Promise<PublicCheckResponse> {
  const res = await fetch(`${env.apiBase}/public/check`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    const p = payload as { message?: string; code?: string } | null;
    throw new ApiError(p?.message ?? `HTTP ${res.status}`, res.status, p?.code, payload);
  }
  return (await res.json()) as PublicCheckResponse;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api-public-check.ts
git commit -m "feat(web): runPublicCheck fetch helper (Bearer sk_*)"
```

---

## Task P5: Snippet builders (cURL / JS / response)

**Files:**
- Create: `apps/web/src/lib/snippet-builders.ts`
- Create: `apps/web/test/lib.snippet-builders.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/test/lib.snippet-builders.spec.ts
import { describe, it, expect } from 'vitest';
import { buildCurl, buildJs, buildResponseCopy } from '../src/lib/snippet-builders';

const req = {
  input: { type: 'url' as const, url: 'https://x.y/z' },
  targetKeyword: 'seo 2026',
  options: { enrichMode: 'llm' as const, language: 'vi' as const },
};

describe('buildCurl', () => {
  it('renders a single-line cURL with Bearer + JSON body', () => {
    const out = buildCurl('http://localhost:3000/api/v1', 'sk_live_AAA', req);
    expect(out).toContain(`curl -X POST 'http://localhost:3000/api/v1/public/check'`);
    expect(out).toContain(`-H 'authorization: Bearer sk_live_AAA'`);
    expect(out).toContain(`-H 'content-type: application/json'`);
    expect(out).toContain(`--data`);
    expect(out).toContain('"targetKeyword":"seo 2026"');
  });

  it('redacts the key when passed empty', () => {
    const out = buildCurl('http://x/y', '', req);
    expect(out).toContain(`Bearer <YOUR_API_KEY>`);
  });
});

describe('buildJs', () => {
  it('emits a fetch snippet with Bearer + JSON body', () => {
    const out = buildJs('http://localhost:3000/api/v1', 'sk_live_B', req);
    expect(out).toContain(`fetch('http://localhost:3000/api/v1/public/check'`);
    expect(out).toContain(`Authorization: 'Bearer sk_live_B'`);
    expect(out).toContain(`'Content-Type': 'application/json'`);
    expect(out).toContain(`body: JSON.stringify(`);
  });
});

describe('buildResponseCopy', () => {
  it('pretty-prints JSON', () => {
    const out = buildResponseCopy({ score: 80, meta: { ruleVersion: '1.2.0' } });
    expect(out).toContain('"score": 80');
    expect(out).toContain('"ruleVersion": "1.2.0"');
  });
});
```

- [ ] **Step 2: Run — fails (module missing)**

Run: `npm test --workspace=@seo/web -- snippet-builders`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// apps/web/src/lib/snippet-builders.ts
/**
 * @file Pure string builders for "Copy as cURL / JS / response".
 * Kept pure (no React, no DOM) so they're trivially unit-testable.
 */
import type { PublicCheckRequest } from '@/types/api';

export function buildCurl(apiBase: string, apiKey: string, body: PublicCheckRequest): string {
  const key = apiKey || '<YOUR_API_KEY>';
  const json = JSON.stringify(body);
  return [
    `curl -X POST '${apiBase}/public/check' \\`,
    `  -H 'authorization: Bearer ${key}' \\`,
    `  -H 'content-type: application/json' \\`,
    `  --data '${json.replace(/'/g, `'\\''`)}'`,
  ].join('\n');
}

export function buildJs(apiBase: string, apiKey: string, body: PublicCheckRequest): string {
  const key = apiKey || '<YOUR_API_KEY>';
  return [
    `const res = await fetch('${apiBase}/public/check', {`,
    `  method: 'POST',`,
    `  headers: {`,
    `    Authorization: 'Bearer ${key}',`,
    `    'Content-Type': 'application/json',`,
    `  },`,
    `  body: JSON.stringify(${JSON.stringify(body, null, 2)}),`,
    `});`,
    `const data = await res.json();`,
    `console.log(data);`,
  ].join('\n');
}

export function buildResponseCopy(response: unknown): string {
  return JSON.stringify(response, null, 2);
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@seo/web -- snippet-builders`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/snippet-builders.ts apps/web/test/lib.snippet-builders.spec.ts
git commit -m "feat(web): snippet builders (cURL + JS + JSON-pretty)"
```

---

## Task P6: Typed localStorage accessors

**Files:**
- Create: `apps/web/src/lib/local-storage.ts`
- Create: `apps/web/test/lib.local-storage.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/test/lib.local-storage.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredApiKey, setStoredApiKey, getStoredInput, setStoredInput } from '../src/lib/local-storage';

beforeEach(() => window.localStorage.clear());

describe('api key storage', () => {
  it('round-trip', () => {
    setStoredApiKey('sk_test_xyz');
    expect(getStoredApiKey()).toBe('sk_test_xyz');
  });

  it('setting null clears', () => {
    setStoredApiKey('sk_test_xyz');
    setStoredApiKey(null);
    expect(getStoredApiKey()).toBeNull();
  });
});

describe('input draft storage', () => {
  it('round-trip', () => {
    setStoredInput({ type: 'html', html: '<p>hi</p>' });
    expect(getStoredInput()).toEqual({ type: 'html', html: '<p>hi</p>' });
  });

  it('setting null clears', () => {
    setStoredInput({ type: 'url', url: 'https://x' });
    setStoredInput(null);
    expect(getStoredInput()).toBeNull();
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npm test --workspace=@seo/web -- local-storage`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```typescript
// apps/web/src/lib/local-storage.ts
/**
 * @file SSR-safe wrappers around localStorage for the playground.
 * Each accessor returns null on the server and guards against
 * JSON.parse exceptions from corrupted values.
 */
import type { PublicCheckInput } from '@/types/api';

const KEY_API = 'seo-playground-api-key';
const KEY_INPUT = 'seo-playground-input';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredApiKey(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(KEY_API);
}

export function setStoredApiKey(value: string | null): void {
  if (!hasWindow()) return;
  if (value === null || value === '') window.localStorage.removeItem(KEY_API);
  else window.localStorage.setItem(KEY_API, value);
}

export function getStoredInput(): PublicCheckInput | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(KEY_INPUT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicCheckInput;
  } catch {
    return null;
  }
}

export function setStoredInput(value: PublicCheckInput | null): void {
  if (!hasWindow()) return;
  if (value === null) window.localStorage.removeItem(KEY_INPUT);
  else window.localStorage.setItem(KEY_INPUT, JSON.stringify(value));
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@seo/web -- local-storage`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/local-storage.ts apps/web/test/lib.local-storage.spec.ts
git commit -m "feat(web): SSR-safe localStorage accessors for playground state"
```

---

## Task P7: Playground samples

**Files:**
- Create: `apps/web/src/lib/playground-samples.ts`

- [ ] **Step 1: Write `apps/web/src/lib/playground-samples.ts`**

```typescript
import type { PublicCheckRequest } from '@/types/api';

export interface PlaygroundSample {
  id: string;
  label: string;
  description: string;
  request: PublicCheckRequest;
}

export const PLAYGROUND_SAMPLES: PlaygroundSample[] = [
  {
    id: 'html-short-blog',
    label: 'Short blog (HTML, VN)',
    description: 'Bài blog ngắn — test content-only 16 rules.',
    request: {
      input: {
        type: 'html',
        html: '<html><head><title>Blog SEO 2026</title><meta name="description" content="Tổng hợp xu hướng SEO 2026." /></head><body><h1>SEO 2026 cơ bản</h1><p>Nội dung ngắn để test.</p></body></html>',
      },
      targetKeyword: 'seo 2026',
      options: { enrichMode: 'template', language: 'vi' },
    },
  },
  {
    id: 'markdown-issues',
    label: 'Markdown with issues (VN)',
    description: 'Bài có nhiều lỗi SEO — title ngắn, thiếu H1.',
    request: {
      input: {
        type: 'markdown',
        markdown: '# SEO\n\nbài viết ngắn không có từ khóa chính và không có description.',
      },
      targetKeyword: 'on-page seo',
      options: { enrichMode: 'llm', language: 'vi' },
    },
  },
  {
    id: 'url-blog',
    label: 'URL: Vietnamese blog',
    description: 'Fetch & analyze một URL công khai.',
    request: {
      input: { type: 'url', url: 'https://example.com/seo-blog' },
      targetKeyword: 'seo',
      options: { enrichMode: 'template', language: 'vi' },
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/playground-samples.ts
git commit -m "feat(web): 3 playground sample fixtures"
```

---

# Phase Q — Playground page primitives

## Task Q1: shadcn Tabs + Select + Separator + Badge + Textarea

**Files:**
- Create: `apps/web/src/components/ui/tabs.tsx`
- Create: `apps/web/src/components/ui/select.tsx`
- Create: `apps/web/src/components/ui/separator.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/textarea.tsx`

- [ ] **Step 1: Write `apps/web/src/components/ui/tabs.tsx`**

```tsx
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:shadow',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2 ring-offset-background focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
```

- [ ] **Step 2: Write `apps/web/src/components/ui/select.tsx`** (minimal — native select, styled)

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
```

- [ ] **Step 3: Write `apps/web/src/components/ui/separator.tsx`**

```tsx
'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;
```

- [ ] **Step 4: Write `apps/web/src/components/ui/badge.tsx`**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        warning:
          'border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-500/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
```

- [ ] **Step 5: Write `apps/web/src/components/ui/textarea.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/tabs.tsx apps/web/src/components/ui/select.tsx apps/web/src/components/ui/separator.tsx apps/web/src/components/ui/badge.tsx apps/web/src/components/ui/textarea.tsx
git commit -m "feat(web): shadcn primitives — Tabs, Select, Separator, Badge, Textarea"
```

---

## Task Q2: Monaco editor wrapper (lazy, SSR-safe)

**Files:**
- Create: `apps/web/src/components/playground/monaco-editor.tsx`

- [ ] **Step 1: Write `apps/web/src/components/playground/monaco-editor.tsx`**

```tsx
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Textarea } from '@/components/ui/textarea';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  { ssr: false, loading: () => null },
);

export interface PlaygroundEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'markdown' | 'plaintext';
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
}

export function PlaygroundEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly,
  minHeight = 300,
}: PlaygroundEditorProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className="rounded-md border" style={{ minHeight }}>
      <MonacoEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        language={language}
        height={minHeight}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          fontSize: 13,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/playground/monaco-editor.tsx
git commit -m "feat(web): PlaygroundEditor (Monaco lazy + textarea SSR fallback)"
```

---

## Task Q3: Input tabs component

**Files:**
- Create: `apps/web/src/components/playground/input-tabs.tsx`

- [ ] **Step 1: Write `apps/web/src/components/playground/input-tabs.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlaygroundEditor } from './monaco-editor';
import type { PublicCheckInput } from '@/types/api';

export interface InputTabsProps {
  value: PublicCheckInput;
  onChange: (value: PublicCheckInput) => void;
}

export function InputTabs({ value, onChange }: InputTabsProps) {
  return (
    <Tabs
      value={value.type}
      onValueChange={(t) => {
        if (t === 'url') onChange({ type: 'url', url: value.url ?? '' });
        if (t === 'markdown') onChange({ type: 'markdown', markdown: value.markdown ?? '' });
        if (t === 'html') onChange({ type: 'html', html: value.html ?? '' });
      }}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="url">URL</TabsTrigger>
        <TabsTrigger value="markdown">Markdown</TabsTrigger>
        <TabsTrigger value="html">HTML</TabsTrigger>
      </TabsList>

      <TabsContent value="url">
        <Input
          type="url"
          placeholder="https://example.com/blog-post"
          value={value.url ?? ''}
          onChange={(e) => onChange({ type: 'url', url: e.target.value })}
        />
      </TabsContent>
      <TabsContent value="markdown">
        <PlaygroundEditor
          language="markdown"
          value={value.markdown ?? ''}
          onChange={(v) => onChange({ type: 'markdown', markdown: v })}
          placeholder="# Your markdown"
        />
      </TabsContent>
      <TabsContent value="html">
        <PlaygroundEditor
          language="html"
          value={value.html ?? ''}
          onChange={(v) => onChange({ type: 'html', html: v })}
          placeholder="<html>...</html>"
        />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/playground/input-tabs.tsx
git commit -m "feat(web): InputTabs (URL / Markdown / HTML)"
```

---

## Task Q4: Options panel + Samples menu

**Files:**
- Create: `apps/web/src/components/playground/options-panel.tsx`
- Create: `apps/web/src/components/playground/samples-menu.tsx`

- [ ] **Step 1: Write `apps/web/src/components/playground/options-panel.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PublicCheckOptions, EnrichMode, IssueSeverity, Language } from '@/types/api';

export interface OptionsPanelProps {
  targetKeyword: string;
  secondaryKeywords: string;
  options: PublicCheckOptions;
  onTargetKeywordChange: (v: string) => void;
  onSecondaryKeywordsChange: (v: string) => void;
  onOptionsChange: (v: PublicCheckOptions) => void;
}

export function OptionsPanel(props: OptionsPanelProps) {
  const { targetKeyword, secondaryKeywords, options } = props;
  const filter = options.filter ?? {};

  const patchOptions = (o: Partial<PublicCheckOptions>) =>
    props.onOptionsChange({ ...options, ...o });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="target">Target keyword</Label>
        <Input
          id="target"
          value={targetKeyword}
          onChange={(e) => props.onTargetKeywordChange(e.target.value)}
          placeholder="seo 2026"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="secondary">Secondary keywords (comma-separated, ≤5)</Label>
        <Input
          id="secondary"
          value={secondaryKeywords}
          onChange={(e) => props.onSecondaryKeywordsChange(e.target.value)}
          placeholder="on-page, core web vitals"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="enrich">Enrich mode</Label>
          <Select
            id="enrich"
            value={options.enrichMode ?? 'llm'}
            onChange={(e) => patchOptions({ enrichMode: e.target.value as EnrichMode })}
          >
            <option value="off">off</option>
            <option value="template">template</option>
            <option value="llm">llm</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lang">Language</Label>
          <Select
            id="lang"
            value={options.language ?? 'vi'}
            onChange={(e) => patchOptions({ language: e.target.value as Language })}
          >
            <option value="vi">vi</option>
            <option value="en">en</option>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="minsev">Minimum severity</Label>
        <Select
          id="minsev"
          value={filter.minSeverity ?? ''}
          onChange={(e) =>
            patchOptions({
              filter: {
                ...filter,
                minSeverity: (e.target.value as IssueSeverity) || undefined,
              },
            })
          }
        >
          <option value="">all</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </Select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/components/playground/samples-menu.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { PLAYGROUND_SAMPLES, type PlaygroundSample } from '@/lib/playground-samples';

export interface SamplesMenuProps {
  onPick: (sample: PlaygroundSample) => void;
}

export function SamplesMenu({ onPick }: SamplesMenuProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-muted-foreground">Try a sample:</span>
      {PLAYGROUND_SAMPLES.map((s) => (
        <Button key={s.id} variant="outline" size="sm" onClick={() => onPick(s)} title={s.description}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/playground/options-panel.tsx apps/web/src/components/playground/samples-menu.tsx
git commit -m "feat(web): OptionsPanel + SamplesMenu"
```

---

## Task Q5: Score card

**Files:**
- Create: `apps/web/src/components/playground/score-card.tsx`

- [ ] **Step 1: Write `apps/web/src/components/playground/score-card.tsx`**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PublicCheckResponse } from '@/types/api';

export function ScoreCard({ response }: { response: PublicCheckResponse }) {
  const entries = Object.entries(response.scoreBreakdown);
  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between">
        <CardTitle className="text-3xl">{response.score} / 100</CardTitle>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant={response.meta.degraded ? 'warning' : 'secondary'}>
            source: {response.meta.suggestionSource}
          </Badge>
          {response.meta.degraded ? <Badge variant="warning">degraded</Badge> : null}
          {response.meta.cached ? <Badge variant="outline">cached</Badge> : null}
          <span>{response.meta.processingTimeMs}ms · rule v{response.meta.ruleVersion}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map(([cat, score]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="w-32 text-xs uppercase text-muted-foreground">{cat}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(2, score)}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs">{score}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/playground/score-card.tsx
git commit -m "feat(web): ScoreCard with category bars + meta badges"
```

---

## Task Q6: Issue card

**Files:**
- Create: `apps/web/src/components/playground/issue-card.tsx`
- Create: `apps/web/test/components.issue-card.spec.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/test/components.issue-card.spec.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IssueCard } from '../src/components/playground/issue-card';
import type { PublicCheckIssue } from '../src/types/api';

const issueWithSuggestion: PublicCheckIssue = {
  ruleId: 'title_tag',
  severity: 'warning',
  category: 'meta',
  audience: ['writer'],
  title: 'Title quá ngắn',
  description: 'Title chỉ 25 ký tự, khuyến nghị 50-60.',
  evidence: { currentLength: 25 },
  suggestion: {
    type: 'rewrite',
    text: 'Cách viết SEO 2026: hướng dẫn cho beginner',
    rationale: 'Thêm năm + đối tượng để tăng tính thời sự',
  },
  docRef: 'https://docs/r/title_tag',
};

const issueNoSuggestion: PublicCheckIssue = { ...issueWithSuggestion, suggestion: null };

describe('IssueCard', () => {
  it('renders rule metadata (severity, category, audience badges)', () => {
    render(<IssueCard issue={issueWithSuggestion} canApply={false} />);
    expect(screen.getByText('Title quá ngắn')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('meta')).toBeInTheDocument();
    expect(screen.getByText('writer')).toBeInTheDocument();
  });

  it('renders suggestion text + rationale when suggestion present', () => {
    render(<IssueCard issue={issueWithSuggestion} canApply={false} />);
    expect(screen.getByText(/Cách viết SEO 2026/)).toBeInTheDocument();
    expect(screen.getByText(/tăng tính thời sự/)).toBeInTheDocument();
  });

  it('omits the suggestion block when suggestion is null', () => {
    render(<IssueCard issue={issueNoSuggestion} canApply={false} />);
    expect(screen.queryByText(/rationale/i)).not.toBeInTheDocument();
  });

  it('does not render Apply button when canApply=false', () => {
    render(<IssueCard issue={issueWithSuggestion} canApply={false} />);
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
  });

  it('renders Apply button when canApply=true and calls onApply with suggestion text', () => {
    const onApply = vi.fn();
    render(<IssueCard issue={issueWithSuggestion} canApply onApply={onApply} />);
    screen.getByRole('button', { name: /apply/i }).click();
    expect(onApply).toHaveBeenCalledWith(issueWithSuggestion);
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npm test --workspace=@seo/web -- issue-card`
Expected: FAIL.

- [ ] **Step 3: Implement `apps/web/src/components/playground/issue-card.tsx`**

```tsx
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PublicCheckIssue, IssueSeverity } from '@/types/api';

const SEVERITY_VARIANT: Record<IssueSeverity, 'destructive' | 'warning' | 'secondary'> = {
  error: 'destructive',
  warning: 'warning',
  info: 'secondary',
};

export interface IssueCardProps {
  issue: PublicCheckIssue;
  canApply: boolean;
  onApply?: (issue: PublicCheckIssue) => void;
  onCopy?: (issue: PublicCheckIssue) => void;
}

export function IssueCard({ issue, canApply, onApply, onCopy }: IssueCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[issue.severity]}>{issue.severity}</Badge>
          <Badge variant="outline">{issue.category}</Badge>
          {issue.audience.map((a) => (
            <Badge key={a} variant="secondary">
              {a}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">#{issue.ruleId}</span>
        </div>
        <h3 className="text-base font-semibold">{issue.title}</h3>
        <p className="text-sm text-muted-foreground">{issue.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.keys(issue.evidence).length > 0 ? (
          <details className="rounded-md border bg-muted/50 p-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Evidence</summary>
            <pre className="mt-2 overflow-x-auto">{JSON.stringify(issue.evidence, null, 2)}</pre>
          </details>
        ) : null}

        {issue.suggestion ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Suggestion · {issue.suggestion.type}
            </div>
            <p className="mt-1 text-sm">{issue.suggestion.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">{issue.suggestion.rationale}</p>
            <div className="mt-3 flex gap-2">
              {canApply ? (
                <Button size="sm" onClick={() => onApply?.(issue)}>
                  Apply to input
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy?.(issue)}
                // biome-ignore lint/a11y/useButtonType: <explanation>
              >
                Copy
              </Button>
            </div>
          </div>
        ) : null}
        {issue.docRef ? (
          <a
            href={issue.docRef}
            target="_blank"
            rel="noreferrer"
            className={`${badgeVariants({ variant: 'outline' })} w-fit`}
          >
            Rule docs →
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@seo/web -- issue-card`
Expected: PASS 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/playground/issue-card.tsx apps/web/test/components.issue-card.spec.tsx
git commit -m "feat(web): IssueCard (severity/category/audience badges + suggestion + apply)"
```

---

## Task Q7: Result viewer (list + client-side filter bar)

**Files:**
- Create: `apps/web/src/components/playground/result-viewer.tsx`

- [ ] **Step 1: Write `apps/web/src/components/playground/result-viewer.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { ScoreCard } from './score-card';
import { IssueCard } from './issue-card';
import type {
  IssueAudience,
  IssueSeverity,
  PublicCheckIssue,
  PublicCheckResponse,
} from '@/types/api';

const SEVERITY_ORDER: Record<IssueSeverity, number> = { info: 0, warning: 1, error: 2 };

export interface ResultViewerProps {
  response: PublicCheckResponse;
  canApply: boolean;
  onApply: (issue: PublicCheckIssue) => void;
}

interface FilterState {
  category: string;
  audience: IssueAudience | '';
  minSeverity: IssueSeverity | '';
}

export function ResultViewer({ response, canApply, onApply }: ResultViewerProps) {
  const [filters, setFilters] = React.useState<FilterState>({
    category: '',
    audience: '',
    minSeverity: '',
  });

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const i of response.issues) set.add(i.category);
    return Array.from(set).sort();
  }, [response.issues]);

  const filtered = React.useMemo(() => {
    return response.issues.filter((i) => {
      if (filters.category && i.category !== filters.category) return false;
      if (filters.audience && !i.audience.includes(filters.audience as IssueAudience)) return false;
      if (filters.minSeverity && SEVERITY_ORDER[i.severity] < SEVERITY_ORDER[filters.minSeverity]) {
        return false;
      }
      return true;
    });
  }, [response.issues, filters]);

  return (
    <div className="space-y-4">
      <ScoreCard response={response} />

      {response.summary ? (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <div>
            <span className="font-medium">Writer:</span> {response.summary.writer}
          </div>
          <div>
            <span className="font-medium">Dev:</span> {response.summary.dev}
          </div>
        </div>
      ) : null}

      <Separator />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">all</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Audience</Label>
          <Select
            value={filters.audience}
            onChange={(e) =>
              setFilters((f) => ({ ...f, audience: e.target.value as IssueAudience | '' }))
            }
          >
            <option value="">all</option>
            <option value="writer">writer</option>
            <option value="dev">dev</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Min severity</Label>
          <Select
            value={filters.minSeverity}
            onChange={(e) =>
              setFilters((f) => ({ ...f, minSeverity: e.target.value as IssueSeverity | '' }))
            }
          >
            <option value="">all</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {response.issues.length} issues
      </p>

      <div className="space-y-3">
        {filtered.map((issue) => (
          <IssueCard
            key={issue.ruleId}
            issue={issue}
            canApply={canApply && issue.suggestion !== null}
            onApply={onApply}
            onCopy={(iss) => {
              navigator.clipboard.writeText(iss.suggestion?.text ?? '');
              toast.success('Suggestion copied');
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/playground/result-viewer.tsx
git commit -m "feat(web): ResultViewer (score card + client filters + issue list)"
```

---

## Task Q8: Copy buttons

**Files:**
- Create: `apps/web/src/components/playground/copy-buttons.tsx`

- [ ] **Step 1: Write `apps/web/src/components/playground/copy-buttons.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { buildCurl, buildJs, buildResponseCopy } from '@/lib/snippet-builders';
import { env } from '@/lib/env';
import type { PublicCheckRequest, PublicCheckResponse } from '@/types/api';

export interface CopyButtonsProps {
  apiKey: string;
  request: PublicCheckRequest;
  response: PublicCheckResponse | null;
}

export function CopyButtons({ apiKey, request, response }: CopyButtonsProps) {
  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => copy(buildCurl(env.apiBase, apiKey, request), 'cURL')}>
        Copy as cURL
      </Button>
      <Button variant="outline" size="sm" onClick={() => copy(buildJs(env.apiBase, apiKey, request), 'JS')}>
        Copy as JS
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!response}
        onClick={() => response && copy(buildResponseCopy(response), 'Response')}
      >
        Copy response
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/playground/copy-buttons.tsx
git commit -m "feat(web): CopyButtons (cURL / JS / response)"
```

---

## Task Q9: `/playground` page

**Files:**
- Create: `apps/web/src/app/playground/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/playground/page.tsx`**

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { InputTabs } from '@/components/playground/input-tabs';
import { OptionsPanel } from '@/components/playground/options-panel';
import { SamplesMenu } from '@/components/playground/samples-menu';
import { ResultViewer } from '@/components/playground/result-viewer';
import { CopyButtons } from '@/components/playground/copy-buttons';
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredInput,
  setStoredInput,
} from '@/lib/local-storage';
import { runPublicCheck } from '@/lib/api-public-check';
import { ApiError } from '@/lib/api';
import type {
  PublicCheckInput,
  PublicCheckOptions,
  PublicCheckRequest,
  PublicCheckResponse,
  Suggestion,
  PublicCheckIssue,
} from '@/types/api';

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = React.useState('');
  const [input, setInput] = React.useState<PublicCheckInput>({ type: 'url', url: '' });
  const [targetKeyword, setTargetKeyword] = React.useState('');
  const [secondaryKeywords, setSecondaryKeywords] = React.useState('');
  const [options, setOptions] = React.useState<PublicCheckOptions>({
    enrichMode: 'template',
    language: 'vi',
  });
  const [response, setResponse] = React.useState<PublicCheckResponse | null>(null);

  React.useEffect(() => {
    setApiKey(getStoredApiKey() ?? '');
    const storedInput = getStoredInput();
    if (storedInput) setInput(storedInput);
  }, []);

  React.useEffect(() => {
    setStoredInput(input);
  }, [input]);

  const request: PublicCheckRequest = React.useMemo(
    () => ({
      input,
      targetKeyword: targetKeyword.trim(),
      secondaryKeywords: secondaryKeywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
      options,
    }),
    [input, targetKeyword, secondaryKeywords, options],
  );

  const mutation = useMutation({
    mutationFn: () => runPublicCheck(apiKey, request),
    onSuccess: (res) => setResponse(res),
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Request failed'),
  });

  const onApply = (issue: PublicCheckIssue) => {
    if (!issue.suggestion) return;
    const s: Suggestion = issue.suggestion;
    if (input.type === 'markdown') {
      setInput({ type: 'markdown', markdown: applyToText(input.markdown ?? '', s) });
    } else if (input.type === 'html') {
      setInput({ type: 'html', html: applyToText(input.html ?? '', s) });
    } else {
      toast.message('Apply-to-input works on Markdown / HTML only');
    }
  };

  const canApply = input.type !== 'url';

  return (
    <main className="container mx-auto space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Playground</h1>
          <p className="text-sm text-muted-foreground">
            Paste a key, write or paste content, click Check.{' '}
            <Link href="/settings/api-keys" className="underline">
              Get a key →
            </Link>
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apikey">API key</Label>
            <Input
              id="apikey"
              placeholder="sk_live_… or sk_test_…"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setStoredApiKey(e.target.value || null);
              }}
            />
          </div>
          <SamplesMenu
            onPick={(s) => {
              setInput(s.request.input);
              setTargetKeyword(s.request.targetKeyword);
              setSecondaryKeywords((s.request.secondaryKeywords ?? []).join(', '));
              setOptions(s.request.options ?? {});
              toast.success(`Loaded sample: ${s.label}`);
            }}
          />
          <InputTabs value={input} onChange={setInput} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !apiKey || !targetKeyword}
            >
              {mutation.isPending ? 'Checking…' : 'Check'}
            </Button>
            <CopyButtons apiKey={apiKey} request={request} response={response} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionsPanel
              targetKeyword={targetKeyword}
              secondaryKeywords={secondaryKeywords}
              options={options}
              onTargetKeywordChange={setTargetKeyword}
              onSecondaryKeywordsChange={setSecondaryKeywords}
              onOptionsChange={setOptions}
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {response ? (
        <ResultViewer response={response} canApply={canApply} onApply={onApply} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No results yet. Paste an API key, fill in a target keyword, and click Check.
        </p>
      )}
    </main>
  );
}

function applyToText(source: string, suggestion: Suggestion): string {
  switch (suggestion.type) {
    case 'rewrite':
      return suggestion.text;
    case 'add':
      return `${suggestion.text}\n\n${source}`;
    case 'remove':
      return source.split(suggestion.text).join('');
    case 'reorder':
      return source;
  }
}
```

- [ ] **Step 2: Build sanity check**

Run: `npm run build --workspace=@seo/web`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/playground/page.tsx
git commit -m "feat(web): /playground page (input tabs + options + samples + results + copy)"
```

---

# Phase S — API keys settings page

## Task S1: `/settings/api-keys` page

**Files:**
- Create: `apps/web/src/app/(app)/settings/api-keys/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api-keys';
import { ApiError } from '@/lib/api';
import type { ApiKeyDto, ApiKeyEnvironment, CreateApiKeyResponse } from '@/types/api';

export default function ApiKeysPage() {
  const { client } = useAuth();
  const qc = useQueryClient();

  const keysQuery = useQuery<ApiKeyDto[]>({
    queryKey: ['api-keys'],
    queryFn: () => listApiKeys(client),
  });

  const [showCreate, setShowCreate] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [newKeyEnv, setNewKeyEnv] = React.useState<ApiKeyEnvironment>('test');
  const [plaintext, setPlaintext] = React.useState<string | null>(null);

  const createMut = useMutation<CreateApiKeyResponse, Error, { name: string; environment: ApiKeyEnvironment }>({
    mutationFn: (input) => createApiKey(client, input),
    onSuccess: (res) => {
      setPlaintext(res.plaintext);
      setNewKeyName('');
      setShowCreate(false);
      void qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Create failed'),
  });

  const revokeMut = useMutation<void, Error, string>({
    mutationFn: (id) => revokeApiKey(client, id),
    onSuccess: () => {
      toast.success('Key revoked');
      void qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Revoke failed'),
  });

  const rows = keysQuery.data ?? [];

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API keys</h1>
          <p className="text-sm text-muted-foreground">
            Secret keys để gọi /api/v1/public/*. Plaintext chỉ hiển thị một lần khi tạo.
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>+ Create key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Đặt tên để phân biệt (ví dụ: "Production CI"). Plaintext sẽ hiển thị một lần ở bước tiếp theo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My CI integration"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env">Environment</Label>
                <Select
                  id="env"
                  value={newKeyEnv}
                  onChange={(e) => setNewKeyEnv(e.target.value as ApiKeyEnvironment)}
                >
                  <option value="test">test</option>
                  <option value="live">live</option>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!newKeyName.trim() || createMut.isPending}
                onClick={() =>
                  createMut.mutate({ name: newKeyName.trim(), environment: newKeyEnv })
                }
              >
                {createMut.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={plaintext !== null}
        onOpenChange={(open) => {
          if (!open) setPlaintext(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new API key</DialogTitle>
            <DialogDescription>
              Bạn sẽ <strong>không thể xem lại</strong> plaintext này. Hãy copy ngay bây giờ.
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{plaintext}</pre>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (plaintext) {
                  void navigator.clipboard.writeText(plaintext).then(() => toast.success('Copied'));
                }
              }}
            >
              Copy to clipboard
            </Button>
            <DialogClose asChild>
              <Button>I saved it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your keys</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {keysQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No keys yet — create one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Prefix</th>
                  <th className="px-4 py-2">Env</th>
                  <th className="px-4 py-2">Last used</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => {
                  const revoked = k.revokedAt !== null;
                  return (
                    <tr key={k.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{k.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{k.prefix}…</td>
                      <td className="px-4 py-2">
                        <Badge variant={k.environment === 'live' ? 'default' : 'secondary'}>
                          {k.environment}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'}
                      </td>
                      <td className="px-4 py-2">
                        {revoked ? (
                          <Badge variant="outline">revoked</Badge>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={revokeMut.isPending}
                            onClick={() => {
                              if (window.confirm(`Revoke "${k.name}"? This cannot be undone.`)) {
                                revokeMut.mutate(k.id);
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build --workspace=@seo/web`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/api-keys/page.tsx
git commit -m "feat(web): /settings/api-keys page (list + create modal + revoke)"
```

---

# Phase T — Playwright

## Task T1: Playground Playwright spec

**Files:**
- Create: `apps/web/tests/playground.spec.ts`

- [ ] **Step 1: Write `apps/web/tests/playground.spec.ts`**

```typescript
import { expect, test } from '@playwright/test';
import { uniqueUser } from './helpers/unique-user';

async function createApiKeyViaApi(apiBase: string, accessToken: string) {
  const r = await fetch(`${apiBase}/users/me/api-keys`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: 'playwright', environment: 'test' }),
  });
  if (!r.ok) throw new Error(`create key failed: ${r.status}`);
  return (await r.json()) as { plaintext: string };
}

test('playground: paste key + HTML + keyword → check returns score + issues', async ({ page, request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';
  const u = uniqueUser();
  const reg = await request.post(`${apiBase}/auth/register`, {
    data: { email: u.email, password: u.password, fullName: u.fullName },
  });
  const regJson = (await reg.json()) as { accessToken: string };
  const { plaintext } = await createApiKeyViaApi(apiBase, regJson.accessToken);

  await page.goto('/playground');
  await page.getByLabel('API key').fill(plaintext);

  // Switch to HTML tab
  await page.getByRole('tab', { name: /html/i }).click();

  // Fill editor (SSR fallback textarea — Monaco may need longer wait)
  const editor = page.locator('textarea, .monaco-editor').first();
  await editor.waitFor({ timeout: 10_000 });
  // Use keyboard to type a small HTML sample (works for both textarea and Monaco)
  await page.keyboard.press('Tab'); // ensure focus out
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta) {
      const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      proto?.set?.call(ta, '<html><title>Test SEO</title><body><h1>T</h1></body></html>');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await page.getByLabel('Target keyword').fill('seo');
  await page.getByLabel('Enrich mode').selectOption('template');
  await page.getByRole('button', { name: /^check$/i }).click();

  // Score card visible
  await expect(page.getByText(/\/\s*100/)).toBeVisible({ timeout: 15_000 });
});
```

- [ ] **Step 2: Run**

```bash
# Requires gateway + web dev servers. Bring docker up first.
npm run playwright --workspace=@seo/web -- playground
```
Expected: passes. (If flaky on Monaco hydration, increase timeout.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/playground.spec.ts
git commit -m "test(web): Playwright — playground check happy path"
```

---

## Task T2: API-keys Playwright spec

**Files:**
- Create: `apps/web/tests/api-keys.spec.ts`

- [ ] **Step 1: Write `apps/web/tests/api-keys.spec.ts`**

```typescript
import { expect, test } from '@playwright/test';
import { uniqueUser } from './helpers/unique-user';

test('api-keys: login → create → plaintext modal → list shows prefix → revoke', async ({ page, request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';
  const u = uniqueUser();
  await request.post(`${apiBase}/auth/register`, {
    data: { email: u.email, password: u.password, fullName: u.fullName },
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto('/settings/api-keys');
  await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();
  await page.getByRole('button', { name: /\+ create key/i }).click();
  await page.getByLabel('Name').fill('Smoke key');
  await page.getByLabel('Environment').selectOption('test');
  await page.getByRole('button', { name: /^create$/i }).click();

  // Plaintext modal
  await expect(page.getByText(/Copy your new API key/i)).toBeVisible({ timeout: 10_000 });
  const plaintextBlock = page.locator('pre');
  const plaintext = (await plaintextBlock.textContent())?.trim();
  expect(plaintext).toMatch(/^sk_test_/);

  // Close plaintext modal
  await page.getByRole('button', { name: /i saved it/i }).click();

  // Row appears in list
  await expect(page.getByText('Smoke key')).toBeVisible();

  // Revoke (confirm dialog)
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /revoke/i }).first().click();
  await expect(page.getByText('revoked')).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 2: Run**

```bash
npm run playwright --workspace=@seo/web -- api-keys
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/api-keys.spec.ts
git commit -m "test(web): Playwright — api-keys create/revoke"
```

---

# Phase U — Final verification

## Task U1: Full regression

**Files:** (none — verification)

- [ ] **Step 1: Web tests**

Run: `npm test --workspace=@seo/web`
Expected: PASS. (Plan 3a's 8 tests + Plan 3b's: 4 snippet-builders + 4 local-storage + 5 issue-card = 21 total.)

- [ ] **Step 2: Turbo lint + check-types**

Run: `npm run check-types && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Next build**

Run: `npm run build --workspace=@seo/web`
Expected: succeeds; both `/playground` and `/settings/api-keys` render statically or client-only per Next's decision.

- [ ] **Step 4: Playwright against live stack**

```bash
npm run docker:up
npm run dev --workspace=@seo/web   # background tab
npm run playwright --workspace=@seo/web
```
Expected: all specs pass (3a's auth + 3b's playground + api-keys = 4 tests total).

- [ ] **Step 5: Tag Plan 3b**

```bash
git tag public-api-plan-3b-done
```

- [ ] **Step 6: Do NOT push without explicit user approval.**

---

## Self-review checklist

- [ ] `/playground` accessible without login; paste key + input + keyword + Check → score + issues shown
- [ ] Input tabs: URL (Input), Markdown (Monaco/textarea), HTML (Monaco/textarea)
- [ ] Options panel controls `enrichMode`, `language`, filter `minSeverity`
- [ ] "Try a sample" loads 3 preloaded fixtures
- [ ] Copy-as-cURL / Copy-as-JS / Copy-response buttons emit correct strings (unit-tested)
- [ ] Result viewer: ScoreCard + category bars + client filter bar + IssueCards
- [ ] IssueCard shows severity/category/audience badges + suggestion + "Apply to input" button (unit-tested)
- [ ] Apply button only enabled on Markdown/HTML tabs (spec: URL input → no inline apply)
- [ ] `/settings/api-keys` is JWT-guarded (inherits `(app)` layout redirect)
- [ ] Create-key flow shows plaintext ONCE in a modal; plaintext cleared on close
- [ ] Revoke requires `window.confirm` → flips row to "revoked" badge
- [ ] localStorage keys: `seo-playground-api-key`, `seo-playground-input` (namespaced)
- [ ] Playwright tests cover: playground happy path, api-keys create/revoke
- [ ] Monaco dynamic-imported, SSR fallback to `<textarea>`
- [ ] No Claude trailer in any commit
- [ ] Pre-commit hook passed every time; never `--no-verify`

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-seo-public-api-plan-3b-public-api-ui.md`. Two execution options:

1. **Subagent-Driven (recommended)**
2. **Inline Execution**

After Plan 3b is tagged `public-api-plan-3b-done`, Plan 3c (`2026-04-22-seo-public-api-plan-3c-cli-docs.md`) can be done in parallel. 3c is independent — no dependency on web pages.
