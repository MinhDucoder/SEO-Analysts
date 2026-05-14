# Chrome Extension — Trạng thái hiện tại (current state)

> **Ngày khảo sát:** 2026-05-14
> **Branch:** `feat/chrome-ext-v2`
> **Commit head:** `6d4a6f9` — Phase 3 đã ship (cache 1h + auto fallback URL→HTML)
> **Phạm vi tài liệu:** Mô tả những gì đã có trong `apps/extension/` + public API tương ứng. Không phải spec thiết kế (xem [02-design.md](02-design.md)).

---

## 1. TL;DR

Extension là **thin client** gọi `POST /api/v1/public/check` qua gateway, dùng API key BYOK (`sk_live_…`/`sk_test_…`). Toàn bộ rules + AI suggestion chạy server-side. Đã ship 3 trên 5 phase theo spec [`docs/superpowers/specs/2026-04-29-chrome-ext-design.md`](../superpowers/specs/2026-04-29-chrome-ext-design.md):

| Phase | Trạng thái | Scope đã ship |
|---|---|---|
| 1 — Skeleton + Auth | DONE | WXT scaffold, options page paste key, service worker auth routing, CORS patch gateway |
| 2 — Audit flow E2E | DONE | `lib/client.ts`, content script DOM extract, popup UI keyword + score + issues + AI suggestion, 15-code error dispatch |
| 3 — UX polish | DONE | Local cache 1h, auto fallback URL→HTML khi gateway 424, retry countdown trên 429 |
| 4 — Side panel + i18n + history | PENDING | (xem [02-design.md](02-design.md)) |
| 5 — Publish prep | PENDING | (xem [02-design.md](02-design.md)) |

Stack: WXT 0.20 + React 19 + TypeScript + Vitest. Không Tailwind, không shadcn — inline React styles (theo quyết định project, xem `feedback_ext_inline_styles.md`).

---

## 2. Cấu trúc thư mục thực tế

```
apps/extension/
├── CLAUDE.md                       # Per-app instructions (auth + permission rationale)
├── wxt.config.ts                   # MV3 manifest + permissions
├── package.json                    # @seo/extension workspace
├── tsconfig.json                   # extends @repo/typescript-config/base.json
├── vitest.config.ts                # Node-env unit tests
├── ext.pen                         # Pencil design canvas (UI mockup)
├── entrypoints/
│   ├── background.ts               # MV3 service worker — audit orchestrator
│   ├── content.ts                  # DOM scraper (probe + serialize)
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                 # 405 LOC — keyword input + result + error view
│   └── options/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx                 # 215 LOC — paste/validate/save/clear key
├── lib/
│   ├── api-base.ts                 # resolveApiBaseUrl() — env / localhost fallback
│   ├── api-types.ts                # Mirror PublicCheckRequest/Response (manual sync)
│   ├── cache.ts                    # 1h chrome.storage.local cache (cyrb53 hash key)
│   ├── client.ts                   # Bearer fetch wrapper, throws PublicApiError
│   ├── errors.ts                   # 19 error code → 7 UX action dispatch
│   ├── scraper.ts                  # shouldUseHtmlMode + serializeMinimalHtml (200KB cap)
│   ├── storage.ts                  # API key save/load/clear + format regex
│   └── types.ts                    # ExtensionMessage union + ContentScrapeProbe
└── test/
    ├── cache.spec.ts
    ├── client.spec.ts
    ├── errors.spec.ts
    ├── scraper.spec.ts
    └── storage.spec.ts
```

**Bundle target hiện tại:** ~300 KB sau prod build (theo spec; chưa đo lại sau Phase 3).

---

## 3. Data flow — 1 click audit

