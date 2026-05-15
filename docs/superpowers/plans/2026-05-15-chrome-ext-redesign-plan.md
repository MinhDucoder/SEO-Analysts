# Chrome Extension UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply design tokens + 5 mini components + Score hero ring to extension popup/options, fix the SW-inactive button bug, and commit 2 Pencil mockups — without breaking any of the 74 existing tests.

**Architecture:** Copy `apps/web/src/styles/tokens.css` (compiled from `design/system-tokens.pen` on main) into `apps/extension/lib/theme/`. Build 5 internal components (Button, Input, Badge, ScoreRing, IssueCard) backed by pure-logic helpers (testable in current node-env vitest). Rewrite popup/options App.tsx to compose those components. Fix popup's `OPEN_OPTIONS` message round-trip by calling `chrome.runtime.openOptionsPage()` directly.

**Tech Stack:** React 19, WXT 0.20 (Vite + MV3), Vitest 2 (node env), TypeScript 5.9, Pencil MCP (`mcp__pencil__*`).

**Spec:** `docs/superpowers/specs/2026-05-15-chrome-ext-redesign-design.md` (commit `424b6ed`)

---

## Pre-flight

Before starting Task 1, verify baseline:

- [ ] **Step 0: Confirm clean baseline**

Run from repo root:
```bash
cd apps/extension && npm run test 2>&1 | tail -5
cd apps/extension && npm run check-types 2>&1 | tail -3
cd apps/extension && npx wxt build 2>&1 | tail -5
```

Expected:
```
Test Files  5 passed (5)
Tests       74 passed (74)
(no tsc errors)
✔ Built extension in ~600 ms — Σ Total size: ~218 kB
```

If anything fails, stop and report — plan assumes clean baseline.

---

## Task 1: Theme tokens + classify utility

**Files:**
- Create: `apps/extension/lib/theme/tokens.css`
- Create: `apps/extension/lib/theme/tokens.ts`
- Create: `apps/extension/lib/theme/classify.ts`
- Create: `apps/extension/test/theme.spec.ts`

**Commit:** `chore(ext): import design tokens from apps/web + classify helper`

- [ ] **Step 1: Copy `tokens.css` from origin/main**

```bash
git show origin/main:apps/web/src/styles/tokens.css > apps/extension/lib/theme/tokens.css
```

Verify file starts with `/* GENERATED — do not edit by hand. */` and is ~150 lines.

- [ ] **Step 2: Create `tokens.ts` (TypeScript re-export of class colors for SVG inline)**

Write `apps/extension/lib/theme/tokens.ts`:

```ts
/**
 * Subset of design tokens exposed as TypeScript constants. We avoid
 * re-declaring everything — only the values that need to be read by
 * JS/SVG code (e.g. ScoreRing strokes), not the ones consumed via
 * CSS var(). When tokens.css changes, this file must be kept in
 * sync manually (see apps/extension/CLAUDE.md → tokens sync policy).
 */
export const CLASS_COLORS = {
  excellent: 'rgb(34 197 94)',  // --color-class-excellent
  good: 'rgb(59 130 246)',      // --color-class-good
  fair: 'rgb(245 158 11)',      // --color-class-fair
  poor: 'rgb(239 68 68)',       // --color-class-poor
} as const;

export type ScoreClass = keyof typeof CLASS_COLORS;
```

- [ ] **Step 3: Write failing test for `classify`**

Write `apps/extension/test/theme.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classify } from '../lib/theme/classify';

describe('classify(score) → ScoreClass', () => {
  it.each([
    [100, 'excellent'],
    [80, 'excellent'],
    [79, 'good'],
    [60, 'good'],
    [59, 'fair'],
    [40, 'fair'],
    [39, 'poor'],
    [0, 'poor'],
  ])('score %i → %s', (score, expected) => {
    expect(classify(score)).toBe(expected);
  });

  it('clamps negative to poor', () => {
    expect(classify(-10)).toBe('poor');
  });

  it('clamps >100 to excellent', () => {
    expect(classify(150)).toBe('excellent');
  });
});
```

- [ ] **Step 4: Run test — should fail with "Cannot find module"**

```bash
cd apps/extension && npx vitest run test/theme.spec.ts 2>&1 | tail -10
```

Expected: `Error: Cannot find module '../lib/theme/classify'`

- [ ] **Step 5: Implement `classify.ts`**

Write `apps/extension/lib/theme/classify.ts`:

```ts
import type { ScoreClass } from './tokens';

/**
 * Map a numeric SEO score (0-100) to a class bucket that picks the
 * matching --color-class-* token. Boundaries match the design spec
 * (>=80 excellent, >=60 good, >=40 fair, else poor). Out-of-range
 * inputs clamp to the nearest bucket — defensive, since the API
 * contract doesn't strictly guarantee 0-100.
 */
export function classify(score: number): ScoreClass {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}
```

- [ ] **Step 6: Run test — should pass**

```bash
cd apps/extension && npx vitest run test/theme.spec.ts 2>&1 | tail -10
```

Expected: `Tests 10 passed (10)`

- [ ] **Step 7: Run full suite — no regressions**

```bash
cd apps/extension && npm run test 2>&1 | tail -5
```

Expected: `Tests 84 passed (84)` (74 existing + 10 new)

- [ ] **Step 8: Type check**

```bash
cd apps/extension && npm run check-types 2>&1 | tail -3
```

Expected: no output (clean).

- [ ] **Step 9: Commit**

```bash
git add apps/extension/lib/theme/ apps/extension/test/theme.spec.ts
git commit -m "$(cat <<'EOF'
chore(ext): import design tokens from apps/web + classify helper

- tokens.css: copy from apps/web/src/styles/tokens.css (compiled
  from design/system-tokens.pen)
- tokens.ts: subset of class colors for SVG inline (ScoreRing)
- classify.ts: score → 'excellent' | 'good' | 'fair' | 'poor'
  with clamping for out-of-range inputs

Sync policy documented later in apps/extension/CLAUDE.md (Task 7).
EOF
)"
```

---

## Task 2: Component library (5 components, TDD)

**Files:**
- Create: `apps/extension/components/Button.tsx`
- Create: `apps/extension/components/Input.tsx`
- Create: `apps/extension/components/Badge.tsx`
- Create: `apps/extension/components/ScoreRing.tsx`
- Create: `apps/extension/components/IssueCard.tsx`
- Create: `apps/extension/components/index.ts`
- Create: `apps/extension/test/components.spec.ts`

**Commit:** `feat(ext): mini component library (Button, Input, Badge, ScoreRing, IssueCard)`

> **Design philosophy:** Each component is a tiny stateless functional component. Logic that branches on props (variant → className, score → SVG arc) is extracted as a **pure helper** exported from the same file, so we can unit-test in node env (no jsdom).

- [ ] **Step 1: Write failing tests for component helpers**

