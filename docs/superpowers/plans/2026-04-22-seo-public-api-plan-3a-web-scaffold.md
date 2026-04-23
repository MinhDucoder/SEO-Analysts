# SEO Public API — Plan 3a: apps/web Scaffold + Auth UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap `apps/web/` as a Next.js 14 App Router application with Tailwind 3, shadcn/ui primitives, TanStack Query, a JWT-aware fetch client, and working register/login/logout pages wired to the existing gateway `/api/v1/auth/*` contract — ending with a Playwright smoke that registers → logs in → hits the authed dashboard.

**Architecture:** `apps/web/` is a standalone Next.js consumer of the gateway REST API on `:3000`. It runs on `:3001` (gateway's CORS allowlist default). The access token lives in `localStorage` (framework code in the browser), the refresh token is an HTTP-only cookie owned by the gateway under `/api/v1/auth`. A `fetch`-based client wraps every call with `Authorization: Bearer <token>` injection and silent refresh on `401`. TanStack Query owns server-state caching. shadcn/ui gives the primitive component set (button/input/card/dialog/tabs/toast) layered on Tailwind 3.

**Tech Stack:** Next.js 14.2+, React 19, TypeScript strict, Tailwind CSS 3.4, shadcn/ui (Tailwind 3 variant), `@tanstack/react-query` v5, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner` (toast), Playwright.

**Spec:** `docs/superpowers/specs/2026-04-22-seo-public-api-design.md` — section "Playground + Developer Experience" / `/settings/api-keys`

**Predecessor:** tag `public-api-plan-2-done` on `feat/seo-public-api`.

**Successor plans:**
- `2026-04-22-seo-public-api-plan-3b-public-api-ui.md` — `/playground` + `/settings/api-keys`
- `2026-04-22-seo-public-api-plan-3c-cli-docs.md` — `packages/seo-check-cli/` + `docs/public-api/`

**Scope out of this plan:**
- Playground page (3b)
- API keys management UI (3b)
- CLI (3c)
- Narrative docs (3c)
- Landing-page polish (stub only: heading + two CTAs)
- OAuth Google flow wiring on the web side (gateway endpoint exists; web button is a stretch goal — if not in this plan, a `<Link>` stub to `/api/v1/auth/google` suffices)

At the end of Plan 3a the following is true: `npm run dev -w @seo/web` starts the app on `:3001`; users can register a new account via `/register`, log in via `/login`, land on `/dashboard`, and log out; refresh-on-401 works automatically; the Playwright spec `tests/auth.spec.ts` passes against a running gateway.

---

## File Structure

### New files

```
apps/web/
├── package.json                                CREATE
├── next.config.mjs                             CREATE
├── tsconfig.json                               CREATE (extends @repo/typescript-config/nextjs.json)
├── tailwind.config.ts                          CREATE
├── postcss.config.mjs                          CREATE
├── components.json                             CREATE (shadcn config — pinned, not on-demand)
├── eslint.config.mjs                           CREATE (use @repo/eslint-config/base)
├── .gitignore                                  CREATE
├── .env.local.example                          CREATE (NEXT_PUBLIC_API_BASE=…)
├── next-env.d.ts                               CREATE (generated stub; add to git)
├── playwright.config.ts                        CREATE
├── src/
│   ├── app/
│   │   ├── layout.tsx                          CREATE (root, html/body, providers)
│   │   ├── providers.tsx                       CREATE (QueryClientProvider, <Toaster/>)
│   │   ├── globals.css                         CREATE (Tailwind directives + shadcn tokens)
│   │   ├── page.tsx                            CREATE (landing: title + 2 CTAs)
│   │   ├── error.tsx                           CREATE (global error boundary)
│   │   ├── not-found.tsx                       CREATE
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                      CREATE (redirects authed users to /dashboard)
│   │   │   ├── login/page.tsx                  CREATE
│   │   │   └── register/page.tsx               CREATE
│   │   └── (app)/
│   │       ├── layout.tsx                      CREATE (authed layout — top nav + guard)
│   │       └── dashboard/page.tsx              CREATE (welcome + links to /playground, /settings/api-keys)
│   ├── components/
│   │   └── ui/                                 CREATE (shadcn primitives — 7 files below)
│   │       ├── button.tsx                      CREATE
│   │       ├── input.tsx                       CREATE
│   │       ├── label.tsx                       CREATE
│   │       ├── card.tsx                        CREATE
│   │       ├── form.tsx                        CREATE (uses react-hook-form + zod via @hookform/resolvers)
│   │       ├── dialog.tsx                      CREATE
│   │       ├── toast.tsx                       CREATE (sonner re-export)
│   ├── lib/
│   │   ├── utils.ts                            CREATE (cn helper)
│   │   ├── api.ts                              CREATE (fetch wrapper + refresh-on-401)
│   │   ├── auth.tsx                            CREATE (AuthProvider + useAuth)
│   │   ├── query-client.ts                     CREATE
│   │   └── env.ts                              CREATE (runtime NEXT_PUBLIC_API_BASE + validation)
│   └── types/
│       ├── auth.ts                             CREATE (LoginResponse, User, RegisterInput)
│       └── api.ts                              CREATE (placeholder; 3b extends with PublicCheckResponse)
└── tests/
    ├── helpers/
    │   └── unique-user.ts                      CREATE
    └── auth.spec.ts                            CREATE (Playwright end-to-end)

apps/web/test/
├── lib.api.spec.ts                             CREATE (unit: fetch wrapper refresh logic)
└── lib.auth.spec.tsx                           CREATE (unit: AuthProvider state transitions)
```

### Modified files

```
package.json                                    MODIFY (add Playwright to devDependencies at root? NO — keep it in apps/web only)
apps/CLAUDE.md                                  MODIFY (add apps/web row to service table — "pending" becomes "scaffolded")
```

### Dependency direction

```
apps/web  ──HTTP──▶  apps/gateway  (/api/v1/auth/*, /users/me/api-keys, later /public/check)
apps/web  imports:   @repo/eslint-config, @repo/typescript-config
apps/web  does NOT import: @repo/shared, @repo/proto, @repo/seo-ai-core
```

Rationale: keeping the web consumer decoupled from backend packages means its build is independent — a change to analyzer proto shouldn't trigger a web re-build. Types for request/response are **mirrored** in `src/types/*.ts` from the backend DTOs; the gateway stays the source of truth but the duplication is deliberate and auditable.

---

## Conventions used in this plan

- All file paths are absolute to repo root.
- TDD order per task when applicable: (1) write failing test; (2) run & see fail; (3) implement; (4) run & see pass; (5) commit. Scaffold tasks that produce a `package.json` or config file don't have a failing test — they have a smoke verification (`npm run build`, `npm run dev` health check).
- Commit types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`. Scope: `web` for `apps/web/` changes.
- **Never** add `Co-Authored-By: Claude` / `🤖 Generated with Claude Code` trailers (see `.claude/CLAUDE.md` line 31).
- **Never** use `git commit --no-verify`.
- Pre-commit hook runs `turbo run lint check-types` — the new `apps/web` package must pass both from its first commit.
- Web dev server port: **3001** (gateway owns 3000; gateway CORS allowlist defaults to `http://localhost:3001`).
- shadcn/ui: pin components in-tree (checked into git), do NOT depend on `npx shadcn add` at dev time. This keeps fresh clones deterministic.
- Do NOT touch `apps/gateway/**`, `apps/crawler/**`, `apps/seo-analyzer/**`, `apps/keyword-analyzer/**`, `apps/report/**`, `packages/proto/**`, `packages/shared/**`, `packages/seo-ai-core/**`. Any backend change = scope creep; escalate before modifying.

---

# Phase W — Workspace scaffold

## Task W1: Create `apps/web/package.json` + root config files

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/.gitignore`
- Create: `apps/web/next-env.d.ts`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/eslint.config.mjs`

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@seo/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint --dir src",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "playwright": "playwright test",
    "playwright:install": "playwright install --with-deps"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@tanstack/react-query": "^5.62.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "14.2.20",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.0",
    "sonner": "^1.7.0",
    "tailwind-merge": "^2.5.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@repo/eslint-config": "*",
    "@repo/typescript-config": "*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.39.1",
    "eslint-config-next": "14.2.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.5.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.9.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `apps/web/.gitignore`**

```
.next
node_modules
.turbo
coverage
out
playwright-report
test-results
*.tsbuildinfo
.env.local
```

- [ ] **Step 3: Write `apps/web/next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
```

- [ ] **Step 4: Write `apps/web/next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  experimental: {
    // react 19 compat
  },
};

export default nextConfig;
```

- [ ] **Step 5: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node", "@testing-library/jest-dom"]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "dist", "playwright-report", "test-results"]
}
```

- [ ] **Step 6: Write `apps/web/postcss.config.mjs`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

- [ ] **Step 8: Write `apps/web/eslint.config.mjs`**

```javascript
import { config as base } from '@repo/eslint-config/base';

export default [
  ...base,
  {
    ignores: ['.next/**', 'node_modules/**', '.turbo/**', 'playwright-report/**', 'test-results/**'],
  },
];
```

- [ ] **Step 9: Write `apps/web/.env.local.example`**

```
# Gateway REST base. Must match gateway's CORS FRONTEND_URL.
NEXT_PUBLIC_API_BASE=http://localhost:3000/api/v1
```

- [ ] **Step 10: Install**

Run: `npm install` (from repo root)
Expected: new packages added; `apps/web/node_modules/.bin/next` exists (or hoisted to root).

- [ ] **Step 11: Commit**

```bash
git add apps/web/package.json apps/web/.gitignore apps/web/next-env.d.ts apps/web/next.config.mjs apps/web/tsconfig.json apps/web/postcss.config.mjs apps/web/tailwind.config.ts apps/web/eslint.config.mjs apps/web/.env.local.example package-lock.json
git commit -m "chore(web): scaffold apps/web (Next.js 14 + Tailwind 3 + TanStack Query deps)"
```

---

## Task W2: Tailwind base styles + shadcn CSS variables

**Files:**
- Create: `apps/web/src/app/globals.css`

- [ ] **Step 1: Write `apps/web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): Tailwind base + shadcn color tokens"
```

---

## Task W3: shadcn config + cn utility

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`

- [ ] **Step 1: Write `apps/web/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Write `apps/web/src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components.json apps/web/src/lib/utils.ts
git commit -m "feat(web): shadcn config + cn helper"
```

---

## Task W4: shadcn/ui primitives — Button, Input, Label, Card

**Files:**
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/label.tsx`
- Create: `apps/web/src/components/ui/card.tsx`

- [ ] **Step 1: Write `apps/web/src/components/ui/button.tsx`**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 2: Write `apps/web/src/components/ui/input.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

- [ ] **Step 3: Write `apps/web/src/components/ui/label.tsx`**

```tsx
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;
```

- [ ] **Step 4: Write `apps/web/src/components/ui/card.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/button.tsx apps/web/src/components/ui/input.tsx apps/web/src/components/ui/label.tsx apps/web/src/components/ui/card.tsx
git commit -m "feat(web): shadcn Button + Input + Label + Card primitives"
```

---

## Task W5: shadcn/ui primitives — Dialog, Form, Toast

**Files:**
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/components/ui/form.tsx`
- Create: `apps/web/src/components/ui/toast.tsx`

- [ ] **Step 1: Write `apps/web/src/components/ui/dialog.tsx`**

```tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
```

- [ ] **Step 2: Write `apps/web/src/components/ui/form.tsx`** — (simplified — uses `react-hook-form` directly, keeps surface to `<Form>`, `<FormField>`, `<FormLabel>`, `<FormMessage>` to avoid verbose shadcn variant)

```tsx
'use client';

import * as React from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { Label } from './label';
import { cn } from '@/lib/utils';

export const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: ControllerProps<TFieldValues, TName>,
): React.ReactElement => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

export function useFormField() {
  const ctx = React.useContext(FormFieldContext);
  const { formState, getFieldState } = useFormContext();
  if (!ctx) throw new Error('useFormField must be used within a <FormField>');
  const fieldState = getFieldState(ctx.name, formState);
  return { name: ctx.name, ...fieldState };
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  ),
);
FormItem.displayName = 'FormItem';

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error } = useFormField();
  return <Label ref={ref} className={cn(error && 'text-destructive', className)} {...props} />;
});
FormLabel.displayName = 'FormLabel';

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error } = useFormField();
  const body = error ? String(error.message) : children;
  if (!body) return null;
  return (
    <p ref={ref} className={cn('text-sm font-medium text-destructive', className)} {...props}>
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';
```

- [ ] **Step 3: Write `apps/web/src/components/ui/toast.tsx`** — wraps `sonner`

```tsx
'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return <SonnerToaster position="top-right" richColors closeButton />;
}

export { toast };
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/form.tsx apps/web/src/components/ui/toast.tsx
git commit -m "feat(web): shadcn Dialog + Form + Toast primitives"
```

---

# Phase X — Query client + API wrapper + Auth context

## Task X1: Environment helper + TanStack Query client

**Files:**
- Create: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/lib/query-client.ts`

- [ ] **Step 1: Write `apps/web/src/lib/env.ts`**

```typescript
/**
 * @file Runtime environment accessor for the web app. `process.env`
 * in Next client code is statically baked at build time for
 * `NEXT_PUBLIC_*` vars; this helper fails fast when absent so we
 * never make a request with an empty base URL.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export const env = {
  apiBase: required('NEXT_PUBLIC_API_BASE', process.env.NEXT_PUBLIC_API_BASE),
};
```

- [ ] **Step 2: Write `apps/web/src/lib/query-client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: { retry: 0 },
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/env.ts apps/web/src/lib/query-client.ts
git commit -m "feat(web): env helper + TanStack Query client factory"
```

---

## Task X2: Auth types

**Files:**
- Create: `apps/web/src/types/auth.ts`

- [ ] **Step 1: Write `apps/web/src/types/auth.ts`**

```typescript
/**
 * @file Mirrored auth types — source of truth is `apps/gateway/src/auth/`.
 * Keep these shapes in sync when the backend changes.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/types/auth.ts
git commit -m "feat(web): auth type mirrors (User, LoginResponse, RegisterInput)"
```

---

## Task X3: Fetch wrapper with refresh-on-401

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/test/lib.api.spec.ts`

- [ ] **Step 1: Write failing test `apps/web/test/lib.api.spec.ts`**

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient, ApiError } from '../src/lib/api';

describe('ApiClient', () => {
  const tokens = {
    get: vi.fn<[], string | null>(),
    set: vi.fn<[string | null], void>(),
  };

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tokens.get.mockReset();
    tokens.set.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeClient() {
    return new ApiClient('http://api.test/v1', tokens);
  }

  it('GET: passes Authorization header when token present', async () => {
    tokens.get.mockReturnValue('jwt-1');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const r = await makeClient().get<{ ok: boolean }>('/ping');
    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-1');
    expect(init.credentials).toBe('include');
  });

  it('POST: sends JSON body + content-type header', async () => {
    tokens.get.mockReturnValue(null);
    fetchMock.mockResolvedValue(new Response('', { status: 204 }));
    await makeClient().post<void>('/auth/logout', { foo: 'bar' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ foo: 'bar' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('401: calls /auth/refresh, retries original with new token on success', async () => {
    tokens.get.mockReturnValueOnce('stale').mockReturnValueOnce('fresh');
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'fresh' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const r = await makeClient().get<{ ok: boolean }>('/me');
    expect(r).toEqual({ ok: true });
    expect(tokens.set).toHaveBeenCalledWith('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh');
  });

  it('401 then refresh fails: throws ApiError(401), clears token', async () => {
    tokens.get.mockReturnValue('stale');
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(makeClient().get('/me')).rejects.toThrow(ApiError);
    expect(tokens.set).toHaveBeenCalledWith(null);
  });

  it('non-2xx: throws ApiError with parsed body', async () => {
    tokens.get.mockReturnValue(null);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID', message: 'bad' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    );
    let caught: unknown;
    try {
      await makeClient().post('/auth/login', {});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(422);
    expect((caught as ApiError).code).toBe('INVALID');
  });
});
```

- [ ] **Step 2: Write minimal vitest config for web**

File `apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.spec.ts', 'test/**/*.spec.tsx'],
    alias: { '@': resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 3: Run test — fails (module missing)**

Run: `npm test --workspace=@seo/web -- lib.api`
Expected: FAIL — `Cannot find module '../src/lib/api'`.

- [ ] **Step 4: Implement `apps/web/src/lib/api.ts`**

```typescript
/**
 * @file HTTP client for the gateway REST API. Injects Bearer JWT,
 * attempts one silent refresh on 401, and throws ApiError with a
 * structured `{code, message, details}` shape for non-2xx responses.
 *
 * Refresh is cookie-based — we send `credentials: 'include'` so the
 * gateway's HTTP-only `refresh_token` cookie (path=/api/v1/auth) is
 * attached to `/auth/refresh`.
 */

export interface TokenStore {
  get(): string | null;
  set(token: string | null): void;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiClient {
  private refreshing: Promise<string | null> | null = null;

  constructor(private readonly baseUrl: string, private readonly tokens: TokenStore) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = this.tokens.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
      const fresh = await this.attemptRefresh();
      if (fresh) return this.request<T>(method, path, body, true);
    }

    if (!res.ok) {
      const payload = await this.safeJson(res);
      throw new ApiError(
        (payload as { message?: string })?.message ?? `HTTP ${res.status}`,
        res.status,
        (payload as { code?: string })?.code,
        payload,
      );
    }

    if (res.status === 204) return undefined as T;
    const ctype = res.headers.get('content-type') ?? '';
    if (!ctype.includes('application/json')) return undefined as T;
    return (await res.json()) as T;
  }

  private async attemptRefresh(): Promise<string | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          this.tokens.set(null);
          return null;
        }
        const body = (await res.json()) as { accessToken: string };
        this.tokens.set(body.accessToken);
        return body.accessToken;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  private async safeJson(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
}

const ACCESS_TOKEN_KEY = 'seo-web-access-token';

export function browserTokenStore(): TokenStore {
  return {
    get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY)),
    set: (t) => {
      if (typeof window === 'undefined') return;
      if (t) window.localStorage.setItem(ACCESS_TOKEN_KEY, t);
      else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    },
  };
}
```

- [ ] **Step 5: Run tests — pass**

Run: `npm test --workspace=@seo/web -- lib.api`
Expected: PASS 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/test/lib.api.spec.ts apps/web/vitest.config.ts
git commit -m "feat(web): ApiClient with Bearer JWT + silent refresh-on-401"
```

---

## Task X4: Auth context + useAuth hook

**Files:**
- Create: `apps/web/src/lib/auth.tsx`
- Create: `apps/web/test/lib.auth.spec.tsx`

- [ ] **Step 1: Write failing test `apps/web/test/lib.auth.spec.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { ApiClient } from '../src/lib/api';

function Consumer() {
  const { user, status, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login({ email: 'a@b.c', password: 'p' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function wrap(client: ApiClient) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider client={client}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthProvider', () => {
  let client: {
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    client = { post: vi.fn(), get: vi.fn() };
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('initial status=unauthenticated when no stored token', async () => {
    render(<Consumer />, { wrapper: wrap(client as never) });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('login: calls POST /auth/login, stores token, sets user, status=authenticated', async () => {
    client.post.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', fullName: 'A', role: 'user', emailVerified: true },
      accessToken: 'jwt-1',
    });
    render(<Consumer />, { wrapper: wrap(client as never) });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('a@b.c');
    expect(client.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'p' });
  });

  it('logout: calls POST /auth/logout, clears state', async () => {
    client.post.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', fullName: 'A', role: 'user', emailVerified: true },
      accessToken: 'jwt-1',
    });
    render(<Consumer />, { wrapper: wrap(client as never) });
    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    client.post.mockResolvedValueOnce({ message: 'ok' });
    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npm test --workspace=@seo/web -- lib.auth`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `apps/web/src/lib/auth.tsx`**

```tsx
'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient, browserTokenStore } from './api';
import { env } from './env';
import type { LoginInput, LoginResponse, RegisterInput, User } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  client: ApiClient;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client?: ApiClient;
}) {
  const [tokens] = React.useState(() => browserTokenStore());
  const api = React.useMemo(() => client ?? new ApiClient(env.apiBase, tokens), [client, tokens]);
  const qc = useQueryClient();

  const meQuery = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (!tokens.get()) return null;
      try {
        const u = await api.get<User>('/auth/me');
        return u;
      } catch {
        tokens.set(null);
        return null;
      }
    },
    staleTime: Infinity,
  });

  const loginMut = useMutation({
    mutationFn: (input: LoginInput) => api.post<LoginResponse>('/auth/login', input),
    onSuccess: (res) => {
      tokens.set(res.accessToken);
      qc.setQueryData(['auth', 'me'], res.user);
    },
  });

  const registerMut = useMutation({
    mutationFn: (input: RegisterInput) => api.post<{ user: User; accessToken: string }>('/auth/register', input),
    onSuccess: (res) => {
      tokens.set(res.accessToken);
      qc.setQueryData(['auth', 'me'], res.user);
    },
  });

  const logoutMut = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/logout', {}),
    onSettled: () => {
      tokens.set(null);
      qc.setQueryData(['auth', 'me'], null);
      qc.clear();
    },
  });

  const status: AuthStatus = meQuery.isFetching
    ? 'loading'
    : meQuery.data
      ? 'authenticated'
      : 'unauthenticated';

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    status,
    login: async (input) => {
      await loginMut.mutateAsync(input);
    },
    register: async (input) => {
      await registerMut.mutateAsync(input);
    },
    logout: async () => {
      await logoutMut.mutateAsync();
    },
    client: api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 4: Run — pass**

Run: `npm test --workspace=@seo/web -- lib.auth`
Expected: PASS 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth.tsx apps/web/test/lib.auth.spec.tsx
git commit -m "feat(web): AuthProvider + useAuth hook (login/register/logout + /auth/me)"
```

---

# Phase Y — Pages + layouts

## Task Y1: Root layout + providers

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/providers.tsx`
- Create: `apps/web/src/types/api.ts`

- [ ] **Step 1: Write `apps/web/src/types/api.ts` (placeholder for 3b)**

```typescript
// Extended in Plan 3b with PublicCheckResponse, ApiKeyDto, etc.
// Kept as a standalone file so import paths don't move.
export {};
```

- [ ] **Step 2: Write `apps/web/src/app/providers.tsx`**

```tsx
'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Write `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SEO Analyst',
  description: 'Public SEO content-check API and playground.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/app/providers.tsx apps/web/src/types/api.ts
git commit -m "feat(web): root layout + Providers (QueryClient, Auth, Toaster)"
```

---

## Task Y2: Landing page, error boundary, not-found

**Files:**
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/error.tsx`
- Create: `apps/web/src/app/not-found.tsx`

- [ ] **Step 1: Write `apps/web/src/app/page.tsx`**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">SEO Analyst — Public API</h1>
        <p className="text-lg text-muted-foreground">
          Phân tích SEO cho URL, markdown, hoặc HTML qua một HTTP endpoint duy nhất. Dùng thử
          playground hoặc lấy API key để tự động hoá.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/playground">Open Playground →</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Get an API key →</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/app/error.tsx`**

```tsx
'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="container mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </main>
  );
}
```

- [ ] **Step 3: Write `apps/web/src/app/not-found.tsx`**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 py-16">
      <h1 className="text-2xl font-semibold">404 — Page not found</h1>
      <Button asChild variant="outline">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/error.tsx apps/web/src/app/not-found.tsx
git commit -m "feat(web): landing + error + not-found pages"
```

---

## Task Y3: Auth group layout + login page

**Files:**
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/(auth)/layout.tsx`**

```tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);
  return <div className="container mx-auto flex min-h-screen max-w-md items-center justify-center py-10">{children}</div>;
}
```

- [ ] **Step 2: Write `apps/web/src/app/(auth)/login/page.tsx`**

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values);
      toast.success('Đăng nhập thành công');
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Đăng nhập thất bại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Đăng nhập để quản lý API keys.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" autoComplete="email" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <Input type="password" autoComplete="current-password" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Đang đăng nhập…' : 'Log in'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="underline">
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(auth\)/layout.tsx apps/web/src/app/\(auth\)/login/page.tsx
git commit -m "feat(web): /login page (auth group layout + react-hook-form + zod)"
```

---

## Task Y4: Register page

**Files:**
- Create: `apps/web/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/(auth)/register/page.tsx`**

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  fullName: z.string().min(1, 'Required'),
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await register(values);
      toast.success('Tạo tài khoản thành công');
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Đăng ký thất bại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Đăng ký để lấy API keys và dùng playground.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <Input autoComplete="name" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" autoComplete="email" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <Input type="password" autoComplete="new-password" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Đang tạo tài khoản…' : 'Register'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link href="/login" className="underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(auth\)/register/page.tsx
git commit -m "feat(web): /register page"
```