```
┌─────────────────────────────────────────────────────────────────────┐
│  User clicks extension icon → popup.html mở (380×auto px)          │
│  popup/App.tsx: loadApiKey() check → render keyword form           │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ user nhập keyword + click "Audit"
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  popup → chrome.runtime.sendMessage({ type: 'AUDIT_PAGE', ... })   │
│  background.ts:runAudit() nhận message                              │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │ loadApiKey() từ      │                  │ chrome.tabs.query    │
   │ chrome.storage.local │                  │ ({active,current})   │
   └──────────┬───────────┘                  └──────────┬───────────┘
              │                                         │
              ▼                                         ▼
       ┌────────────────────────────────────────────────────────┐
       │  askContent(tabId, EXTRACT_FOR_CHECK, needHtml=false)  │
       │  → content.ts trả { url, isAuthGated }                 │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
         not auth-gated                    auth-gated
         (URL mode)                        (HTML mode)
                  │                               │
                  │                               ▼
                  │              ┌────────────────────────────────┐
                  │              │ askContent needHtml=true        │
                  │              │ → serializeMinimalHtml(doc)     │
                  │              │   strip script/style/hidden,    │
                  │              │   cap 200 KB, throw nếu vượt    │
                  │              └────────────┬───────────────────┘
                  │                           │
                  ▼                           ▼
       ┌──────────────────────┐  ┌──────────────────────┐
       │ cache.readCache()    │  │ (không cache HTML —  │
       │ key = cyrb53(url|kw  │  │  DOM thay đổi runtime)│
       │ |lang) prefix "ax:"  │  │                      │
       │ TTL 1h               │  │                      │
       └──────────┬───────────┘  └──────────┬───────────┘
                  │ miss                    │
                  ▼                         ▼
       ┌─────────────────────────────────────────────┐
       │  client.check({ apiKey, baseUrl, body })    │
       │    POST {baseUrl}/api/v1/public/check       │
       │    Authorization: Bearer sk_(live|test)_... │
       │    Content-Type: application/json           │
       │    Body: { input, targetKeyword,            │
       │            secondaryKeywords?, options }    │
       └──────────────────────┬──────────────────────┘
                              │ HTTPS / fetch
                              ▼
       ┌─────────────────────────────────────────────┐
       │  GATEWAY :3000                              │
       │  PublicCheckController @Post('check')       │
       │    ├─ ApiKeyGuard (Bearer verify)           │
       │    ├─ PublicApiRateLimitService             │
       │    │   (20/min, 500/day per key)            │
       │    │   set X-RateLimit-* + Retry-After      │
       │    └─ PublicCheckService.execute()          │
       │        1. cache lookup (sha256 24h Redis)   │
       │        2. ContentExtractor                  │
       │           ├─ url → CrawlerGrpcClient.liteFetch
       │           ├─ markdown → marked().parse      │
       │           └─ html → passthrough             │
       │        3. AnalyzerGrpcClient.analyzeContent │
       │           (gRPC :50053, 20 rules → score)   │
       │        4. SuggestionEnricherService.enrich  │
       │           (off / template / llm + concurrency limit 5/key)
       │        5. build PublicCheckResponse         │
       │        6. cache + return                    │
       └──────────────────────┬──────────────────────┘
                              │ JSON response
                              ▼
       ┌─────────────────────────────────────────────┐
       │  client.ts                                  │
       │  - res.ok → return PublicCheckResponse      │
       │  - !res.ok → parse error envelope,          │
       │              throw PublicApiError{code,     │
       │              status, requestId, retryAfter} │
       │  - network fail → CLIENT_NETWORK_ERROR      │
       └──────────────────────┬──────────────────────┘
                              │
                              ▼
       ┌─────────────────────────────────────────────┐
       │  background.runAudit                        │
       │  ├─ success URL mode → writeCache()         │
       │  ├─ error URL_FETCH_FAILED/TIMEOUT → retry  │
       │  │   với HTML mode (auto fallback)          │
       │  └─ mapAuditError(e) → AuditErr             │
       │      + chrome.runtime.openOptionsPage()     │
       │        nếu action='OPEN_OPTIONS'            │
       └──────────────────────┬──────────────────────┘
                              │ sendResponse(AuditReply)
                              ▼
       ┌─────────────────────────────────────────────┐
       │  popup/App.tsx render                       │
       │  - mode='ok' → ResultView (score + issues   │
       │                 + AI suggestion cards)      │
       │  - mode='error' → ErrorView (code-aware UX) │
       │    + RetryCountdown nếu RETRY_LATER         │
       │    + "Open settings" nếu OPEN_OPTIONS       │
       └─────────────────────────────────────────────┘
```

