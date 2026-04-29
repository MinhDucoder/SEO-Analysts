# Chrome Extension SEO Checklist — Design v2

> **Phiên bản:** 2.0 (revised)
> **Ngày:** 2026-04-29
> **Thay thế:** `docs/chrome-extension-design.md` (v1) — v1 reinvent ~70% công cụ đã có vì viết khi không biết về branch `feat/seo-public-api`. v2 align với codebase thực tế.
> **Phạm vi:** Mở rộng SEO-Analyst monorepo — thêm `apps/extension` làm client thứ 3 sau `apps/web` và `@repo/seo-check-cli`.

---

## 0. TL;DR

Chrome extension là **thin client** gọi `POST /api/v1/public/check` (đã ship trên `feat/seo-public-api`) với `Authorization: Bearer sk_...`. Không có microservice mới, không có endpoint mới, không có Prisma migration. Mọi rules + AI suggestion chạy server-side; extension chỉ scrape DOM / lấy URL → render kết quả.

| Aspect | v1 (cũ) | v2 (này) |
|---|---|---|
| Microservice mới | `apps/ai-fix` (port 50056) | Không. Dùng `public-api` module + `@repo/seo-ai-core` đã có |
| Endpoint mới | `/api/v1/audit`, `/api/v1/ai-fix` | Không. Dùng `/api/v1/public/check` đã có |
| Auth | JWT bridge qua `externally_connectable` | Bearer API key (BYOK), giống CLI |
| Build tool | `@crxjs/vite-plugin` | **WXT** (Vite-based, framework-agnostic, leader 2026) |
| Prisma migration | Thêm `AuditSource` enum vào `seo-analyzer` DB | Không. `ApiKey` model đã có ở gateway DB |
| Workflow tier | LARGE × 8 phase | MEDIUM × 4-5 phase |
| Roadmap | 8 tuần | 4-5 tuần |

---

## 1. Mục tiêu & vai trò

### 1.1. Tại sao Chrome ext?

Web app SEO-Analyst yêu cầu user copy URL → paste → đợi audit async. Extension rút gọn xuống **1 click trên trang đang xem** với response sync (~1-2s). UX gần với Yoast / SEO Meta in 1 Click nhưng có **AI suggestion** đính kèm — thứ mà 95% extension đối thủ không có (xem competitor analysis trong notes).

### 1.2. Use cases ưu tiên (MVP)

1. **Author tự audit bài viết của mình** trên CMS (WordPress, Webflow, Ghost, Notion-as-blog) trước khi publish.
2. **SEO consultant audit trang khách** không cần mở dashboard.
3. **Content writer dogfood** workflow trong CMS — paste keyword, click extension, sửa theo gợi ý.

V2/V3 (out of scope):
- Team workspace shared history
- Auto-apply fix vào CMS
- Edge / Firefox port

---

## 2. Branch baseline & dependency chain

**QUAN TRỌNG:** Extension PHẢI branch từ `feat/seo-public-api`, không phải `main`.

```
main (5ac3c0a)
  └─ feat/seo-public-api          ← public-api module + ApiKey model + docs
       └─ feat/chrome-ext-...     ← branch tại đây
```

### 2.1. Pre-requisites trên `feat/seo-public-api`

Đã ship (tham chiếu, không xây lại):