Write `apps/extension/test/components.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buttonClassName } from '../components/Button';
import { badgeClassName } from '../components/Badge';
import { computeArc } from '../components/ScoreRing';

describe('buttonClassName(variant, size, loading)', () => {
  it('primary md default', () => {
    const cn = buttonClassName({ variant: 'primary', size: 'md' });
    expect(cn).toContain('btn');
    expect(cn).toContain('btn-primary');
    expect(cn).toContain('btn-md');
  });
  it('secondary sm', () => {
    const cn = buttonClassName({ variant: 'secondary', size: 'sm' });
    expect(cn).toContain('btn-secondary');
    expect(cn).toContain('btn-sm');
  });
  it('ghost', () => {
    const cn = buttonClassName({ variant: 'ghost', size: 'md' });
    expect(cn).toContain('btn-ghost');
  });
  it('loading adds loading class', () => {
    const cn = buttonClassName({ variant: 'primary', size: 'md', loading: true });
    expect(cn).toContain('btn-loading');
  });
});

describe('badgeClassName(variant, tone)', () => {
  it('env test', () => {
    expect(badgeClassName('env', 'test')).toBe('badge badge-env badge-test');
  });
  it('env live', () => {
    expect(badgeClassName('env', 'live')).toBe('badge badge-env badge-live');
  });
  it('cached (tone defaulted to neutral)', () => {
    expect(badgeClassName('cached')).toContain('badge-cached');
  });
  it('severity error', () => {
    expect(badgeClassName('severity', 'error')).toContain('badge-error');
  });
});

describe('computeArc(score, radius)', () => {
  it('score 100 → dashoffset 0 (full circle)', () => {
    const r = 40;
    const { circumference, offset } = computeArc(100, r);
    expect(circumference).toBeCloseTo(2 * Math.PI * 40, 2);
    expect(offset).toBeCloseTo(0, 2);
  });
  it('score 0 → dashoffset === circumference (empty)', () => {
    const { circumference, offset } = computeArc(0, 40);
    expect(offset).toBeCloseTo(circumference, 2);
  });
  it('score 50 → half', () => {
    const { circumference, offset } = computeArc(50, 40);
    expect(offset).toBeCloseTo(circumference / 2, 2);
  });
  it('clamps negative', () => {
    const { circumference, offset } = computeArc(-10, 40);
    expect(offset).toBeCloseTo(circumference, 2);
  });
  it('clamps >100', () => {
    const { circumference, offset } = computeArc(150, 40);
    expect(offset).toBeCloseTo(0, 2);
  });
});
```

- [ ] **Step 2: Run tests — all fail with "Cannot find module"**

```bash
cd apps/extension && npx vitest run test/components.spec.ts 2>&1 | tail -10
```

Expected: 3 module-not-found errors (Button, Badge, ScoreRing).

- [ ] **Step 3: Implement `Button.tsx`**

Write `apps/extension/components/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

interface ButtonClassArgs {
  variant: ButtonVariant;
  size: ButtonSize;
  loading?: boolean;
}

/** Pure className builder — testable without DOM. */
export function buttonClassName({ variant, size, loading }: ButtonClassArgs): string {
  return [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading ? 'btn-loading' : '',
  ].filter(Boolean).join(' ');
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={buttonClassName({ variant, size, loading })}
    >
      {loading && <span className="btn-spinner" aria-hidden />}
      <span>{children}</span>
    </button>
  );
}
```

- [ ] **Step 4: Implement `Input.tsx`**

Write `apps/extension/components/Input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export function Input({ label, error, onChange, id, ...rest }: InputProps) {
  const inputId = id ?? `input-${rest.name ?? 'unnamed'}`;
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <input
        {...rest}
        id={inputId}
        onChange={(e) => onChange?.(e.target.value)}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && <span id={`${inputId}-error`} className="field-error">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 5: Implement `Badge.tsx`**

Write `apps/extension/components/Badge.tsx`:

```tsx
import type { ReactNode } from 'react';

export type BadgeVariant = 'env' | 'cached' | 'severity' | 'meta';
export type BadgeTone =
  | 'live' | 'test'
  | 'success' | 'warning' | 'error' | 'info'
  | 'neutral';

/** Pure className builder — testable without DOM. */
export function badgeClassName(variant: BadgeVariant, tone: BadgeTone = 'neutral'): string {
  return `badge badge-${variant} badge-${tone}`;
}

interface BadgeProps {
  variant: BadgeVariant;
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ variant, tone, children }: BadgeProps) {
  return <span className={badgeClassName(variant, tone)}>{children}</span>;
}
```

- [ ] **Step 6: Implement `ScoreRing.tsx`**

Write `apps/extension/components/ScoreRing.tsx`:

```tsx
import { classify } from '../lib/theme/classify';
import { CLASS_COLORS } from '../lib/theme/tokens';

const SIZES = {
  lg: { box: 96, radius: 40, stroke: 8, fontSize: 24 },
  sm: { box: 42, radius: 18, stroke: 4, fontSize: 13 },
} as const;

export type RingSize = keyof typeof SIZES;

interface ArcResult {
  circumference: number;
  offset: number;
}

/** Pure SVG arc math — testable without DOM. */
export function computeArc(score: number, radius: number): ArcResult {
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return { circumference, offset };
}

interface ScoreRingProps {
  score: number;
  size?: RingSize;
  label?: string;
}