---

## 4. Surface contract — extension ↔ gateway

### 4.1. Endpoint

`POST {baseUrl}/api/v1/public/check`

| Header | Bắt buộc | Ghi chú |
|---|---|---|
| `Authorization: Bearer sk_(live\|test)_…43chars` | ✅ | Validate format ở client trước khi save (`/^sk_(live\|test)_[A-Za-z0-9_-]{43}$/`) |
| `Content-Type: application/json` | ✅ | |
| `Idempotency-Key: <uuid>` | optional | Dedupe retry 24h — chưa dùng trong ext, có thể thêm Phase 4 |

### 4.2. Request body — 3 input shapes (mutex)

```ts
{
  input:
    | { type: 'url', url: 'https://...' }
    | { type: 'html', html: '<!doctype html>...' }      // ≤ 200 KB
    | { type: 'markdown', markdown: '# ...' },          // ext không dùng
  targetKeyword: string,                                 // 1-100 chars, required
  secondaryKeywords?: string[],                          // max 5
  options?: {
    enrichMode?: 'off' | 'template' | 'llm',             // ext default: 'llm'
    language?: 'vi' | 'en',                              // ext default: 'vi'
    includeSummary?: boolean,
    filter?: {
      audiences?: ('writer'|'dev')[],
      categories?: string[],
      minSeverity?: 'info'|'warning'|'error'
    }
  }
}
```

Chỉ 1 field con của `input` được set; gateway validate qua `OneOfTypeMatching` custom decorator (`apps/gateway/src/public-api/dto/public-check-request.dto.ts`).

### 4.3. Response — PublicCheckResponse

```ts
{
  score: number,                          // 0-100 weighted average
  scoreBreakdown: Record<string, number>, // theo category
  issues: Array<{
    ruleId, severity, category,
    audience: ('writer'|'dev')[],
    title, description,
    evidence: Record<string, unknown>,
    suggestion: null | { type, text, rationale },
    docRef?: string
  }>,
  summary?: { writer, dev },              // chỉ khi includeSummary=true
  meta: {
    inputType, resolvedUrl?,
    contentStats: { words, characters, readingTimeSec },
    processingTimeMs, ruleVersion,
    enrichMode, suggestionSource,
    degraded: boolean,                    // LLM fallback → template
    cached: boolean, requestId,
    usage: { remaining: {minute,day}, resetAt: {minute,day} }
  }
}
```

Headers kèm theo: `X-RateLimit-Limit-Minute`, `X-RateLimit-Remaining-Minute`, `X-RateLimit-Limit-Day`, `X-RateLimit-Remaining-Day`, `X-Request-Id`, `X-Rule-Version`, `Retry-After` (chỉ trên 429).

### 4.4. Error envelope (15 mã)

```ts
{ statusCode, error, code: PublicApiErrorCode, message, requestId?, details? }
```

Bảng dispatch ở `apps/extension/lib/errors.ts`:

| Code (gateway) | UX action | Phase ship |
|---|---|---|
| `MISSING_API_KEY`, `INVALID_API_KEY`, `KEY_DISABLED` | `OPEN_OPTIONS` — auto mở options page | 1 |
| `RATE_LIMIT_EXCEEDED` | `RETRY_LATER` — countdown từ `Retry-After` | 3 |
| `URL_FETCH_FAILED`, `URL_FETCH_TIMEOUT` | `FALLBACK_TO_HTML` — ext auto retry HTML mode | 3 |
| `PAYLOAD_TOO_LARGE`, `CLIENT_PAYLOAD_TOO_LARGE` | `REDUCE_PAYLOAD` — toast (chưa auto reduce) | 2 |
| `INVALID_URL`, `INVALID_MARKDOWN`, `MISSING_TARGET_KEYWORD`, `INPUT_TYPE_MISMATCH`, `INVALID_JSON` | `INPUT_FIX` — toast + nút Try again | 2 |
| `ANALYZER_UNAVAILABLE`, `CRAWLER_UNAVAILABLE`, `SERVICE_UNAVAILABLE` | `SHOW_SERVER_OUTAGE` | 2 |
| `INTERNAL`, `CLIENT_NETWORK_ERROR`, `CLIENT_UNKNOWN` | `SHOW_GENERIC` + show requestId | 2 |

