# Plan 3 Handoff — DX Surfaces (Playground + API Keys UI + CLI + Docs)

**Purpose:** Bootstrap a fresh session to write `docs/superpowers/plans/2026-04-22-seo-public-api-plan-3-dx-surfaces.md` using `superpowers:writing-plans`. Plans 1 & 2 are shipped — backend API is production-ready. Plan 3 delivers the consumer-facing surfaces.

## Session bootstrap commands

```bash
# Read these in order to ground decisions:
cat docs/superpowers/specs/2026-04-22-seo-public-api-design.md                  # section "Playground + Developer Experience"
cat docs/superpowers/plans/2026-04-22-seo-public-api-plan-1-foundation-core.md  # Phase "File Structure" only (reference API surface)
cat docs/superpowers/plans/2026-04-22-seo-public-api-plan-2-llm-enrichment.md   # LLM behavior the playground will demo
cat apps/gateway/src/public-api/dto/public-check-request.dto.ts                 # request shape the UI sends
cat apps/gateway/src/public-api/services/public-check.service.ts                # response shape PublicCheckResponse
cat apps/gateway/src/public-api/controllers/api-keys.controller.ts              # /users/me/api-keys contract
```

## CRITICAL discovery — apps/web is empty

`apps/web/` is NOT scaffolded on `feat/seo-public-api`. Only `.turbo/` folder exists. `apps/web/src/app/` does NOT exist. Git tracks 0 files in this directory.

The Plan 1 preview and spec architecture diagram assumed apps/web was a working Next.js 14 app. **That assumption is wrong.** Plan 3 must include the Next.js scaffold before any page implementation — that is ~30% of the plan's work.

## Recommended scope split

Plan 3 as-written in the spec is too big for one plan. **Recommend the new session split it into 3 sub-plans** (each shippable independently), OR one large plan with 3 clearly separated phase groups:

| Sub-plan | Delivers | Rough task count |
|---|---|---|
| **Plan 3a — apps/web scaffold** | Next.js 14 App Router + Tailwind + shadcn/ui init + TanStack Query + auth flow (login/register using existing gateway `/auth/*`) + layout + globals | 10-12 |
| **Plan 3b — Public API UI surfaces** | `/playground` page (Monaco + 3 tabs + result viewer + Copy buttons + samples) + `/settings/api-keys` page (list/create-modal/revoke) + Playwright tests | 10-12 |
| **Plan 3c — CLI + narrative docs** | `packages/seo-check-cli` (workspace-local, commander + chalk, `--fail-on` + `--min-score` + `--format json`) + `docs/public-api/` (8 md files) | 6-8 |

Writer session decides: single monster plan (one file, 3 phase groups) vs three `-3a/-3b/-3c-` files. Either is defensible. Single file is simpler to execute sequentially; splitting allows shipping 3a independently while 3b is still being refined.

## What Plans 1 & 2 delivered (context for Plan 3)

**API contract the UI consumes** — all live under `/api/v1/`:

```
POST   /public/check                 → Bearer sk_live_... | sync, returns PublicCheckResponse
GET    /public/rules                 → Bearer sk_live_...
GET    /public/health                → public
GET    /public/docs                  → Swagger UI (sibling, not consumed by UI)
POST   /users/me/api-keys            → JWT, body { name, environment: "live"|"test" }
                                       returns { ...ApiKeyDto, plaintext: "sk_live_..." } (ONCE)
GET    /users/me/api-keys            → JWT, returns ApiKeyDto[]
DELETE /users/me/api-keys/:id        → JWT, 204
POST   /auth/register                → body { email, password, fullName }
POST   /auth/login                   → returns { accessToken, refreshToken }
POST   /auth/refresh                 → cookie-based
```

**Response shape of `/public/check`** (from `public-check.service.ts`):

```typescript
{
  score: number,
  scoreBreakdown: Record<string, number>,    // { content: 85, meta: 70, ... }
  issues: Array<{
    ruleId, severity, category, audience,
    title, description, evidence,
    suggestion: { type, text, rationale } | null,
    docRef
  }>,
  summary?: { writer, dev },
  meta: {
    inputType, resolvedUrl?, contentStats,
    processingTimeMs, ruleVersion,
    enrichMode, suggestionSource, degraded, cached,
    requestId, usage: { remaining, resetAt }
  }
}
```

**Request shape**:

```typescript
{
  input: { type: 'url', url: '...' } | { type: 'markdown', markdown: '...' } | { type: 'html', html: '...' },
  targetKeyword: string,
  secondaryKeywords?: string[],
  options?: {
    enrichMode?: 'off' | 'template' | 'llm',
    language?: 'vi' | 'en',
    includeSummary?: boolean,
    filter?: { categories?, audiences?, minSeverity? }
  }
}
```

## Expected sub-plan 3a — apps/web scaffold