export function ScoreRing({ score, size = 'lg', label }: ScoreRingProps) {
  const dims = SIZES[size];
  const { circumference, offset } = computeArc(score, dims.radius);
  const cls = classify(score);
  const color = CLASS_COLORS[cls];
  const cx = dims.box / 2;

  return (
    <div className={`score-ring score-ring-${size}`}>
      <svg width={dims.box} height={dims.box} viewBox={`0 0 ${dims.box} ${dims.box}`}>
        <circle
          cx={cx} cy={cx} r={dims.radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={dims.stroke}
        />
        <circle
          cx={cx} cy={cx} r={dims.radius}
          fill="none"
          stroke={color}
          strokeWidth={dims.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <text
          x={cx} y={cx}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={dims.fontSize}
          fontWeight={700}
          fill="var(--color-fg)"
        >
          {Math.round(Math.max(0, Math.min(100, score)))}
        </text>
      </svg>
      {label && size === 'lg' && <span className="score-ring-label">{label}</span>}
    </div>
  );
}
```

- [ ] **Step 7: Implement `IssueCard.tsx`**

Write `apps/extension/components/IssueCard.tsx`:

```tsx
import type { PublicCheckIssue } from '../lib/api-types';
import { Badge } from './Badge';

const SUGGESTION_ICON: Record<string, string> = {
  rewrite: '✏️',
  add: '➕',
  remove: '➖',
  reorder: '↔️',
};

interface IssueCardProps {
  issue: PublicCheckIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <article className={`issue issue-${issue.severity}`}>
      <header className="issue-header">
        <h3 className="issue-title">{issue.title}</h3>
        <Badge variant="severity" tone={issue.severity}>
          {issue.severity}
        </Badge>
      </header>
      <p className="issue-desc">{issue.description}</p>

      {issue.suggestion && (
        <div className="issue-suggestion">
          <div className="issue-suggestion-label">
            <span aria-hidden>{SUGGESTION_ICON[issue.suggestion.type] ?? '💡'}</span>{' '}
            {issue.suggestion.type.charAt(0).toUpperCase() + issue.suggestion.type.slice(1)}
          </div>
          <div className="issue-suggestion-text">{issue.suggestion.text}</div>
          {issue.suggestion.rationale && (
            <div className="issue-suggestion-rationale">{issue.suggestion.rationale}</div>
          )}
        </div>
      )}

      {issue.docRef && (
        <a className="issue-doc" href={issue.docRef} target="_blank" rel="noreferrer">
          Learn more →
        </a>
      )}
    </article>
  );
}
```

- [ ] **Step 8: Create `index.ts` barrel export**

Write `apps/extension/components/index.ts`:

```ts
export { Button, buttonClassName } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { Input } from './Input';
export { Badge, badgeClassName } from './Badge';
export type { BadgeVariant, BadgeTone } from './Badge';
export { ScoreRing, computeArc } from './ScoreRing';
export type { RingSize } from './ScoreRing';
export { IssueCard } from './IssueCard';
```

- [ ] **Step 9: Add component styles to tokens.css**

Append to `apps/extension/lib/theme/tokens.css` (after the existing token definitions):

```css

/* ─── Extension component primitives ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-ui), system-ui, sans-serif;
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn[disabled] { cursor: not-allowed; opacity: 0.6; }
.btn-md { padding: 6px 12px; font-size: var(--text-sm); }
.btn-sm { padding: 4px 10px; font-size: var(--text-xs); }
.btn-primary {
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-fg));
}
.btn-primary:hover:not([disabled]) { background: rgb(var(--color-fg)); }
.btn-secondary {
  background: rgb(var(--color-bg-overlay));
  color: rgb(var(--color-fg));
  border-color: rgb(var(--color-border));
}
.btn-secondary:hover:not([disabled]) { border-color: rgb(var(--color-border-strong)); }
.btn-ghost {
  background: transparent;
  color: rgb(var(--color-fg-muted));
}
.btn-ghost:hover:not([disabled]) {
  background: rgb(var(--color-bg-overlay));
  color: rgb(var(--color-fg));
}
.btn-loading .btn-spinner {
  width: 12px; height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.field { display: flex; flex-direction: column; gap: var(--space-1); }
.field-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--color-fg-subtle));
}
.field-input {
  padding: 6px 10px;
  border: 1px solid rgb(var(--color-border));
  border-radius: var(--radius-md);
  font-family: var(--font-ui), system-ui, sans-serif;
  font-size: var(--text-sm);
  background: rgb(var(--color-bg));
  color: rgb(var(--color-fg));
}
.field-input:focus {
  outline: none;
  border-color: rgb(var(--color-border-strong));
}
.field-input-error { border-color: rgb(var(--color-error)); }
.field-error { font-size: var(--text-xs); color: rgb(var(--color-error)); }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.badge-env.badge-test { background: rgb(var(--color-info) / 0.15); color: rgb(var(--color-info)); }
.badge-env.badge-live { background: rgb(var(--color-success) / 0.15); color: rgb(var(--color-success)); }
.badge-cached, .badge-cached.badge-neutral {
  background: rgb(var(--color-warning) / 0.15);
  color: rgb(var(--color-warning));
}
.badge-severity.badge-error { background: rgb(var(--color-error) / 0.12); color: rgb(var(--color-error)); }
.badge-severity.badge-warning { background: rgb(var(--color-warning) / 0.15); color: rgb(var(--color-warning)); }
.badge-severity.badge-info { background: rgb(var(--color-info) / 0.12); color: rgb(var(--color-info)); }
.badge-meta { background: rgb(var(--color-bg-overlay)); color: rgb(var(--color-fg-muted)); }

.score-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
.score-ring-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--color-fg-subtle));
}

.issue {
  background: rgb(var(--color-bg-elevated));
  border: 1px solid rgb(var(--color-border));
  border-left: 3px solid rgb(var(--color-fg-subtle));
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.issue-error   { border-left-color: rgb(var(--color-error));   }
.issue-warning { border-left-color: rgb(var(--color-warning)); }
.issue-info    { border-left-color: rgb(var(--color-info));    }
.issue-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.issue-title {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: rgb(var(--color-fg));
  margin: 0;
}
.issue-desc {
  font-size: var(--text-xs);
  color: rgb(var(--color-fg-muted));
  margin: 0;
}
.issue-suggestion {
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-border));
  border-radius: var(--radius-sm);
  padding: var(--space-2);
}
.issue-suggestion-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: rgb(var(--color-fg-subtle));
  margin-bottom: 4px;
}
.issue-suggestion-text {
  font-size: var(--text-xs);
  font-family: var(--font-mono), ui-monospace, monospace;
  color: rgb(var(--color-fg));
}
.issue-suggestion-rationale {
  font-size: var(--text-xs);
  font-style: italic;
  color: rgb(var(--color-fg-subtle));
  margin-top: 4px;
}
.issue-doc {
  font-size: var(--text-xs);
  color: rgb(var(--color-info));
  text-decoration: none;
  align-self: flex-start;
}
.issue-doc:hover { text-decoration: underline; }
```

- [ ] **Step 10: Run tests — all pass**

```bash
cd apps/extension && npm run test 2>&1 | tail -5
```

Expected: `Tests 99 passed (99)` (84 + 15 new from components.spec).

- [ ] **Step 11: Type check**

```bash
cd apps/extension && npm run check-types 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 12: Build sanity**

```bash
cd apps/extension && npx wxt build 2>&1 | tail -3
```

Expected: bundle still builds; size may grow ~5-10 KB (tokens.css + components). Should be < 235 KB.

- [ ] **Step 13: Commit**

```bash
git add apps/extension/components/ apps/extension/lib/theme/tokens.css apps/extension/test/components.spec.ts
git commit -m "$(cat <<'EOF'
feat(ext): mini component library (Button, Input, Badge, ScoreRing, IssueCard)

5 components + barrel export in apps/extension/components/. Each
component is a tiny SFC; logic that branches on props is extracted
as pure helpers (buttonClassName, badgeClassName, computeArc) so we
unit-test in node env without jsdom.

ScoreRing uses pure SVG with strokeDasharray math — resolution
independent, dark-mode safe (currentColor inherits). classify() maps
score to one of 4 token buckets matching --color-class-*.

CSS appended to lib/theme/tokens.css (no separate stylesheet to keep
things simple — popup/options HTML will <link> tokens.css).
EOF
)"
```

---

## Task 3: Fix SW-inactive button bug (popup → openOptionsPage direct)

**Files:**
- Modify: `apps/extension/entrypoints/popup/App.tsx:42-44`
- Modify: `apps/extension/entrypoints/options/App.tsx` (wrap API_KEY_SAVED in try/catch)

**Commit:** `fix(ext): SW-inactive bug — popup calls openOptionsPage() directly`

> This task is a surgical fix WITHOUT redesign. Popup still looks ugly after this — that's fine. Tasks 4-5 do the visual rewrite.

- [ ] **Step 1: Edit popup `openOptions()` to call API directly**

In `apps/extension/entrypoints/popup/App.tsx`, replace:

```tsx
function openOptions() {
  void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
}
```

with:

```tsx
function openOptions() {
  // Popup is an extension context → can call openOptionsPage()
  // directly. The previous version routed through the service worker
  // via sendMessage, which silently dropped when the SW had idled out
  // (chrome.runtime.sendMessage on an inactive SW resolves with
  // undefined and the user's click vanishes).
  chrome.runtime.openOptionsPage();
}
```

- [ ] **Step 2: Wrap `API_KEY_SAVED` send in options/App.tsx**

In `apps/extension/entrypoints/options/App.tsx`, find:

```tsx
await chrome.runtime.sendMessage({
  type: 'API_KEY_SAVED',
  environment: env ?? 'test',
});
```

Replace with:

```tsx
try {
  await chrome.runtime.sendMessage({
    type: 'API_KEY_SAVED',
    environment: env ?? 'test',
  });
} catch {
  // Best-effort notification. SW may be inactive; the key is already
  // saved in chrome.storage.local, so popup will pick it up on its
  // next open regardless.
}
```

- [ ] **Step 3: Run tests — must still pass (no test churn)**

```bash
cd apps/extension && npm run test 2>&1 | tail -5
```

Expected: `Tests 99 passed (99)`.

- [ ] **Step 4: Type check**

```bash
cd apps/extension && npm run check-types 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 5: Manual smoke (optional but recommended)**

1. Build: `npx wxt build`
2. Reload `chrome://extensions` → SEO Analyst → reload button
3. Open popup → click "Set up API key" → options must open
4. Wait 60s for SW to idle → reopen popup → click again → still opens

- [ ] **Step 6: Commit**

```bash
git add apps/extension/entrypoints/popup/App.tsx apps/extension/entrypoints/options/App.tsx
git commit -m "$(cat <<'EOF'
fix(ext): SW-inactive bug — popup calls openOptionsPage() directly

Manifest V3 service workers shut down after 30s idle. The popup was
routing OPEN_OPTIONS through chrome.runtime.sendMessage, which silently
resolves with undefined when the SW has slept — the user's click was
disappearing into the void.

Switch to chrome.runtime.openOptionsPage() called directly in the
popup. The popup is itself an extension context, so the API is
available without crossing the message bus.

Also wrap API_KEY_SAVED send in try/catch — same root cause, but
non-critical (key is already in chrome.storage.local).

The background.ts OPEN_OPTIONS handler stays as fallback for any
future external callers (content script, externally_connectable).
EOF
)"
```

---

## Task 4: Popup redesign (4 states)

**Files:**
- Rewrite: `apps/extension/entrypoints/popup/App.tsx`
- Modify: `apps/extension/entrypoints/popup/index.html` (link tokens.css)

**Commit:** `feat(ext): popup redesign — 4 states with score hero`

- [ ] **Step 1: Link tokens.css from popup/index.html**

Read `apps/extension/entrypoints/popup/index.html` and add inside `<head>`:

```html
    <link rel="stylesheet" href="/lib/theme/tokens.css" />
```

WXT resolves `/lib/theme/tokens.css` relative to the extension root after build, so the file needs to be reachable. WXT's default config copies `lib/` assets — verify with build (Step 10).

If build doesn't include tokens.css, fallback: copy contents to a `<style>` block, OR move tokens.css to `public/tokens.css` and reference as `/tokens.css`. Decision point — prefer link approach first, fallback only if build fails.

- [ ] **Step 2: Rewrite popup `App.tsx` completely**

Replace entire contents of `apps/extension/entrypoints/popup/App.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';
import { dispatchErrorCode } from '@/lib/errors';
import { Button, Input, Badge, ScoreRing, IssueCard } from '@/components';
import type { PublicCheckResponse } from '@/lib/api-types';
import type { AuditReply, AuditErr } from '../background';

type Mode =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; result: PublicCheckResponse }
  | { kind: 'error'; err: AuditErr };

export function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [env, setEnv] = useState<'live' | 'test' | null>(null);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });

  useEffect(() => {
    void loadApiKey().then((k) => {
      setHasKey(!!k);
      if (k) setEnv(parseApiKeyEnvironment(k));
    });
  }, []);

  async function runAudit() {
    setMode({ kind: 'running' });
    const reply = (await chrome.runtime.sendMessage({
      type: 'AUDIT_PAGE',
      targetKeyword: keyword,
      language: 'vi',
    })) as AuditReply;
    if (reply.ok) setMode({ kind: 'ok', result: reply.result });
    else setMode({ kind: 'error', err: reply });
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  // === Boot state — skeleton instead of "Loading…" text ===
  if (hasKey === null) {
    return (
      <main className="popup">
        <BootSkeleton />
      </main>
    );
  }

  // === Empty state — no API key ===
  if (hasKey === false) {
    return (
      <main className="popup">
        <header className="popup-header">
          <h1 className="popup-title">SEO Analyst</h1>
        </header>
        <div className="popup-empty">
          <div className="popup-empty-icon" aria-hidden>🔑</div>
          <div className="popup-empty-title">Connect your API key</div>
          <p className="popup-empty-desc">to start auditing pages</p>
          <Button variant="primary" size="md" onClick={openOptions}>
            Open settings
          </Button>
        </div>
      </main>
    );
  }

  // === Audit form + result ===
  return (
    <main className="popup">
      <header className="popup-header">
        <h1 className="popup-title">SEO Analyst</h1>
        {env && (
          <Badge variant="env" tone={env}>{env}</Badge>
        )}
      </header>

      <form
        className="popup-form"
        onSubmit={(e) => { e.preventDefault(); void runAudit(); }}
      >
        <Input
          label="Target keyword"
          placeholder="e.g. seo 2026"
          value={keyword}
          onChange={setKeyword}
          disabled={mode.kind === 'running'}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!keyword || mode.kind === 'running'}
          loading={mode.kind === 'running'}
        >
          {mode.kind === 'running' ? 'Auditing…' : 'Audit page'}
        </Button>
      </form>

      {mode.kind === 'running' && <LoadingSkeleton />}
      {mode.kind === 'ok' && <ResultView result={mode.result} />}
      {mode.kind === 'error' && (
        <ErrorView err={mode.err} onOpenOptions={openOptions} onRetry={runAudit} />
      )}

      <footer className="popup-footer">
        <Button variant="ghost" size="sm" onClick={openOptions}>
          Manage key
        </Button>
      </footer>
    </main>
  );
}

function BootSkeleton() {
  return (
    <div className="popup-empty">
      <div className="skeleton skeleton-icon" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-button" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <section className="popup-result">
      <div className="skeleton skeleton-ring" />
      <div className="skeleton skeleton-stats" />
      <div className="skeleton skeleton-issue" />
      <div className="skeleton skeleton-issue" />
    </section>
  );
}

function ResultView({ result }: { result: PublicCheckResponse }) {
  const banner = aiBanner(result.meta);
  return (
    <section className="popup-result">
      <div className="popup-score">
        <ScoreRing score={result.score} size="lg" label="SEO Score" />
        <p className="popup-stats">
          {result.issues.length} issues · {result.meta.contentStats.words} words
          {result.meta.cached && <> · <Badge variant="cached">cached</Badge></>}
        </p>
      </div>

      {banner && <div className={`popup-banner popup-banner-${banner.tone}`}>{banner.text}</div>}

      <ul className="popup-issues">
        {result.issues.length === 0 && (
          <li className="popup-none">No issues found 🎉</li>
        )}
        {result.issues.map((i, idx) => (
          <li key={`${i.ruleId}-${idx}`}>
            <IssueCard issue={i} />
          </li>
        ))}
      </ul>

      <p className="popup-usage">
        {result.meta.usage.remaining.minute} reqs left / min ·{' '}
        {result.meta.usage.remaining.day} / day
      </p>
    </section>
  );
}

function aiBanner(meta: PublicCheckResponse['meta']): { text: string; tone: 'info' | 'warning' } | null {
  if (meta.suggestionSource === 'llm') {
    return { text: '✨ AI suggestions', tone: 'info' };
  }
  if (meta.suggestionSource === 'mixed') {
    return { text: '✨ AI + template suggestions', tone: 'info' };
  }
  if (meta.suggestionSource === 'template' && meta.enrichMode === 'llm') {
    return { text: '⚠️ Template fallback (AI unavailable)', tone: 'warning' };
  }
  return null;
}

function ErrorView({
  err,
  onOpenOptions,
  onRetry,
}: {
  err: AuditErr;
  onOpenOptions: () => void;
  onRetry: () => void;
}) {
  const action = dispatchErrorCode(err.code);
  return (
    <section className="popup-error">
      <p className="popup-error-msg">{err.message}</p>
      <p className="popup-error-meta">
        {err.code}
        {err.requestId ? ` · ${err.requestId}` : ''}
        {err.status > 0 ? ` · HTTP ${err.status}` : ''}
      </p>
      {action === 'OPEN_OPTIONS' && (
        <Button variant="primary" size="md" onClick={onOpenOptions}>Open settings</Button>
      )}
      {action === 'RETRY_LATER' && err.retryAfterSeconds && (
        <RetryCountdown seconds={err.retryAfterSeconds} onRetry={onRetry} />
      )}
      {(action === 'INPUT_FIX' || action === 'SHOW_SERVER_OUTAGE' || action === 'SHOW_GENERIC') && (
        <Button variant="secondary" size="md" onClick={onRetry}>Try again</Button>
      )}
    </section>
  );
}

function RetryCountdown({ seconds, onRetry }: { seconds: number; onRetry: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left > 0) return <p className="popup-retry">Retry in {left}s…</p>;
  return <Button variant="primary" size="md" onClick={onRetry}>Retry now</Button>;
}
```

- [ ] **Step 3: Append popup layout styles to tokens.css**

Append to `apps/extension/lib/theme/tokens.css`:

```css

/* ─── Popup layout ─── */

.popup {
  width: 380px;
  padding: var(--space-3);
  background: rgb(var(--color-bg));
  color: rgb(var(--color-fg));
  font-family: var(--font-ui), system-ui, sans-serif;
  font-size: var(--text-sm);
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.popup-title { font-size: var(--text-md); font-weight: var(--weight-semibold); margin: 0; }
.popup-form { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-3); }
.popup-form .btn { width: 100%; }
.popup-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-3);
  text-align: center;
}
.popup-empty-icon { font-size: 32px; }
.popup-empty-title { font-size: var(--text-md); font-weight: var(--weight-semibold); }
.popup-empty-desc { font-size: var(--text-sm); color: rgb(var(--color-fg-subtle)); margin: 0; }
.popup-result { display: flex; flex-direction: column; gap: var(--space-3); }
.popup-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid rgb(var(--color-border));
}
.popup-stats {
  font-size: var(--text-xs);
  color: rgb(var(--color-fg-muted));
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.popup-banner {
  padding: var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  text-align: center;
}
.popup-banner-info { background: rgb(var(--color-info) / 0.1); color: rgb(var(--color-info)); }
.popup-banner-warning { background: rgb(var(--color-warning) / 0.1); color: rgb(var(--color-warning)); }
.popup-issues {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 360px;
  overflow-y: auto;
}
.popup-none { font-size: var(--text-sm); color: rgb(var(--color-success)); text-align: center; padding: var(--space-4); }
.popup-usage { font-size: var(--text-xs); color: rgb(var(--color-fg-subtle)); text-align: center; margin: 0; }
.popup-footer {
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid rgb(var(--color-border));
  text-align: right;
}
.popup-error {
  background: rgb(var(--color-error) / 0.08);
  border: 1px solid rgb(var(--color-error) / 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.popup-error-msg { color: rgb(var(--color-error)); font-size: var(--text-sm); margin: 0; }
.popup-error-meta {
  color: rgb(var(--color-error));
  opacity: 0.7;
  font-family: var(--font-mono), monospace;
  font-size: var(--text-xs);
  margin: 0;
}
.popup-retry { font-size: var(--text-xs); color: rgb(var(--color-fg-muted)); margin: 0; }

.skeleton {
  background: linear-gradient(90deg,
    rgb(var(--color-bg-overlay)) 0%,
    rgb(var(--color-bg-elevated)) 50%,
    rgb(var(--color-bg-overlay)) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
.skeleton-icon { width: 32px; height: 32px; border-radius: 50%; }
.skeleton-title { width: 200px; height: 18px; }
.skeleton-button { width: 140px; height: 32px; }
.skeleton-ring { width: 96px; height: 96px; border-radius: 50%; margin: 0 auto; }
.skeleton-stats { width: 180px; height: 12px; margin: 0 auto; }
.skeleton-issue { width: 100%; height: 64px; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- [ ] **Step 4: Run tests — no regression**

```bash
cd apps/extension && npm run test 2>&1 | tail -5
```

Expected: `Tests 99 passed (99)`.

- [ ] **Step 5: Type check**

```bash
cd apps/extension && npm run check-types 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 6: Build + verify tokens.css is in bundle**

```bash
cd apps/extension && npx wxt build 2>&1 | tail -10
ls -la .output/chrome-mv3/lib/theme/ 2>/dev/null
```

Expected: build succeeds. `.output/chrome-mv3/lib/theme/tokens.css` exists.

If `tokens.css` is NOT in the output:
- Open `apps/extension/wxt.config.ts`
- Add `publicDir` or `vite.build.assetsInclude` config, OR move tokens.css to `apps/extension/public/tokens.css` and update the `<link>` href in index.html accordingly
- Re-run build

- [ ] **Step 7: Manual smoke**

Reload extension in Chrome. Open popup. Verify:
1. Empty state: 🔑 icon + "Connect your API key" + button
2. Click "Open settings" → options page opens (bug fix verified)
3. After saving key in options, popup shows form with env badge
4. Click "Audit page" with keyword → loading skeleton → result with score ring

- [ ] **Step 8: Bundle size check**

```bash
cd apps/extension && du -sk .output/chrome-mv3/
```

Expected: < 250 KB total.

- [ ] **Step 9: Commit**

```bash
git add apps/extension/entrypoints/popup/ apps/extension/lib/theme/tokens.css
git commit -m "$(cat <<'EOF'
feat(ext): popup redesign — 4 states with score hero

Rewrite popup App.tsx to consume the component library:
- Boot: skeleton instead of "Loading…" flash
- Empty: icon + title + Button (no more inline-styled CTA)
- Idle: Input + Button via design tokens
- Loading: skeleton ring + skeleton issue cards
- Result: ScoreRing lg (96px) hero + stats + AI banner + IssueCard list

AI banner logic reads meta.suggestionSource:
- 'llm'      → "✨ AI suggestions" (info tone)
- 'mixed'    → "✨ AI + template suggestions" (info)
- 'template' + enrichMode='llm' → "⚠️ Template fallback" (warning)
- otherwise  → no banner

Popup loads tokens.css via <link> in index.html. WXT copies the
file from lib/theme/ into the output bundle automatically.
EOF
)"
```

---

## Task 5: Options redesign (4 states)

**Files:**
- Rewrite: `apps/extension/entrypoints/options/App.tsx`
- Modify: `apps/extension/entrypoints/options/index.html` (link tokens.css)

**Commit:** `feat(ext): options redesign — 4 states with token-based form`

- [ ] **Step 1: Link tokens.css from options/index.html**

Same as Task 4 Step 1 — add to `<head>`:

```html
    <link rel="stylesheet" href="/lib/theme/tokens.css" />
```

- [ ] **Step 2: Rewrite options App.tsx**

Replace `apps/extension/entrypoints/options/App.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import {
  clearApiKey,
  isValidApiKeyFormat,
  loadApiKey,
  parseApiKeyEnvironment,
  saveApiKey,
} from '@/lib/storage';
import { Button, Input, Badge } from '@/components';
import type { ApiKeyEnvironment } from '@/lib/types';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; env: ApiKeyEnvironment }
  | { kind: 'error'; message: string };

export function App() {
  const [input, setInput] = useState('');
  const [existing, setExisting] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    void loadApiKey().then(setExisting);
  }, []);

  const existingEnv = existing ? parseApiKeyEnvironment(existing) : null;
  const inputValid = input.length === 0 || isValidApiKeyFormat(input);
  const inputEnv = isValidApiKeyFormat(input) ? parseApiKeyEnvironment(input) : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await saveApiKey(input.trim());
      const env = parseApiKeyEnvironment(input.trim());
      setExisting(input.trim());
      setInput('');
      setStatus({ kind: 'saved', env: env ?? 'test' });
      try {
        await chrome.runtime.sendMessage({
          type: 'API_KEY_SAVED',
          environment: env ?? 'test',
        });
      } catch {
        // SW may be inactive; key is already in chrome.storage.local.
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleClear() {
    await clearApiKey();
    setExisting(null);
    setStatus({ kind: 'idle' });
  }

  // === Saved state ===
  if (existing) {
    return (
      <main className="opt">
        <header className="opt-header">
          <h1 className="opt-title">SEO Analyst — Settings</h1>
        </header>
        <section className="opt-section">
          <div className="opt-section-header">
            <label className="opt-label">API key</label>
            {existingEnv && <Badge variant="env" tone={existingEnv}>{existingEnv}</Badge>}
          </div>
          <input
            className="field-input"
            type="text"
            value={maskKey(existing)}
            readOnly
            aria-label="Saved API key (masked)"
          />
          <Button variant="secondary" size="md" onClick={handleClear}>
            Remove
          </Button>
        </section>
      </main>
    );
  }

  // === Empty / Typing / Error state ===
  const error = !inputValid ? 'Key must match sk_(live|test)_ followed by 43 chars' : undefined;

  return (
    <main className="opt">
      <header className="opt-header">
        <h1 className="opt-title">SEO Analyst — Settings</h1>
      </header>
      <form className="opt-section" onSubmit={handleSave}>
        <Input
          label="API key"
          placeholder="Paste your sk_(live|test)_..."
          value={input}
          onChange={setInput}
          error={error}
          disabled={status.kind === 'saving'}
          autoFocus
        />
        <p className="opt-hint">
          Get one at <a href="https://seoanalyst.app/settings/api-keys" target="_blank" rel="noreferrer">seoanalyst.app/settings/api-keys</a>
        </p>
        {inputEnv && (
          <p className="opt-valid">✓ Valid {inputEnv} environment</p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputValid || input.length === 0 || status.kind === 'saving'}
          loading={status.kind === 'saving'}
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        {status.kind === 'error' && (
          <p className="opt-error">{status.message}</p>
        )}
      </form>
    </main>
  );
}

function maskKey(key: string): string {
  if (key.length < 12) return key;
  return `${key.slice(0, 8)}${'•'.repeat(8)}${key.slice(-4)}`;
}
```

- [ ] **Step 3: Append options styles to tokens.css**

Append to `apps/extension/lib/theme/tokens.css`:

```css

/* ─── Options page layout ─── */

.opt {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  background: rgb(var(--color-bg));
  color: rgb(var(--color-fg));
  font-family: var(--font-ui), system-ui, sans-serif;
  font-size: var(--text-sm);
}
.opt-header { margin-bottom: var(--space-5); }
.opt-title { font-size: var(--text-xl); font-weight: var(--weight-semibold); margin: 0; }
.opt-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: rgb(var(--color-bg-elevated));
  border: 1px solid rgb(var(--color-border));
  border-radius: var(--radius-lg);
}
.opt-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.opt-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--color-fg-subtle));
}
.opt-hint {
  font-size: var(--text-xs);
  color: rgb(var(--color-fg-subtle));
  margin: 0;
}
.opt-hint a {
  color: rgb(var(--color-info));
  text-decoration: none;
}
.opt-hint a:hover { text-decoration: underline; }
.opt-valid {
  font-size: var(--text-xs);
  color: rgb(var(--color-success));
  margin: 0;
}
.opt-error {
  font-size: var(--text-xs);
  color: rgb(var(--color-error));
  margin: 0;
}
```

- [ ] **Step 4: Run tests + type check + build**

```bash
cd apps/extension && npm run test 2>&1 | tail -5
cd apps/extension && npm run check-types 2>&1 | tail -3
cd apps/extension && npx wxt build 2>&1 | tail -5
```

Expected: 99 tests pass, no type errors, bundle < 250 KB.

- [ ] **Step 5: Manual smoke**

Reload extension. Open options page (right-click icon → Options OR `chrome-extension://<id>/options.html`):
1. Empty: form with disabled Save button
2. Type "sk_te" (partial) → error "Key must match…", Save disabled
3. Paste valid key → green "✓ Valid test environment", Save enabled
4. Click Save → reloads to Saved state with masked key + env badge + Remove button
5. Click Remove → back to empty form