3 mã `CLIENT_*` là synthesised client-side (không bao giờ từ gateway) để popup không phải sniff raw error message.

### 4.5. Rate limits (theo `docs/public-api/rate-limits.md`)

| Bucket | Limit | Window |
|---|---|---|
| Per key / minute | 20 | 60s sliding |
| Per key / day | 500 | 24h UTC reset |
| LLM concurrency / key | 5 | instant (excess → degrade template, vẫn 200 OK) |
| Per IP / minute | 100 | 60s sliding (anti-brute) |

---

## 5. Auth & permissions

### 5.1. BYOK API key

- User tạo key tại `/settings/api-keys` trên web app (Next.js, `apps/web`).
- Plaintext trả về **đúng 1 lần** khi tạo, sau đó chỉ còn prefix.
- Key format: `sk_(live|test)_<43 chars base64url>`.
- Ext validate format ở client (`isValidApiKeyFormat`) trước khi gọi `chrome.storage.local.set`.

### 5.2. Storage threat model (xem `apps/extension/lib/storage.ts` § JSDoc)

- Dùng `chrome.storage.local`, **không** `storage.sync` — sync sẽ đẩy key qua Google account sang profile khác.
- Plaintext OK vì:
  - Chrome scope `storage.local` theo extension ID; sibling ext không đọc được.
  - Content script không có quyền `chrome.storage` — chỉ service worker + popup + options.
  - `crypto.subtle` encryption cần key, mà key cũng phải lưu cùng disk → chỉ là obfuscation.
- Mitigate qua: revoke easy ở `/settings/api-keys`, privacy policy nêu rõ, không log key plaintext.

### 5.3. Manifest permissions (`wxt.config.ts`)

| Permission | Lý do |
|---|---|
| `activeTab` | Chỉ inject content script khi user click extension — không passive scan |
| `storage` | BYOK key |
| `host_permissions: https://api.seoanalyst.app/*` | Production gateway |
| `host_permissions: http://localhost:3000/*` | Dev gateway |

**Không request:** `tabs`, `cookies`, `webNavigation`, `<all_urls>` — giảm blast radius nếu ext compromise và giúp Web Store review.

### 5.4. CORS gateway

`apps/gateway/src/main.ts:43-50` cho phép `chrome-extension://*` + `moz-extension://*` (future Firefox) ngoài `FRONTEND_URL`. Áp dụng cho mọi route, không chỉ `/public/*` — `Authorization` header tự nó là boundary, không cần origin allowlist hẹp hơn.

---

## 6. Scraping logic (`lib/scraper.ts`)

### 6.1. URL vs HTML mode picker

`shouldUseHtmlMode(url)` trả `true` (→ HTML mode) khi:

1. URL không parse được.
2. Protocol không phải `http://` hoặc `https://`.
3. Protocol `http://` nhưng hostname ≠ `localhost` (gateway sẽ 4xx public http).
4. Hostname là `localhost` hoặc `127.0.0.1` (gateway không reach được).
5. URL match `AUTH_GATED_PATTERNS`:
   - `/admin`, `/dashboard`, `/wp-admin`, `/account`, `/settings`, `/draft`, `/preview`, `/editor`

Mọi case khác → URL mode (gateway tự fetch, cache server-side 24h Redis).

### 6.2. HTML serialization

`serializeMinimalHtml(doc)`:

- Clone document tránh mutate page.
- Remove: `<script>`, `<style>`, `<noscript>`, `<iframe>`, `<svg>`, `<template>`, `[hidden]`.
- Strip inline event handlers (`on*` attrs).
- Wrap với `<!doctype html>` + `documentElement.outerHTML`.
- Throw nếu byte size > 200 KB (gateway cap = `HTML_PAYLOAD_MAX_BYTES`).

---

## 7. Local cache (`lib/cache.ts`)