---

## Task Y5: Authed layout + dashboard page

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/(app)/layout.tsx`**

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <main className="container mx-auto py-12 text-sm text-muted-foreground">Loading…</main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            SEO Analyst
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/playground" className="text-muted-foreground hover:text-foreground">
              Playground
            </Link>
            <Link href="/settings/api-keys" className="text-muted-foreground hover:text-foreground">
              API keys
            </Link>
            <span className="text-muted-foreground">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              Log out
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/app/(app)/dashboard/page.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Playground</CardTitle>
          <CardDescription>Phân tích URL / markdown / HTML ngay trong trình duyệt.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/playground" className="underline">Open playground →</Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Quản lý key để gọi API từ CI / CLI.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/api-keys" className="underline">Manage keys →</Link>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Build sanity**

Run: `npm run build --workspace=@seo/web`
Expected: build succeeds. If it fails on `/playground` or `/settings/api-keys` links (they don't exist yet), that's OK — those are `<Link>`s, Next doesn't validate destination at build time. If build actually fails, fix the root cause (don't force; raise the error in report).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/layout.tsx apps/web/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(web): authed layout + /dashboard page"
```

---

# Phase Z — Playwright end-to-end

## Task Z1: Playwright config + helper

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/helpers/unique-user.ts`

- [ ] **Step 1: Write `apps/web/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