**Files to create (all under apps/web/):**
```
apps/web/
├── package.json                    Next.js 14.x, React 19, TanStack Query v5, Tailwind 3, class-variance-authority
├── next.config.mjs
├── tsconfig.json                   extends @repo/typescript-config/nextjs.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                 (shadcn/ui config)
├── eslint.config.js
├── .env.local.example              NEXT_PUBLIC_API_BASE=http://localhost:3000/api/v1
├── src/
│   ├── app/
│   │   ├── layout.tsx              Root, providers
│   │   ├── providers.tsx           QueryClientProvider + theme
│   │   ├── globals.css
│   │   ├── page.tsx                Landing
│   │   ├── error.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx          Authed layout (nav, guard)
│   │       └── dashboard/page.tsx  Post-login placeholder
│   ├── components/
│   │   └── ui/                     (shadcn primitives: button, input, card, dialog, tabs, toast)
│   ├── lib/
│   │   ├── api.ts                  fetch wrapper, JWT in localStorage, refresh cookie
│   │   ├── auth.tsx                Auth context + useAuth hook
│   │   └── query-client.ts         TanStack Query config
│   └── types/
│       └── api.ts                  mirror of PublicCheckResponse + ApiKeyDto
├── playwright.config.ts
└── tests/
    └── auth.spec.ts                Register → login → logout happy path
```

**Gotchas:**
- shadcn/ui init is interactive by default — use `npx shadcn@latest init --yes --defaults` or commit the config file manually
- Tailwind 3 vs 4 — project uses 3 (verify via `packages/ui/package.json`)
- React 19 — compatible with Next 14.2+, but some shadcn primitives may need `--legacy-peer-deps` on install
- The gateway's JWT guard is app-wide (`APP_GUARD` in `app.module.ts`). Auth flow must persist `accessToken` in localStorage (not cookie — cookies are reserved for `refresh_token`).
- CORS on gateway allows `FRONTEND_URL` env (default `http://localhost:3001`). Web dev server must run on 3001, not Next default 3000 (gateway owns 3000).

## Expected sub-plan 3b — Playground + API Keys UI

### `/playground` page (public, no JWT required)

Layout (from spec "Playground UX flow"):
```
Header: "SEO Check Playground"
API key input (paste, persisted to localStorage) + "Get a key →" link to /settings/api-keys

[Tabs: URL | Markdown | HTML]  ←  Monaco editor pane
[Right panel]                   ←  Options: enrichMode, language, includeSummary, filter
                                   Target keyword + secondary keywords
                                   "Try sample →" dropdown (3-4 preloaded samples)

[Submit] [Copy as cURL] [Copy as JS] [Copy response]

[Result viewer]
  Score card + category breakdown bars
  Summary (if includeSummary)
  Filter bar: Category / Audience / Severity dropdowns (client-side filtering)
  Issue cards with:
    - rule badge (severity + category + audience tags)
    - title / description / evidence
    - suggestion { text, rationale }
    - "Apply to input →" button (client-side string replace in Monaco; only on Markdown/HTML tabs)
    - "Copy" button
```

Key decisions:
- **Monaco**: dynamic-import to avoid SSR + bundle bloat. Fallback to `<textarea>` for SSR.
- **localStorage keys**: `seo-playground-api-key`, `seo-playground-last-input` (for UX)
- **"Apply to input" implementation**: simple string-replace in the editor buffer. Works for `rewrite` type; for `add` prepend, `remove` delete matching span, `reorder` is a no-op placeholder.
- **Samples**: 3-4 fixtures in `apps/web/src/lib/playground-samples.ts` (short bài blog, bài có nhiều issue, URL draft)
- **cURL/JS copy**: templated strings with current form state baked in. Shows real key value.

### `/settings/api-keys` page (JWT required)

```
Settings > API Keys                                      [+ Create key]
─────────────────────────────────────────────────────────────────────
Name              Prefix               Env    Last used    Actions
Production CI     sk_live_abc12345…    live   3 min ago    [Revoke]
My WP plugin      sk_live_def67890…    live   2 days ago   [Revoke]
Local test        sk_test_xyz…         test   never        [Revoke]

(optional for MVP: usage chart reading /api/v1/admin/api-keys or a new /usage endpoint)
```

Create modal flow:
1. Click "+ Create key" → modal with name + env radio
2. Submit → POST /users/me/api-keys
3. Response modal: **plaintext displayed ONCE** in a monospace block with "Copy" button + "I saved it" confirm
4. After confirm → reload list, plaintext discarded from state

**Security**:
- Plaintext NEVER logged to console, NEVER in query cache persistence, NEVER in URL
- `useMutation` onSuccess shows modal; onSettled clears the ref

### Playwright tests (minimal, 2 files)

- `playground.spec.ts`: paste key + URL + keyword → Check → assert score visible → filter category → click "Copy as cURL" → assert clipboard
- `api-keys.spec.ts`: login → /settings/api-keys → create → plaintext modal → copy → revoke → disappears

## Expected sub-plan 3c — CLI + narrative docs

### `packages/seo-check-cli/`