- Storage shape: `chrome.storage.local['ax:<8+8 hex>']` = `{ savedAt: ms, result }`.
- Key: cyrb53 32-bit hash của `${url}|${keyword.lowerCase()}|${language}`.
- TTL: 1h (`AUDIT_CACHE_TTL_MS = 60*60*1000`).
- **Chỉ cache URL mode** — HTML mode bám DOM live, cache sẽ stale khi user sửa draft.
- Read trả entry với `meta.cached: true` để UI hiện badge "cached".
- Stale entry tự cleanup khi read miss.

Lưu ý: cache client-side ≠ cache gateway. Gateway cũng cache 24h Redis sha256(content+kw+lang+mode+ruleVersion). Cache extension giúp tiết kiệm network hop entirely khi user reaudit cùng URL+kw trong 1h.

---

## 8. UI hiện tại

### 8.1. Popup (`entrypoints/popup/App.tsx`, 405 LOC)

Component tree:

```
App
├─ Header: <h1>SEO Analyst</h1> + tag {live|test}
├─ Form: input keyword + button "Audit page" / "Auditing…"
├─ ResultView (when mode='ok')
│   ├─ Score row: score/100 colored + cached/degraded tags
│   ├─ Stats: words · issues · processingTimeMs
│   ├─ Issues list (max-h:360px scroll)
│   │   └─ IssueCard per issue
│   │       ├─ Title + severity badge
│   │       ├─ Description
│   │       ├─ Suggestion card (rewrite/add/remove/reorder + rationale)
│   │       └─ docRef link
│   └─ Usage: "{n} reqs left / min · {n} / day"
├─ ErrorView (when mode='error')
│   ├─ message + code + requestId
│   ├─ "Open settings" if OPEN_OPTIONS
│   ├─ RetryCountdown if RETRY_LATER + retryAfterSeconds
│   └─ "Try again" otherwise
└─ Footer: link "Manage key"
```

Styling: inline `styles: Record<string, React.CSSProperties>` — không Tailwind, không shadcn. Color palette: slate-50/100/200/600/900, red-50/200/600/700, green-700, amber-700, blue-700.

### 8.2. Options (`entrypoints/options/App.tsx`, 215 LOC)

Page 560px max-width, 40px vertical margin:

- Hero: H1 + intro paragraph.
- Card "Saved key": shows masked `${key.slice(0,12)}…${key.slice(-4)}` + env badge + "Forget this key" button.
- Form: `<input type="password">` + validate prefix realtime + Save button (disabled khi format sai).
- Toast: `kind='saved' { env }` / `kind='error' { message }`.

Thông báo gửi qua `chrome.runtime.sendMessage({ type: 'API_KEY_SAVED'|'API_KEY_CLEARED' })` để service worker biết khi nào cần re-open options page.

---

## 9. Test coverage hiện tại

| File | Mô tả | Loại |
|---|---|---|
| `test/cache.spec.ts` | TTL, write→read roundtrip, stale cleanup, hash collision sanity | L1 unit |
| `test/client.spec.ts` | Bearer header, 2xx/4xx/5xx parse, network error → CLIENT_NETWORK_ERROR | L1 unit (fetch stub) |
| `test/errors.spec.ts` | 19 code → 7 action mapping coverage | L1 unit |
| `test/scraper.spec.ts` | AUTH_GATED_PATTERNS coverage, payload cap throw, strip noise | L1 unit (happy-dom) |
| `test/storage.spec.ts` | Format regex pass/fail, chrome.storage mock save/load/clear | L1 unit |

**Không có** integration test (real gateway), không có Playwright extension e2e. Theo memory `feedback_fe_be_integration_skill`, slug audit/CMS/upload là L4 territory — nhưng ext qua public-api không thuộc 10 trigger nên L4 không bắt buộc.

---

## 10. Build & deploy

```bash
npm run dev -w @seo/extension          # WXT dev server :3030 + auto-reload
npm run build -w @seo/extension        # → .output/chrome-mv3/
npm run test -w @seo/extension         # Vitest unit tests
npm run check-types -w @seo/extension  # tsc --noEmit
npm run zip -w @seo/extension          # → .output/chrome-mv3.zip (Web Store submit)
```