| Thành phần | Đường dẫn | Phục vụ extension |
|---|---|---|
| `POST /api/v1/public/check` | `apps/gateway/src/public-api/controllers/public-check.controller.ts` | Endpoint chính ext gọi |
| `ApiKeyGuard` (`Bearer sk_...`) | `apps/gateway/src/public-api/guards/api-key.guard.ts` | Auth |
| `POST /api/v1/users/me/api-keys` | `apps/gateway/src/public-api/controllers/api-keys.controller.ts` | User tạo key (qua web UI) |
| `ContentExtractorService` | `apps/gateway/src/public-api/services/content-extractor.service.ts` | Server-side parse URL / markdown / HTML |
| `SuggestionEnricherService` + `SeoSuggestChainFactory` | `apps/gateway/src/public-api/services/` | AI fix suggestions qua `@repo/seo-ai-core` + Anthropic |
| Prompt template | `apps/gateway/src/public-api/prompts/suggest-fix-seo/v1.0.0.prompt.yaml` | Prompt versioned |
| Rate limit (20/min, 500/day per key) | `apps/gateway/src/public-api/services/public-api-rate-limit.service.ts` | Đã enforce |
| Error code dispatch (15 stable codes) | `apps/gateway/src/public-api/filters/public-api-exception.filter.ts` | Đã standardize |
| Public API docs | `docs/public-api/{getting-started,output-schema,error-codes,rate-limits,input-types}.md` | Reference contract |
| `@repo/seo-check-cli` | `packages/seo-check-cli/` | Pattern tham khảo (cùng auth flow) |

### 2.2. `feat/seo-public-api` chưa merge — quyết định

- **Option A (đề xuất):** Đợi PR merge vào main, rồi branch ext từ main.
- **Option B:** Branch ext trực tiếp từ `feat/seo-public-api`, ship cùng lúc.

→ Chọn A nếu PR đã ổn (theo CHANGELOG: v0.3 đã có), B nếu cần parallel work.

---

## 3. Kiến trúc tổng quan

```
┌────────────────────────────────────────┐
│   Chrome Extension (apps/extension)    │
│   - Scrape DOM hoặc lấy URL            │
│   - Hiển thị checklist + AI suggestion │
│   - Auth: Bearer sk_... từ options page│
└────────────────────┬───────────────────┘
                     │ HTTPS POST /api/v1/public/check
                     ▼
┌────────────────────────────────────────┐
│  GATEWAY (apps/gateway:3000)            │
│  - ApiKeyGuard validate sk_...          │
│  - Rate limit (20/min, 500/day per key) │
│  - PublicCheckService                   │
│      ├─ ContentExtractorService         │
│      ├─ AnalyzerGrpcClient (gRPC)       │
│      └─ SuggestionEnricherService       │
│            └─ @repo/seo-ai-core         │
│                  └─ Anthropic LLM       │
└────────────────────────────────────────┘
                     │ gRPC :50053
                     ▼
              seo-analyzer (20 rules → score)
```

**Nguyên tắc:**

1. Extension **không chạy rules**, **không gọi LLM**. Mọi logic ở backend → consistency với web app + CLI.
2. Update rules / prompt / AI provider → redeploy gateway, **không cần publish version mới của extension**.
3. Extension bundle target < 300 KB (UI + SDK only).

---

## 4. Vị trí trong monorepo

```
SEO-Analysts/
├── apps/
│   ├── gateway/             (đã có)
│   ├── crawler/             (đã có)
│   ├── seo-analyzer/        (đã có)
│   ├── keyword-analyzer/    (đã có)
│   ├── report/              (đã có)
│   ├── web/                 (đã có — Next.js, có /settings/api-keys page)
│   └── extension/           ◄── MỚI duy nhất
│       ├── wxt.config.ts
│       ├── package.json
│       ├── entrypoints/
│       │   ├── background.ts        service worker
│       │   ├── content.ts           DOM scraper
│       │   ├── popup/               React popup (entrypoint)
│       │   ├── sidepanel/           React side panel (v2)
│       │   └── options/             React settings — paste API key, choose language
│       ├── lib/
│       │   ├── client.ts            Bearer fetch wrapper (giống seo-check-cli)
│       │   ├── scraper.ts           DOM → HTML payload
│       │   ├── storage.ts           chrome.storage.local helpers (encrypted)
│       │   └── types.ts             re-export từ @repo/shared
│       ├── public/icons/
│       └── CLAUDE.md
├── packages/
│   ├── shared/              (đã có) — types dùng chung
│   ├── seo-ai-core/         (đã có) — AI core, dùng bởi gateway
│   ├── seo-check-cli/       (đã có) — pattern tham khảo
│   ├── proto/, ui/, eslint-config/, typescript-config/
└── turbo.json
```