const WEB_BASE = process.env.WEB_BASE ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: WEB_BASE,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_ASSUME_SERVERS
    ? undefined
    : {
        command: 'npm run dev',
        url: WEB_BASE,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1',
        },
      },
});
```

- [ ] **Step 2: Write `apps/web/tests/helpers/unique-user.ts`**

```typescript
export function uniqueUser() {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    fullName: `Smoke ${stamp}`,
    email: `smoke-${stamp}-${rand}@example.com`,
    password: 'Smoke12345!',
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/tests/helpers/unique-user.ts
git commit -m "test(web): Playwright config + unique-user helper"
```

---

## Task Z2: Register → login → logout Playwright spec

**Files:**
- Create: `apps/web/tests/auth.spec.ts`

- [ ] **Step 1: Write `apps/web/tests/auth.spec.ts`**

```typescript
import { expect, test } from '@playwright/test';
import { uniqueUser } from './helpers/unique-user';

test('register → lands on dashboard → logout returns to login', async ({ page }) => {
  const u = uniqueUser();

  await page.goto('/register');
  await page.getByLabel('Full name').fill(u.fullName);
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: /register/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText('Playground')).toBeVisible();
  await expect(page.getByText('API keys')).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('login with existing account lands on dashboard', async ({ page, request }) => {
  const u = uniqueUser();
  // Seed via direct API call (faster than UI register each run).
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';
  const resp = await request.post(`${apiBase}/auth/register`, {
    data: { email: u.email, password: u.password, fullName: u.fullName },
  });
  expect(resp.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText(u.email)).toBeVisible();
});
```

- [ ] **Step 2: Install Playwright browsers**

Run: `npm run playwright:install --workspace=@seo/web`
Expected: Chromium binary downloaded.

- [ ] **Step 3: Run spec against a live gateway (docker compose must be up)**

```bash
# If docker stack isn't running:
#   npm run docker:up
#   (wait ~30s for prisma migrate + seed)
npm run playwright --workspace=@seo/web
```
Expected: both tests pass. If gateway isn't reachable or CORS rejects, fix env (`NEXT_PUBLIC_API_BASE` + gateway `FRONTEND_URL=http://localhost:3001`) rather than tweak the test.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/auth.spec.ts
git commit -m "test(web): Playwright e2e — register/login/logout happy path"
```

---

## Task Z3: Update `apps/CLAUDE.md` with scaffolded status

**Files:**
- Modify: `apps/CLAUDE.md`

- [ ] **Step 1: Read current content at `apps/CLAUDE.md`**

Run: `grep -n "apps/web\|pending" apps/CLAUDE.md | head -5`

- [ ] **Step 2: Flip the web row from "pending" to scaffolded**

Edit `apps/CLAUDE.md` — in the "Services" or "Frontend" section, change any text like `**pending**` or `— pending` next to `apps/web` to reflect: `apps/web — scaffolded (Next.js 14 App Router + Tailwind 3 + shadcn/ui + TanStack Query; auth flow wired; playground + api-keys UI arrive in Plan 3b).`

If no such row exists, add one near existing service descriptions.

- [ ] **Step 3: Commit**

```bash
git add apps/CLAUDE.md
git commit -m "docs(web): apps/CLAUDE.md — web scaffolded in Plan 3a"
```

---

# Phase ZZ — Final verification

## Task ZZ1: Full regression

**Files:** (none — verification only)

- [ ] **Step 1: Turbo-wide lint + typecheck**

Run: `npm run check-types && npm run lint`
Expected: 0 errors (warnings from pre-existing `any` usages in other services are fine — the ceiling is "no new errors introduced by 3a").

- [ ] **Step 2: Web unit tests**

Run: `npm test --workspace=@seo/web`
Expected: PASS 8 tests (5 in `lib.api`, 3 in `lib.auth`).

- [ ] **Step 3: Root-level test pass**

Run: `npm test`
Expected: all packages green (seo-ai-core still 33, gateway still 112, web now with its own suite).

- [ ] **Step 4: Manual dev run**

```bash
npm run docker:up
# wait for gateway health
npm run dev --workspace=@seo/web
# open http://localhost:3001
```
Expected: landing renders with two CTAs; `/register` + `/login` + `/dashboard` work; `/playground` and `/settings/api-keys` are 404 (that's Plan 3b).

- [ ] **Step 5: Playwright against live stack**

```bash
npm run playwright --workspace=@seo/web
```
Expected: 2 green.

- [ ] **Step 6: Tag Plan 3a**

```bash
git tag public-api-plan-3a-done
```

- [ ] **Step 7: No push — user approves the push explicitly.**

---

## Self-review checklist

- [ ] `apps/web/package.json` declares Next 14.2+, React 19, Tailwind 3, TanStack Query v5, Playwright
- [ ] `tsconfig.json` extends `@repo/typescript-config/nextjs.json` + `@/*` alias resolves
- [ ] Tailwind config scopes `./src/**/*.{ts,tsx}`; globals.css has both light + dark tokens
- [ ] shadcn/ui primitives committed (no `npx shadcn add` at dev time): button, input, label, card, dialog, form, toast
- [ ] `ApiClient` injects `Authorization: Bearer`, sends `credentials: 'include'`, single-flight refresh
- [ ] Access token in `localStorage` under key `seo-web-access-token`; refresh stays cookie-only
- [ ] `AuthProvider` exposes `login`, `register`, `logout`, `user`, `status` via `useAuth`
- [ ] `/login` + `/register` use react-hook-form + zod; errors toasted via sonner
- [ ] `(auth)/layout.tsx` redirects authed users to `/dashboard`
- [ ] `(app)/layout.tsx` redirects unauthed users to `/login`; shows email + logout button
- [ ] Dev port is 3001 (not Next default 3000); gateway CORS expects this
- [ ] Playwright spec covers register→dashboard→logout and login→dashboard
- [ ] No Claude trailer in any commit message
- [ ] Pre-commit hook ran on every commit (never bypassed)

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-seo-public-api-plan-3a-web-scaffold.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

After Plan 3a is tagged `public-api-plan-3a-done`, proceed to Plan 3b (`2026-04-22-seo-public-api-plan-3b-public-api-ui.md`). Plan 3c can be done in parallel with 3b — it's independent (CLI + docs) and doesn't depend on web pages.