### 10.1. Vite/WXT pin (xem `apps/extension/CLAUDE.md` § "Build pipeline")

Root `package.json` override `@wxt-dev/module-react` nested `@vitejs/plugin-react@^4` thay vì 6 — plugin 6 import `vite/internal` (Vite 8) crash khi monorepo hoist Vite 7. Bỏ override sau khi WXT/module-react bump dependency.

### 10.2. Env config

`apps/extension/lib/api-base.ts`:
- Dev: default `http://localhost:3000`.
- Prod: `WXT_API_BASE_URL` env override (set khi chạy `wxt build`).

Sample `.env.production`:
```
WXT_API_BASE_URL=https://api.seoanalyst.app
```

---

## 11. Risks & gaps đã biết

| Risk | Status | Note |
|---|---|---|
| `api-types.ts` desync với gateway | Open | Sync thủ công cho đến khi `@repo/shared` export `PublicCheckResponse` — non-additive breaking change cần bump ext minor + republish |
| Bundle size chưa đo sau Phase 3 | Open | Spec target < 300 KB, cần `wxt build` + size audit Phase 5 |
| Không có e2e test với real gateway | Open | Có thể wire Playwright sau khi web app có docker:up flow ổn |
| `CLIENT_PAYLOAD_TOO_LARGE` chưa auto-reduce | Open | Hiện chỉ throw toast; Phase 4 có thể strip thêm tags (e.g., navigation, footer) trước khi fallback |
| Localhost dev với `http://` chỉ work khi tab cũng `http://localhost` | Known limitation | URL mode picker buộc localhost → HTML mode; chấp nhận, dev rare case |
| Privacy policy URL chưa publish | Phase 5 blocker | Cần host trước khi submit Web Store |
| Icons 16/48/128 + screenshots chưa làm | Phase 5 blocker | |

---

## 12. Tham chiếu

- Spec v2: [`docs/superpowers/specs/2026-04-29-chrome-ext-design.md`](../superpowers/specs/2026-04-29-chrome-ext-design.md)
- Per-app rationale: [`apps/extension/CLAUDE.md`](../../apps/extension/CLAUDE.md)
- Service map: [`apps/CLAUDE.md`](../../apps/CLAUDE.md)
- Gateway DDD: [`apps/gateway/CLAUDE.md`](../../apps/gateway/CLAUDE.md)
- Public API spec: [`docs/public-api/`](../public-api/)
  - `README.md`, `getting-started.md`, `input-types.md`, `output-schema.md`, `error-codes.md`, `rate-limits.md`
- Source files chính:
  - [`apps/extension/entrypoints/background.ts`](../../apps/extension/entrypoints/background.ts) — service worker orchestrator
  - [`apps/extension/entrypoints/content.ts`](../../apps/extension/entrypoints/content.ts) — DOM scraper
  - [`apps/extension/entrypoints/popup/App.tsx`](../../apps/extension/entrypoints/popup/App.tsx) — popup UI
  - [`apps/extension/entrypoints/options/App.tsx`](../../apps/extension/entrypoints/options/App.tsx) — options UI
  - [`apps/extension/lib/client.ts`](../../apps/extension/lib/client.ts) — fetch wrapper
  - [`apps/extension/lib/errors.ts`](../../apps/extension/lib/errors.ts) — error dispatch
  - [`apps/extension/lib/scraper.ts`](../../apps/extension/lib/scraper.ts) — URL/HTML picker
  - [`apps/extension/lib/storage.ts`](../../apps/extension/lib/storage.ts) — key storage
  - [`apps/extension/lib/cache.ts`](../../apps/extension/lib/cache.ts) — 1h response cache
  - [`apps/gateway/src/public-api/controllers/public-check.controller.ts`](../../apps/gateway/src/public-api/controllers/public-check.controller.ts) — entry endpoint
  - [`apps/gateway/src/public-api/services/public-check.service.ts`](../../apps/gateway/src/public-api/services/public-check.service.ts) — orchestrator