```
packages/seo-check-cli/
├── package.json      bin: { "seo-check": "./dist/cli.js" }, deps: commander + chalk, peer: none
├── tsconfig.json
├── src/
│   ├── cli.ts        commander entry, parses flags, calls fetch, delegates to formatter
│   ├── client.ts     minimal fetch wrapper with sk_* auth (shared shape with docs/public-api/sdk-js.md)
│   ├── formatter.ts  pretty terminal output with chalk (color by severity)
│   └── index.ts      barrel
└── README.md
```

CLI contract:
```
seo-check --url <url> --keyword <kw> [options]
seo-check --file <path> --keyword <kw> [--mode markdown|html]
seo-check <same> --format json                    # for scripting
seo-check <same> --fail-on error [--min-score 70] # CI gate (exit 1 on condition)
seo-check <same> --enrich off|template|llm        # default llm
seo-check <same> --language vi|en                 # default vi
seo-check <same> --env SEO_API_KEY --env-file ~/.seo-check.json
```

Exit codes:
- 0: pass (or criteria met)
- 1: CI gate tripped (error/warning found per `--fail-on`)
- 2: network/auth error
- 3: invalid arguments

**Distribution**: MVP runs via `npm exec --workspace packages/seo-check-cli -- seo-check ...` in the monorepo — NO npm publish in this plan. Publishing deferred.

### `docs/public-api/` narrative (8 files)

Topics (from spec "Docs structure"):
```
README.md               # overview, link tới playground + swagger
getting-started.md      # tạo key, first cURL request
input-types.md          # url/markdown/html examples with cURL + JS SDK
output-schema.md        # field-by-field reference
error-codes.md          # 15 error codes from spec
rate-limits.md          # 20/min, 500/day, 100/ip/min, Retry-After semantics
sdk-js.md               # copy-paste 40-line TS snippet
cli.md                  # CLI usage + GitHub Action example
changelog.md            # v1 additive changes
```

## Critical constraints (same as Plans 1/2)

- **No Claude attribution** in commit messages. `.claude/CLAUDE.md` line 31.
- **Never bypass hooks** (`--no-verify`). Pre-commit runs `turbo run lint check-types`.
- **Start fresh from `feat/seo-public-api`** (tag `public-api-plan-1-done` or HEAD after Plan 2). Do NOT branch off an older commit.
- **Do NOT touch gateway/analyzer/crawler code** — Plan 3 is pure frontend + CLI + docs. Any backend change = scope creep, escalate first.
- **Real API calls in Playwright are optional** — consider MSW-style mocking for deterministic CI. Manual smoke against running gateway is the acceptance criterion, not CI browser tests hitting real DB.
- **Don't publish anything to npm** — the CLI stays workspace-local until validated with real users.

## Environment

- Branch: `feat/seo-public-api` (Plan 2 HEAD, verify with `git log --oneline -1`)
- Gateway running on `:3000`, must run web on `:3001` (CORS + avoid port clash)
- Node 24, TypeScript strict
- shadcn/ui — pinned Tailwind 3 variant (not 4)
- React 19 + Next 14.2+

## Open questions to raise (or decide via `/auto-decide`)

1. **Single monster plan vs split 3a/3b/3c?** Recommendation: split (each produces working software; 3a alone is usable for auth testing).
2. **Playwright vs manual QA only?** Recommendation: Playwright for critical paths (auth, create-key, submit playground), manual for polish.
3. **Shadcn pinned components** vs on-demand `npx shadcn add <x>`? Recommendation: pin via `components.json` + initial checkin to avoid flakiness across fresh clones.
4. **Landing page content?** Recommendation: minimal — "SEO Analyst — Public API playground" + 2 CTAs (Playground, Get a Key). Out of scope for this plan to build a marketing site.
5. **Auth UI polish level?** Recommendation: functional, not designed. Spec's audience is engineering demo, not marketing.
6. **CLI npm publish?** Recommendation: deferred (keep scope tight).

---

**Handoff complete.** Fresh session command to run:

```
/superpowers:writing-plans

Read these in order then write Plan 3 (decide single vs split per §"Recommended scope split"):
  1. docs/superpowers/plans/PLAN-3-HANDOFF.md  ← this file
  2. docs/superpowers/specs/2026-04-22-seo-public-api-design.md  (section "Playground + Developer Experience")
  3. apps/gateway/src/public-api/dto/public-check-request.dto.ts
  4. apps/gateway/src/public-api/services/public-check.service.ts
  5. apps/gateway/src/public-api/controllers/api-keys.controller.ts
  6. apps/gateway/src/auth/controllers/auth.controller.ts  (for /register + /login contract)

IMPORTANT: apps/web is EMPTY on current branch — Plan 3 must include Next.js scaffold as first phase.

Save output to: docs/superpowers/plans/2026-04-22-seo-public-api-plan-3-dx-surfaces.md
(or split into -plan-3a/-3b/-3c if writer chooses)
```