- [ ] **Step 6: Commit**

```bash
git add apps/extension/entrypoints/options/ apps/extension/lib/theme/tokens.css
git commit -m "$(cat <<'EOF'
feat(ext): options redesign — 4 states with token-based form

Rewrite options App.tsx to consume the component library:
- Empty: Input + disabled Save
- Typing (valid): green "✓ Valid <env>" + Save enabled
- Saved: masked key (sk_test_••••••6oxN) + env Badge + Remove button
- Error: red field border + error text below input

Pre-existing logic kept: saveApiKey, clearApiKey, isValidApiKeyFormat,
parseApiKeyEnvironment. New helper maskKey(key) renders the saved key
with first 8 + 8 dots + last 4 chars.

Tokens loaded same way as popup (<link rel="stylesheet" ...>).
EOF
)"
```

---

## Task 6: Pencil mockups (popup + options, 4 states each)

**Files:**
- Create: `design/page/extension-popup.pen` (via Pencil MCP)
- Create: `design/page/extension-options.pen` (via Pencil MCP)

**Commit:** `design(ext): Pencil mockups — popup + options 4 states each`

> Pencil files are encrypted — must use `mcp__pencil__*` tools only. NEVER use Read/Grep/Write on .pen files.

- [ ] **Step 1: Verify Pencil MCP available**