**Không có**: `apps/ai-fix`, `packages/extension-sdk`, không có proto change.

---

## 5. Build tool — WXT

### 5.1. Tại sao WXT, không phải CRXJS

| | WXT (chọn) | CRXJS (v1 chọn) | Plasmo |
|---|---|---|---|
| Bundler | Vite | Vite plugin | Parcel |
| Bundle size | ~400 KB (43% nhỏ hơn) | trung bình | ~800 KB |
| Framework | React/Vue/Svelte/Solid | React-friendly | React-first |
| File-based routing (popup/options/sidepanel) | ✅ | ❌ (config thủ công) | ✅ |
| HMR cho content + popup | ✅ | ✅ | ✅ |
| Cross-browser (Edge/Firefox) | ✅ build-in | ⚠️ thủ công | ✅ |
| Maintenance 2026 | Active leader | Slowing | Maintenance mode |

→ WXT phù hợp với React + shadcn (`@repo/ui`) trong monorepo, build nhanh, ESM-first, output nhỏ.

### 5.2. `apps/extension/wxt.config.ts`

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'SEO Analyst',
    description: 'On-page SEO audit + AI fix suggestions',
    version: '0.1.0',
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      'https://api.seoanalyst.app/*',
      'http://localhost:3000/*'
    ],
    action: { default_popup: 'popup.html' },
    options_page: 'options.html'
  },
  modules: ['@wxt-dev/module-react'],
  runner: { startUrls: ['https://example.com'] }
});
```

### 5.3. `apps/extension/package.json`

```json
{
  "name": "@apps/extension",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/ui": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/chrome": "^0.0.260",
    "@wxt-dev/module-react": "^1.0.0",
    "wxt": "^0.20.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 6. Auth flow — BYOK API key

### 6.1. Tại sao API key, không phải JWT bridge

| | Bearer API key (chọn) | JWT bridge `externally_connectable` (v1) |
|---|---|---|
| Code phức tạp | ~30 dòng (paste vào input) | ~150 dòng (postMessage + listener + origin check + refresh logic) |
| Chia sẻ với CLI | Dùng cùng key | Khác hẳn — CLI vẫn cần API key riêng |
| User đã ở browser session | Không yêu cầu | Bắt buộc — broken nếu user logout web app |
| Revoke / rotate | UI có sẵn ở `/settings/api-keys` | Chỉ revoke session token, key vẫn live |
| User kiểm soát quota | Tạo nhiều key, phân biệt environment (`live` / `test`) | 1 user = 1 token |
| Use case enterprise (CI, team) | Native | Không hỗ trợ |

### 6.2. Sequence (đơn giản hơn v1 nhiều)

```
User                Extension              Web App                  Gateway
 │                      │                     │                        │
 │ Click extension     │                     │                        │
 ├─────────────────────►│                     │                        │
 │                      │ Đọc apiKey từ       │                        │
 │                      │ chrome.storage      │                        │
 │                      │ ── miss ──          │                        │
 │                      │                     │                        │
 │                      │ Mở options page     │                        │
 │                      │ với hint:           │                        │
 │                      │ "Tạo key tại        │                        │
 │                      │ /settings/api-keys" │                        │
 │                      │                     │                        │
 │ Vào web app, tạo key │                     │                        │
 ├──────────────────────────────────────────►│ POST /users/me/api-keys │
 │                      │                     ├───────────────────────►│
 │                      │                     │ ◄── { plaintext } ─────│
 │ Copy plaintext       │                     │                        │
 │ Paste vào ext options│                     │                        │
 ├─────────────────────►│ chrome.storage.local│                        │
 │                      │ .set({apiKey})      │                        │
 │                      │                     │                        │
 │ Click "Audit"        │                     │                        │
 ├─────────────────────►│ POST /public/check  │                        │
 │                      │ Authorization: Bearer sk_...                  │
 │                      ├──────────────────────────────────────────────►│
 │                      │ ◄── score + issues + suggestions ─────────────│
```

### 6.3. Storage — `chrome.storage.local` plain (không encrypt khả tín)

API key (`sk_live_...` / `sk_test_...`) được lưu thẳng vào `chrome.storage.local`. Lý do KHÔNG encrypt:
- `chrome.storage.local` đã được Chrome scope theo extension ID — extension khác không đọc được.
- `crypto.subtle` cần key. Key đó cũng phải lưu cùng disk → encryption chỉ là obfuscation, không tăng security thực sự khi attacker có local file access.
- Industry practice (1Password browser ext, Bitwarden ext, GitHub copilot): plain storage, dựa vào browser sandbox.

Threat thật và mitigation:
- **Malware đọc local disk**: không mitigate được bằng encryption (key cũng ở đó). Mitigate bằng cảnh báo trong privacy policy + revoke key dễ dàng từ web UI.
- **Browser sync leak**: dùng `storage.local`, KHÔNG `storage.sync` — sync sẽ đẩy key qua Google account.
- **Content script đọc storage**: content script không có quyền `chrome.storage.local` — chỉ service worker + popup có. ✓
- **XSS qua devtools**: không khác gì localStorage. User mở devtools đã trust mình.

```ts
// apps/extension/lib/storage.ts (skeleton)
export async function saveApiKey(plaintext: string): Promise<void> {
  // Validate prefix: sk_live_... hoặc sk_test_...
  if (!/^sk_(live|test)_[A-Za-z0-9_]+$/.test(plaintext)) {
    throw new Error('Invalid API key format');
  }
  await chrome.storage.local.set({ apiKey: plaintext });
}
export async function loadApiKey(): Promise<string | null> {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  return apiKey ?? null;
}
export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove('apiKey');
}
```

---

## 7. API contract — sử dụng nguyên `POST /api/v1/public/check`

### 7.1. Request từ extension

Hai mode tùy theo trang user đang xem:

**Mode A — URL public (ưu tiên):** Trang user đang xem là public URL. Extension chỉ gửi URL, gateway tự fetch (đảm bảo crawl từ user-agent gateway, fresh).

```json
{
  "input": { "type": "url", "url": "https://example.com/post" },
  "targetKeyword": "seo 2026",
  "options": { "enrichMode": "llm", "language": "vi", "includeSummary": false }
}
```

**Mode B — HTML payload:** Trang yêu cầu auth (CMS admin draft, dashboard) → gateway không crawl được. Extension scrape DOM thành raw HTML, gửi qua field `html`.

```json
{
  "input": { "type": "html", "html": "<!doctype html>...(≤200 KB)..." },
  "targetKeyword": "seo 2026",
  "options": { "enrichMode": "llm", "language": "vi" }
}
```

**Decision rule trong extension** (`apps/extension/lib/scraper.ts`):

```ts
function pickInputMode(tab: chrome.tabs.Tab, dom: Document): PublicCheckInput {
  const url = tab.url!;
  const isPublic = !url.includes('/admin') &&
                   !url.includes('/wp-admin') &&
                   !url.includes('localhost') &&
                   url.startsWith('https://');
  if (isPublic) return { type: 'url', url };
  // Fallback: HTML payload (≤200 KB)
  return { type: 'html', html: serializeHtml(dom) };
}
```

### 7.2. Response (đã chuẩn hóa, xem `docs/public-api/output-schema.md`)

```json
{
  "score": 78,
  "scoreBreakdown": { "content": 85, "meta": 70, "technical": 72, "accessibility": 88 },
  "issues": [
    {
      "ruleId": "title-length",
      "severity": "warning",
      "category": "meta",
      "audience": ["writer"],
      "title": "Title quá ngắn",
      "description": "Title có 25 ký tự, khuyến nghị 50-60.",
      "evidence": { "current": "Cách viết SEO", "currentLength": 25 },
      "suggestion": {
        "type": "rewrite",
        "text": "Cách viết SEO 2026: hướng dẫn chi tiết cho beginner",
        "rationale": "Thêm năm và đối tượng để tăng tính thời sự"
      },
      "docRef": "https://docs/rules/title-length"
    }
  ],
  "summary": null,
  "meta": {
    "inputType": "url",
    "resolvedUrl": "https://example.com/post",
    "contentStats": { "words": 1243, "characters": 8420, "readingTimeSec": 312 },
    "processingTimeMs": 876,
    "ruleVersion": "1.2.0",
    "enrichMode": "llm",
    "suggestionSource": "llm",
    "degraded": false,
    "cached": false,
    "requestId": "req_01HW9...",
    "usage": {
      "remaining": { "minute": 17, "day": 482 },
      "resetAt": { "minute": "...", "day": "..." }
    }
  }
}
```

### 7.3. Error handling (xem `docs/public-api/error-codes.md`)

Extension dispatch theo `code`:

| code | UX action |
|---|---|
| `MISSING_API_KEY` / `INVALID_API_KEY` | Mở options page, hint "Tạo key tại /settings/api-keys" |
| `KEY_DISABLED` | Toast "Tài khoản bị khóa, liên hệ admin" |
| `RATE_LIMIT_EXCEEDED` | Disable nút audit `Retry-After` giây, show countdown từ header |
| `PAYLOAD_TOO_LARGE` | Toast "HTML quá lớn (>200KB), thử mode URL" |
| `URL_FETCH_FAILED` / `URL_FETCH_TIMEOUT` | Auto fallback sang mode HTML |
| `INVALID_URL` | Toast "Trang này không thể audit (private IP / bad URL)" |
| `ANALYZER_UNAVAILABLE` / `SERVICE_UNAVAILABLE` | Toast "Server đang bảo trì, thử lại sau" |
| `INTERNAL` | Generic error + show requestId để user copy báo bug |

### 7.4. Streaming AI fix — bỏ khỏi MVP

`POST /public/check` hiện trả full response (không SSE). Suggestion đã embed trong `issues[].suggestion`. Streaming là **v2 work** — đòi hỏi gateway endpoint mới. Bỏ ra khỏi MVP để giảm scope.

---

## 8. Content scraping (`apps/extension/entrypoints/content.ts`)

Content script chỉ chạy khi user click extension (`activeTab` permission, không passive). Hai trách nhiệm:

1. Lấy URL hiện tại + một số metadata để decide URL-mode hay HTML-mode.
2. Nếu HTML-mode: serialize document thành HTML (giới hạn 200 KB, strip noise).

```ts
// apps/extension/entrypoints/content.ts (skeleton)
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'EXTRACT_FOR_CHECK') {
        sendResponse({
          url: window.location.href,
          isAuthGated: detectAuthGated(),  // url chứa /admin, /dashboard, etc.
          html: msg.needHtml ? serializeMinimalHtml() : null
        });
      }
      return true;
    });
  }
});

function serializeMinimalHtml(): string {
  // Strip <script>, <style>, hidden elements để giảm payload
  // Giữ <head>, <main>, semantic tags
  // Cap 200 KB
}
```

---

## 9. Service worker (`apps/extension/entrypoints/background.ts`)

```ts
// apps/extension/entrypoints/background.ts (skeleton)
import { check } from '../lib/client';
import { loadApiKey } from '../lib/storage';
import { pickInputMode } from '../lib/scraper';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg.type === 'AUDIT_PAGE') {
          const apiKey = await loadApiKey();
          if (!apiKey) {
            sendResponse({ ok: false, code: 'MISSING_API_KEY' });
            chrome.runtime.openOptionsPage();
            return;
          }

          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const probe = await chrome.tabs.sendMessage(tab.id!, {
            type: 'EXTRACT_FOR_CHECK',
            needHtml: false
          });

          let input = pickInputMode(tab, probe);
          if (input.type === 'html') {
            const full = await chrome.tabs.sendMessage(tab.id!, {
              type: 'EXTRACT_FOR_CHECK',
              needHtml: true
            });
            input = { type: 'html', html: full.html };
          }

          const result = await check({
            apiKey,
            body: { input, targetKeyword: msg.targetKeyword, options: msg.options }
          });

          sendResponse({ ok: true, result });
        }
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message, code: (e as any).code });
      }
    })();
    return true;
  });
});
```

`apps/extension/lib/client.ts` follow pattern `seo-check-cli`:

```ts
export async function check(opts: { apiKey: string; body: PublicCheckRequest }) {
  const res = await fetch(`${BASE}/api/v1/public/check`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${opts.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(opts.body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw Object.assign(new Error(err.message), { code: err.code, status: res.status });
  }
  return res.json() as Promise<PublicCheckResponse>;
}
```

---

## 10. Popup UI (React + `@repo/ui`)

```tsx
// apps/extension/entrypoints/popup/App.tsx (skeleton)
import { Button, Card, Badge, Input } from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import type { PublicCheckResponse } from '@repo/shared';

export function App() {
  const [keyword, setKeyword] = useState('');
  const audit = useMutation({
    mutationFn: () =>
      chrome.runtime.sendMessage({
        type: 'AUDIT_PAGE',
        targetKeyword: keyword,
        options: { enrichMode: 'llm', language: 'vi' }
      })
  });

  return (
    <div className="w-[400px] p-4 space-y-3">
      <h2 className="font-semibold">SEO Analyst</h2>
      <Input
        placeholder="Target keyword (vd: seo 2026)"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <Button onClick={() => audit.mutate()} disabled={audit.isPending || !keyword}>
        {audit.isPending ? 'Đang audit...' : 'Audit trang hiện tại'}
      </Button>
      {audit.data?.ok && <ResultView result={audit.data.result} />}
      {audit.data?.ok === false && <ErrorView code={audit.data.code} />}
    </div>
  );
}

function ResultView({ result }: { result: PublicCheckResponse }) {
  return (
    <div className="space-y-2">
      <Card className="p-3 flex justify-between">
        <span>Score</span>
        <Badge variant={result.score >= 80 ? 'default' : 'destructive'}>
          {result.score}/100
        </Badge>
      </Card>
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {result.issues.map((i) => (
          <IssueCard key={i.ruleId} issue={i} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {result.meta.usage.remaining.minute} requests còn / phút
      </p>
    </div>
  );
}

function IssueCard({ issue }: { issue: PublicCheckIssue }) {
  return (
    <Card className={`p-2 border-l-4 border-l-${color(issue.severity)}-500`}>
      <p className="text-sm font-medium">{issue.title}</p>
      <p className="text-xs text-muted-foreground">{issue.description}</p>
      {issue.suggestion && (
        <pre className="text-xs bg-muted p-2 mt-2 whitespace-pre-wrap">
          [{issue.suggestion.type}] {issue.suggestion.text}
          {'\n\n'}
          <em>{issue.suggestion.rationale}</em>
        </pre>
      )}
    </Card>
  );
}
```

---

## 11. Mapping với existing project

### 11.1. Thay đổi cần thiết — chỉ 1 file

| App | Thay đổi |
|---|---|
| **gateway** `apps/gateway/src/main.ts` | CORS allow thêm `chrome-extension://*` cho prefix `/api/v1/public/*`. Hiện CORS hardcode `FRONTEND_URL`. |
| **web** | **Không đổi** — `/settings/api-keys` đã có sẵn từ `feat/seo-public-api`. User dùng trang này tạo key, paste vào extension. |
| **public-api module** | **Không đổi**. |
| **seo-analyzer / crawler / report / keyword-analyzer** | **Không đổi**. |
| **proto** | **Không đổi**. |

### 11.2. Patch CORS gateway

```ts
// apps/gateway/src/main.ts
app.enableCors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server, mobile apps
    if (origin === process.env.FRONTEND_URL) return cb(null, true);
    if (origin.startsWith('chrome-extension://')) return cb(null, true);
    if (origin.startsWith('moz-extension://')) return cb(null, true); // future Firefox
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
});
```

### 11.3. Schema additions — không có

V1 đề xuất `enum AuditSource { WEB, EXTENSION, API }`. Trong v2:
- `/public/check` không tạo `Audit` record (sync, cached qua Redis 24h, không persist). Tracking source = không cần ở DB.
- Nếu cần phân tích usage theo client, dùng `ApiKey.environment` (`live` / `test`) — đã có. Có thể thêm field `User-Agent` parsing nếu cần (post-MVP).

---

## 12. Trade-offs & ADR

### 12.1. Vì sao thin client tuyệt đối (lặp lại từ v1, vẫn đúng)

1. Consistency với web + CLI: cùng 20 rules, cùng score, cùng prompt.
2. Update không cần publish ext (Web Store review 1-3 ngày).
3. Bundle nhỏ (<300 KB) → install/load nhanh.
4. **Trade-off:** thêm latency 500-1500ms. **Mitigation:** loading skeleton, optimistic UI cho field như HTTPS / viewport có thể detect client-side hiển thị instant.

### 12.2. Vì sao API key, không JWT bridge (đã giải thích § 6.1)

### 12.3. Vì sao không tách `apps/ai-fix` microservice

| Cohesion | AI fix logic gắn chặt với rules (cần issue context, severity, evidence). Tách microservice = pass full context qua gRPC = ngược ergonomics. |
| Tái sử dụng | `SuggestionEnricherService` hiện tại đã có cache, concurrency limit, degrade fallback. Tách ra = build lại tất cả. |
| Scale | LLM calls đang được gate bằng concurrency limit (5/key) + Redis cache 24h. Service riêng cho scale = premature. |
| Operational | +1 service = +1 Dockerfile, +1 deploy target, +1 health check, +1 secret. Không justified ở MVP. |
| Cost tracking | `ApiKeyUsage` row đã capture per-key. Provider/cost metering có thể thêm column khi cần, không cần bridge. |

→ Khi nào nên tách: nếu chuyển sang multi-provider (OpenAI + Claude + Gemini) với routing logic phức tạp, hoặc khi LLM traffic > 50% gateway CPU. Hiện chưa.

### 12.4. Workflow tier — MEDIUM, không LARGE

Theo `CLAUDE.md` rule: `proto change || ≥2 apps touched || Prisma migration → MEDIUM minimum`. V2 chạm:
- `apps/extension` (mới)
- `apps/gateway/src/main.ts` (CORS, ~10 dòng)

= 2 apps touched, **không** proto change, **không** Prisma migration → **MEDIUM** vừa đủ. Phase đi qua: `/office-hours` → `gsd:quick` → SP:TDD → `/review` + `e2e:smoke` → commit.

---

## 13. Roadmap (4-5 tuần)

| Tuần | Phase | Output | Tier |
|---|---|---|---|
| 1 | **Skeleton + auth** | `apps/extension` WXT scaffold, options page paste API key + encrypt + save, content script extract URL/HTML, service worker route message. CORS patch gateway. | MEDIUM |
| 2 | **Audit flow E2E** | `lib/client.ts` gọi `/public/check`, popup UI hiển thị score + issues + suggestion từ response. Error code dispatch. | MEDIUM |
| 3 | **UX polish + cache** | Loading states, retry on rate limit (respect `Retry-After`), local cache 1h cho cùng URL+keyword (giảm hit rate limit), auto-fallback URL→HTML mode khi gateway 424. | MEDIUM |
| 4 | **Side panel + i18n** | Side panel cho detailed view (lịch sử audit của tab hiện tại từ `chrome.storage.local`), `_locales/vi` + `_locales/en`. | MEDIUM |
| 5 | **Polish + publish** | Icons, screenshot, store listing, privacy policy, submit Chrome Web Store + Edge Add-ons (cùng codebase, `wxt build -b firefox` cho v2). | SMALL |

V2 backlog: streaming AI fix, team workspace, auto-apply CMS, Firefox port.

---

## 14. Compliance & risks

### 14.1. Privacy

- `host_permissions`: chỉ `https://api.seoanalyst.app/*` (production), không `<all_urls>`.
- `permissions`: `activeTab` + `storage` only. **Không** `tabs`, **không** `webNavigation`, **không** `cookies`.
- DOM scraped chỉ gửi khi user click, không persist client-side ngoài cache 1h.
- API key plaintext encrypted-at-rest qua AES-GCM, key dẫn xuất từ install ID.
- Privacy policy: chỉ nêu DOM/URL gửi qua HTTPS, gateway cache 24h Redis, không log full HTML.

### 14.2. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| User paste sai key (live↔test) | High | Low | Validate prefix (`sk_live_` vs `sk_test_`) khi save; show environment trong popup header |
| Rate limit hit | Med | Med | Local cache 1h, hiện `Retry-After` countdown, suggest user nâng plan |
| Trang lớn → HTML > 200KB | Med | Med | Strip script/style/hidden trước serialize; nếu vẫn quá → fallback URL mode hoặc toast "trang quá lớn" |
| Web Store reject vì permission rộng | Low | High | Permission tối thiểu, justify trong store listing với screenshot dataflow |
| API key leak qua content script | Low | Critical | Key chỉ live trong service worker context, content script không touch storage |
| Gateway down → ext không dùng được | Med | Med | Cached results vẫn hiện được offline, message "Server unreachable, showing cached" |
| `feat/seo-public-api` PR breaking change trước merge | High | High | Pin extension dev branch sau commit ổn định; có integration test gọi staging API |

---

## 15. Open questions

1. **Plan tier**: `feat/seo-public-api` hiện rate-limit 20/min - 500/day cho mọi key. Free vs Pro tier có cần khác biệt? (V2)
2. **Multi-keyword**: `targetKeyword` là single. User SEO thường target 3-5 keyword. Field `secondaryKeywords` đã có (max 5) — UI có cần input phụ? (Tuần 4)
3. **Keyword history**: Lưu top 5 keyword user dùng gần nhất → autocomplete. (Tuần 4)
4. **Filter theo audience**: Endpoint trả `audience: ["writer", "dev"]` cho từng issue. Popup có nên có toggle filter writer/dev không? (Tuần 4)
5. **Cookie / Auth-gated CMS**: WordPress admin set cookie auth, nhưng DOM scrape vẫn lấy được. Có CMS nào render content qua iframe / shadow DOM không lấy được? Cần khảo sát top 5 CMS (WP, Webflow, Ghost, Shopify, Notion).
6. **Anonymous / no-key mode**: Có cho user dùng không key (limited features) để conversion không? V2.

---

## 16. Tham khảo

- v1 doc: `docs/chrome-extension-design.md` (tham khảo nhưng không follow architecture)
- Public API docs (đã có trên `feat/seo-public-api`): `docs/public-api/{getting-started,output-schema,error-codes,rate-limits,input-types}.md`
- CLI tham khảo: `packages/seo-check-cli/`
- AI core: `packages/seo-ai-core/ANALYSIS.md`
- Service map: `apps/CLAUDE.md`
- Per-service DDD: `apps/gateway/CLAUDE.md`
- WXT docs: https://wxt.dev/
- Manifest V3: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
