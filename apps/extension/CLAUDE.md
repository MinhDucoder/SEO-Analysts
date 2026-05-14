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

## Build pipeline — npm override

The root `package.json` pins `@wxt-dev/module-react`'s nested
`@vitejs/plugin-react` to `^4.7.0`:

```json
"overrides": {
  "@wxt-dev/module-react": {
    "@vitejs/plugin-react": "^4.7.0"
  }
}
```

Why: the stock `module-react@1.2.x` ships `plugin-react@6`, which
imports `vite/internal` — a Vite 8 export. The monorepo's vitest
chain ends up hoisting Vite 7 (which has no `./internal` subpath),
so plugin-react@6 crashes at `wxt prepare`. plugin-react@4 uses only
public Vite API and works against any Vite 4-8.

If WXT or module-react ship a fix, this override can be removed — but
verify with `wxt build` first.

## Backend contract

- Endpoint: `POST /api/v1/public/check`
- Auth: `Authorization: Bearer sk_(live|test)_...`
- Request: `{ input: { type, url|html|markdown }, targetKeyword, options }`
- Response: `{ score, scoreBreakdown, issues[], meta }`
- Errors: 15 documented codes (see `docs/public-api/error-codes.md`)

CORS — gateway allows `chrome-extension://*` only for `/api/v1/public/*`.