```bash
which mcp || echo "MCP tools accessed via tool calls, not CLI"
```

Confirm `mcp__pencil__open_document`, `mcp__pencil__batch_design`, `mcp__pencil__get_variables` are available in the current session.

- [ ] **Step 2: Inspect design system variables**

Call `mcp__pencil__open_document` with `design/system-tokens.pen`. Then `mcp__pencil__get_variables` to dump all `$color-*`, `$radius-*`, `$space-*`, `$text-*` variable names.

Save the variable list to a scratch file (e.g. `/tmp/pencil-vars.txt`) for reference in subsequent steps.

- [ ] **Step 3: Create `extension-popup.pen` — Empty state frame**

Call `mcp__pencil__batch_design` to create a new document at `design/page/extension-popup.pen` with:
- Canvas 1600x1200
- First frame "1. Empty" at position (50, 50), size 360x520
- Inside frame: background `var($color-bg)`, border-radius `var($radius-xl)`, padding `var($space-4)`
- Header row: text "SEO Analyst" `var($text-md)` weight-semibold
- Centered empty state: emoji "🔑" 32px + title "Connect your API key" `var($text-md)` weight-semibold + desc "to start auditing pages" `var($text-sm)` color-subtle + button "Open settings" full-width primary

- [ ] **Step 4: Add "Idle" frame to extension-popup.pen**

