# @seo/extension — Chrome Extension (thin client over /public/check)

WXT-based extension. On 1-click, scrapes the current page (URL or HTML
mode) and calls `POST /api/v1/public/check` on the gateway with the
user's `Bearer sk_...` key. Renders score + issues + AI suggestions in
the popup. Mirrors the CLI's auth model — same key, same endpoint, same
contract.

## Structure

```
apps/extension/
├── wxt.config.ts            # Manifest V3 + permissions
├── package.json             # @seo/extension workspace
├── tsconfig.json            # extends @repo/typescript-config/base.json
├── vitest.config.ts         # Node-env unit tests
├── entrypoints/
│   ├── background.ts        # MV3 service worker
│   ├── content.ts           # DOM scraper (Phase 2 fills out)
│   ├── popup/               # React popup (Phase 1: placeholder)
│   │   ├── index.html, main.tsx, App.tsx
│   └── options/             # React options page (Phase 1: paste key)
│       ├── index.html, main.tsx, App.tsx
├── lib/
│   ├── storage.ts           # chrome.storage.local helpers + key regex
│   ├── types.ts             # Extension-local types
│   └── client.ts            # (Phase 2) Bearer fetch wrapper
└── test/
    └── storage.spec.ts      # Validation + storage helpers (TDD)
```

## Phases

| # | Tier | Status | Scope |
|---|---|---|---|
| 1 | LARGE | **in progress** | WXT scaffold + options page (paste key) + service worker auth routing + gateway CORS patch |
| 2 | LARGE | pending | `lib/client.ts` + content-script DOM extract + popup audit UI + 15-code error dispatch |
| 3 | LARGE | pending | UX polish — loading states, retry 429+countdown, local cache 1h, auto-fallback URL→HTML |
| 4 | LARGE | pending | Side panel + i18n (vi/en) + history + audience filter |
| 5 | SMALL | pending | Publish prep — icons, screenshots, store listing, privacy policy, submit |

Design v2: `docs/superpowers/specs/2026-04-29-chrome-ext-design.md`

## Auth (BYOK)

User creates an API key at `/settings/api-keys` on the web app and pastes
it into the extension's options page. The key is validated against
`/^sk_(live|test)_[A-Za-z0-9_-]{43}$/` and stored via
`chrome.storage.local` (extension-scoped, content scripts cannot read).

## Permissions (minimal by design)

- `activeTab` — granted only when the user clicks the action
- `storage` — for the BYOK key
- `host_permissions` — narrowly scoped to `https://api.seoanalyst.app/*`
  and `http://localhost:3000/*`

Not requested: `tabs`, `cookies`, `webNavigation`, `<all_urls>`. The
narrow surface helps with Web Store review and limits blast radius if
the extension is ever compromised.

## Build

```bash
npm run dev -w @seo/extension          # WXT dev server + auto-reload
npm run build -w @seo/extension        # Production build → .output/chrome-mv3/
npm run test -w @seo/extension         # Vitest unit tests
npm run check-types -w @seo/extension  # tsc --noEmit
```

## Loading in Chrome

1. `npm run dev -w @seo/extension` (or `build`)
2. Chrome → `chrome://extensions/` → enable Developer mode
3. Load unpacked → select `apps/extension/.output/chrome-mv3-dev` (or
   `chrome-mv3` for production)

## Known issue — Vite version conflict (Phase 1)

`wxt prepare` / `wxt build` currently fail with
`Package subpath './internal' is not defined by "exports" in vite`.
Root cause: WXT 0.20 expects Vite ^8 but vitest 2.1.9 pins Vite 5.4 at
the root, and npm hoisting puts the older Vite where WXT's plugin-react
resolves it. The bundled `wxt/node_modules/vite` (v8) is not picked up.

Workarounds (pick one in Phase 2):
1. Add `"overrides": { "vite": "^8.0.12" }` to root package.json (will
   break vitest in other workspaces until vitest is bumped).
2. Pin `vite` as a direct devDep in `apps/extension/package.json` so
   npm nests it correctly inside the extension workspace.
3. Move the extension build to a sibling repo until the monorepo's
   vitest/vite versions catch up.

Phase 1 tests (`storage.spec.ts`) and `check-types` work without any
of these workarounds — the issue only blocks `wxt prepare` / `wxt
build`. Validate Phase 1 by reading the code; defer the build pipeline
fix to Phase 2 where it's needed.

## Backend contract

- Endpoint: `POST /api/v1/public/check`
- Auth: `Authorization: Bearer sk_(live|test)_...`
- Request: `{ input: { type, url|html|markdown }, targetKeyword, options }`
- Response: `{ score, scoreBreakdown, issues[], meta }`
- Errors: 15 documented codes (see `docs/public-api/error-codes.md`)

CORS — gateway allows `chrome-extension://*` only for `/api/v1/public/*`.