Second frame "2. Idle" at (450, 50), 360x520:
- Header: title + Badge "TEST" (info bg, info color, radius-pill)
- Field group: label "Target keyword" + input "e.g. seo 2026"
- Primary button "Audit page" full-width disabled
- Footer right: ghost button "Manage key"

- [ ] **Step 5: Add "Loading" frame to extension-popup.pen**

Third frame "3. Loading" at (850, 50), 360x520:
- Same header + Badge
- Same form, input disabled, button label "Auditing…" with spinner glyph
- Below: skeleton ring (96x96 circle with light bg-overlay fill)
- Below: 2 skeleton issue rectangles (full-width, 64px tall, bg-overlay)

- [ ] **Step 6: Add "Result" frame to extension-popup.pen**

Fourth frame "4. Result" at (50, 600), 360x800:
- Same header + Badge "TEST"
- Same form
- Divider line
- Score section centered: ring 96x96 (stroke fair-amber `var($color-class-fair)`, value "68"), label "SEO SCORE" `var($text-xs)` color-subtle
- Stats row: "5 issues · 19 words · cached"
- Banner row: bg `var($color-info)` 0.1 alpha, text "✨ AI suggestions"
- 3 issue cards (with full content):
  - Card 1: error severity, "Title tag too short", desc "Current 12 chars. Aim 50-60.", suggestion box "✏️ Rewrite — 'SEO Trends 2026: Complete Guide'"
  - Card 2: warning severity, "Meta description missing", desc "Add 120-160 char summary."
  - Card 3: info severity, "H1 OK", desc "Single H1 contains keyword."
- Footer: "19 reqs left / min · 499 / day" color-subtle

- [ ] **Step 7: Snapshot popup mockup**

Call `mcp__pencil__snapshot_layout` on the popup document to verify layout looks right. If misaligned, fix with `mcp__pencil__batch_design` adjustments.

Optional: `mcp__pencil__export_nodes` to PNG → `/tmp/popup-mockup.png` for visual review. Open in QuickLook or Preview.

- [ ] **Step 8: Create `extension-options.pen` — 4 frames**

Repeat the workflow for `design/page/extension-options.pen`. Frames:

**Frame 1 "Empty" (50, 50, 460x320):**
- Header "SEO Analyst — Settings" `var($text-xl)` weight-semibold
- Card section (bg-elevated, border, radius-lg, padding-4):
  - Label "API KEY"
  - Input placeholder "Paste your sk_(live|test)_..."
  - Hint "Get one at seoanalyst.app/settings/api-keys" color-subtle text-xs
  - Button "Save" full-width disabled

**Frame 2 "Typing (valid)" (550, 50, 460x320):**
- Same header
- Card:
  - Label
  - Input filled "sk_test_6oxNiL0fw_..."
  - Green "✓ Valid test environment"
  - Hint
  - Button "Save" enabled primary

**Frame 3 "Saved" (50, 400, 460x280):**
- Same header
- Card:
  - Header row: label "API KEY" + Badge "TEST"
  - Read-only input "sk_test_••••••6oxN"
  - Button "Remove" secondary (color-error text)

**Frame 4 "Error" (550, 400, 460x320):**
- Same header
- Card:
  - Label
  - Input "sk_test_bad" with red border
  - Error text "⚠️ Key must match sk_(live|test)_ followed by 43 chars" color-error
  - Hint
  - Button "Save" disabled

- [ ] **Step 9: Verify both files**

```bash
ls -la design/page/extension-popup.pen design/page/extension-options.pen
```

Expected: both exist, non-zero size.

- [ ] **Step 10: Commit**

```bash
git add design/page/extension-popup.pen design/page/extension-options.pen
git commit -m "$(cat <<'EOF'
design(ext): Pencil mockups — popup + options 4 states each

design/page/extension-popup.pen — 4 frames:
1. Empty (no API key) — icon + CTA
2. Idle (key saved) — form ready
3. Loading — skeleton ring + skeleton issue cards
4. Result — ScoreRing 96px hero + AI banner + 3 issue cards (error/warning/info severities)

design/page/extension-options.pen — 4 frames:
1. Empty — form with disabled Save
2. Typing (valid) — green env preview + Save enabled
3. Saved — masked key + env Badge + Remove button
4. Error — invalid format → red border + error text

Both use variables from design/system-tokens.pen ($color-*, $radius-*,
$space-*, $text-*) so a single source of truth flows through to
extension CSS at apps/extension/lib/theme/tokens.css.
EOF
)"
```

---

## Task 7: Update `apps/extension/CLAUDE.md`

**Files:**
- Modify: `apps/extension/CLAUDE.md`

**Commit:** `docs(ext): update CLAUDE.md — components, theme, tokens sync policy`

- [ ] **Step 1: Add components + theme section to CLAUDE.md**

Edit `apps/extension/CLAUDE.md`. After the `## Structure` block, find the file tree and update it to include the new directories. Locate:

```
├── lib/
│   ├── storage.ts           # chrome.storage.local helpers + key regex
│   ├── types.ts             # Extension-local types
│   └── client.ts            # (Phase 2) Bearer fetch wrapper
```

Replace with:

```
├── lib/
│   ├── storage.ts           # chrome.storage.local helpers + key regex
│   ├── types.ts             # Extension-local types
│   ├── client.ts            # Bearer fetch wrapper
│   ├── cache.ts             # 1h URL-mode result cache (Phase 3)
│   ├── scraper.ts           # content-script DOM extract
│   ├── api-base.ts          # WXT_API_BASE_URL resolver
│   ├── api-types.ts         # PublicCheckResponse types (mirror of gateway)
│   ├── errors.ts            # 15-code error dispatch + PublicApiError class
│   └── theme/               # design tokens (copied from apps/web)
│       ├── tokens.css       # var(--color-*, --space-*, ...) — source of truth
│       ├── tokens.ts        # subset re-exported as JS const (for SVG inline)
│       └── classify.ts      # score: number → 'excellent' | 'good' | 'fair' | 'poor'
├── components/              # mini component library (5 SFCs)
│   ├── Button.tsx           # primary | secondary | ghost + sm | md + loading
│   ├── Input.tsx            # label + input + error
│   ├── Badge.tsx            # env | cached | severity | meta + tone
│   ├── ScoreRing.tsx        # SVG donut lg (96px) | sm (42px)
│   ├── IssueCard.tsx        # issue + suggestion + docRef
│   └── index.ts             # barrel
```

- [ ] **Step 2: Add tokens sync policy section**

In `apps/extension/CLAUDE.md`, after the `## Build pipeline — npm override` section, add a new section:

```markdown
## Design tokens — sync policy

`lib/theme/tokens.css` is a **manual copy** of `apps/web/src/styles/tokens.css`, which is itself generated by `apps/web/.planning/phase-5/export-tokens.py` from `design/system-tokens.pen` (Pencil).

When the design system updates (someone changes tokens in Pencil and re-exports), the extension needs a fresh copy:

```bash
git show origin/main:apps/web/src/styles/tokens.css > apps/extension/lib/theme/tokens.css
# After this, also re-append the extension-specific component styles
# (the .btn / .field / .badge / .score-ring / .issue / .popup / .opt /
# .skeleton sections starting at the "Extension component primitives"
# header). These live in the same file by design — single stylesheet
# loaded by popup/options index.html.
```

For TypeScript-side constants (`tokens.ts`), update by hand if `--color-class-*` values change in the upstream. Today only 4 class colors are mirrored — the rest are consumed via CSS `var()`.

## Component library

5 primitives in `components/`, built around design tokens:

| Component | Pure helper exported | Test coverage |
|---|---|---|
| `Button` | `buttonClassName({ variant, size, loading })` | variant + size + loading combos |
| `Input` | (none) | not tested — trusts React render |
| `Badge` | `badgeClassName(variant, tone)` | env / cached / severity tone |
| `ScoreRing` | `computeArc(score, radius)` | clamp + arc math at 0/50/100/-10/150 |
| `IssueCard` | (none — composes Badge) | not tested — visual review only |

Tests run in vitest **node env** — no jsdom, no testing-library. That's intentional: pure helpers are easier to reason about + match the existing test style for storage/cache/client.
```

- [ ] **Step 3: Update the phase status table**

Find the `## Phases` block. Update the status of Phase 4-5 to reflect that the **redesign sub-track** is done (separate from Phase 4's side panel + i18n).

Locate:

```
| 4 | LARGE | pending | Side panel + i18n (vi/en) + history + audience filter |
| 5 | SMALL | pending | Publish prep — icons, screenshots, store listing, privacy policy, submit |
```

Add a row above for the redesign:

```
| 3.5 | MEDIUM | **done** | Visual redesign — design tokens + 5 components + score hero + bug fixes (see `docs/superpowers/specs/2026-05-15-chrome-ext-redesign-design.md`) |
| 4 | LARGE | pending | Side panel + i18n (vi/en) + history + audience filter |
| 5 | SMALL | pending | Publish prep — icons, screenshots, store listing, privacy policy, submit |
```

- [ ] **Step 4: Verify file renders cleanly**

```bash
head -80 apps/extension/CLAUDE.md
```

Verify no markdown formatting errors (broken tables, unclosed code fences).

- [ ] **Step 5: Run pre-commit check**

```bash
cd apps/extension && npm run check-types && npm run test 2>&1 | tail -5
```

Expected: clean, 99 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/extension/CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(ext): update CLAUDE.md — components, theme, tokens sync policy

- Expand structure tree: lib/theme/, components/ with all 5 SFCs
- Add "Design tokens — sync policy" section explaining the manual copy
  from apps/web/src/styles/tokens.css and how to re-sync after upstream
  design system changes
- Add "Component library" section with the pure-helper test coverage table
- Phase status: 3.5 marked done, linking to the redesign spec

Closes the documentation gap from the redesign — anyone landing on the
extension now knows where tokens live and how to keep them in sync.
EOF
)"
```

---

## Final verification

After Task 7 commits, run the full Definition of Done check:

- [ ] **All tests pass**

```bash
cd apps/extension && npm run test 2>&1 | tail -5
```

Expected: `Tests 99 passed (99)` (74 existing + 10 theme + 15 components).

- [ ] **Type check clean**

```bash
cd apps/extension && npm run check-types
```

Expected: no output.

- [ ] **Build under budget**

```bash
cd apps/extension && npx wxt build && du -sk .output/chrome-mv3/
```

Expected: < 250 KB total.

- [ ] **Manual checklist from spec § 9.3**

Reload extension. Run:
1. Empty state click "Open settings" → options opens (★ Bug 1 fixed)
2. Visual match to Pencil mockups (compare popup screenshot with `design/page/extension-popup.pen` frames)
3. Score ring color: audit page with low SEO → ring red. Mid → amber. High → green.
4. AI banner: with `ANTHROPIC_API_KEY` set in gateway `.env` and gateway restarted, banner "✨ AI suggestions" visible. Without key, no banner OR "Template fallback" if `enrichMode='llm'` requested.
5. Dark mode: toggle OS color scheme → popup tokens flip automatically (or document quirk if Chrome popup doesn't respect `prefers-color-scheme`).

- [ ] **Commit graph review**

```bash
git log --oneline feat/chrome-ext-v2 -10
```

Expected: 7 new commits since `424b6ed` (spec), all atomic and conventionally named (chore/feat/fix/feat/feat/design/docs).

- [ ] **Push to origin** (only if user explicitly asks)

```bash
git push origin feat/chrome-ext-v2
```

---

## Out of scope (do NOT do in this plan)

- Anything in the spec's § 13 backlog (Phase 4+): side panel, i18n, history, audience filter, multi-provider LLM, per-issue suggestion source, animation polish, web store publish.
- Touching `lib/cache.ts`, `lib/client.ts`, `lib/scraper.ts`, `lib/storage.ts`, `lib/errors.ts`, `lib/api-base.ts`, `lib/api-types.ts`, `lib/types.ts`, `entrypoints/background.ts` (beyond keeping the OPEN_OPTIONS handler as fallback), `entrypoints/content.ts` — these stay untouched.
- Re-rebuilding `apps/web/src/styles/tokens.css` from `design/system-tokens.pen` — extension just copies the already-compiled file.
- Adding jsdom or @testing-library/react — keep tests in node env, test pure helpers only.

---

## If something goes wrong

- **`tokens.css` not in build output**: WXT may not copy non-import-referenced CSS. Move to `apps/extension/public/tokens.css` and change `<link href="/lib/theme/tokens.css">` → `<link href="/tokens.css">`. Update sync policy in CLAUDE.md.
- **TypeScript strict errors in component code**: We use React 19 types from `@types/react@^19`. If JSX flags fail, check `apps/extension/tsconfig.json` extends `@repo/typescript-config/base.json` and has `"jsx": "react-jsx"`.
- **Pencil MCP refuses to write**: Re-open the document (`mcp__pencil__open_document`) before each `batch_design` call. If still failing, check `mcp__pencil__get_editor_state`.
- **Bundle > 250 KB**: Check tokens.css — strip unused tokens (extension never uses `--text-5xl` or `--space-16`). Or split tokens.css into `tokens.css` (vars) + `components.css` (selectors), lazy-load.
- **Existing 74 tests fail after Task 1-2**: The components folder must not import from `entrypoints/`. If circular imports appear, move the offending type/helper to `lib/`.
