# Chrome Extension cho SEO-Analyst — Design Document

> Tài liệu thiết kế Chrome Extension hoạt động như **thin client** của hệ thống SEO-Analyst, tận dụng toàn bộ backend microservices hiện có (gateway → crawler → seo-analyzer → keyword-analyzer → report) và bổ sung microservice mới `ai-fix` để cung cấp AI suggestion / fix.
>
> **Phiên bản:** 1.0
> **Ngày:** 2026-04-29
> **Phạm vi:** Phần mở rộng cho dự án SEO-Analyst (Đồ án tốt nghiệp).

---

## 1. Mục tiêu & vai trò trong hệ thống

### 1.1. Tại sao cần Chrome Extension?

Web app SEO-Analyst (Next.js) yêu cầu user copy URL → paste vào dashboard → đợi crawl → xem report. Chrome Extension rút ngắn flow xuống còn **1 click trên trang user đang xem** — UX gần với Yoast / Ahrefs Browser Extension / SEO Meta in 1 Click.

Use case chính:

- User đang đọc bài blog của họ → click extension → audit ngay → thấy issue → click "Fix với AI" → nhận gợi ý.
- SEO consultant đang review trang khách hàng → quick audit không cần đăng nhập web app.
- Content writer đang viết draft → check on-page SEO ngay trên CMS (WordPress, Webflow, Shopify admin).

### 1.2. Kiến trúc tổng quan — Thin Client

```
┌──────────────────────────────────┐
│   Chrome Extension (apps/extension)│
│   - Scrape DOM trang user         │
│   - Hiển thị checklist UI         │
│   - Auth bằng JWT (từ web app)    │
└──────────────────┬───────────────┘
                   │ HTTPS REST
                   ▼
┌────────────────────────────────────────┐
│  GATEWAY (apps/gateway:3000)            │
│  - JWT validate                          │
│  - Rate limit theo plan                  │
│  - Orchestrate các service qua gRPC      │
└────────────────────┬───────────────────┘
                     │ gRPC
        ┌────────────┼─────────────┬──────────────┐
        ▼            ▼             ▼              ▼
 ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐
 │ crawler   │ │ seo-      │ │ keyword-   │ │ ai-fix   │
 │ :50052    │ │ analyzer  │ │ analyzer   │ │ :50056   │
 │           │ │ :50053    │ │ :50054     │ │ (NEW)    │
 │ Playwright│ │ 20 rules  │ │ TF/density │ │ Claude/  │
 │ Lighthouse│ │ + Prisma  │ │ stateless  │ │ OpenAI/  │
 │           │ │           │ │            │ │ Gemini   │
 └───────────┘ └───────────┘ └────────────┘ └──────────┘
                                                  │
                                            ┌─────▼─────┐
                                            │ Redis     │
                                            │ cache +   │
                                            │ rate limit│
                                            └───────────┘
```

**Nguyên tắc chính:** Extension **không tự ý chạy AI hay rules nặng** — toàn bộ logic ở backend để:

- Đảm bảo consistency giữa web app và extension (cùng 20 rules, cùng score formula).
- Quản lý API key Claude/OpenAI tập trung ở `ai-fix` (không leak qua extension).
- Tracking usage / billing dễ dàng (mọi request đi qua gateway).
- Update rules không cần publish version mới của extension.

---

## 2. Vị trí trong monorepo

### 2.1. Đặt ở `apps/extension`

```
SEO-Analysts/
├── apps/
│   ├── gateway/             (hiện có)
│   ├── crawler/             (hiện có)
│   ├── seo-analyzer/        (hiện có)
│   ├── keyword-analyzer/    (hiện có)
│   ├── report/              (hiện có)
│   ├── ai-fix/              ◄── MỚI (microservice gRPC :50056)
│   ├── web/                 (Next.js — pending)
│   └── extension/           ◄── MỚI (Chrome extension MV3)
│       ├── manifest.json
│       ├── src/
│       │   ├── background/   service worker
│       │   ├── content/      DOM scraper
│       │   ├── popup/        React popup
│       │   ├── sidepanel/    React side panel
│       │   ├── options/      settings page
│       │   └── shared/       SDK gọi gateway, types
│       ├── public/icons/
│       ├── tsconfig.json     extends @repo/typescript-config/base
│       ├── package.json      depends on @repo/shared, @repo/proto-types
│       ├── vite.config.ts    build với @crxjs/vite-plugin
│       └── CLAUDE.md
├── packages/
│   ├── shared/              (hiện có) — types dùng chung
│   ├── proto/               (hiện có) — proto definitions
│   ├── ui/                  (hiện có) — shadcn primitives
│   └── extension-sdk/       ◄── MỚI (optional) — typed SDK gọi gateway
└── turbo.json
```

### 2.2. Build pipeline

Extension là **TypeScript + Vite + @crxjs/vite-plugin** (build tool tốt nhất hiện nay cho MV3 — hỗ trợ HMR cho content/popup, auto-reload extension khi save).

**`apps/extension/package.json`:**

```json
{
  "name": "@apps/extension",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint src",
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
    "@crxjs/vite-plugin": "^2.0.0",
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/chrome": "^0.0.260",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**`apps/extension/turbo.json` (hoặc thêm vào root `turbo.json`):**

```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": ["dist/**"],
      "dependsOn": ["^build"]
    }
  }
}
```

---

## 3. Auth flow — JWT qua web app

### 3.1. Vì sao chọn flow này

User đã login vào web app SEO-Analyst (Next.js) → extension chỉ cần **inject auth qua web app**, không tự xử lý OAuth. Đây là pattern Yoast, Ahrefs đang dùng.

### 3.2. Sequence diagram

```
User              Extension          Web App           Gateway
 │                    │                 │                 │
 │  Click extension   │                 │                 │
 ├───────────────────►│                 │                 │
 │                    │ Check JWT       │                 │
 │                    │ trong storage   │                 │
 │                    │ ─── miss ────   │                 │
 │                    │                 │                 │
 │                    │ Open tab login  │                 │
 │                    ├────────────────►│                 │
 │                    │                 │                 │
 │  Đăng nhập         │                 │                 │
 ├──────────────────────────────────────►                 │
 │                    │                 │ POST /auth/login│
 │                    │                 ├────────────────►│
 │                    │                 │ ◄── JWT ────────│
 │                    │                 │                 │
 │                    │ window.postMessage(jwt) qua content script │
 │                    │◄────────────────┤                 │
 │                    │ Lưu chrome.storage.local          │
 │                    │                 │                 │
 │  Audit page        │                 │                 │
 ├───────────────────►│ Authorization: Bearer <jwt>       │
 │                    ├──────────────────────────────────►│
 │                    │ ◄── audit result ─────────────────│
```

### 3.3. Implementation

**Bước 1:** Web app SEO-Analyst (Next.js) thêm route `/extension/auth-bridge`:

```tsx
// apps/web/app/extension/auth-bridge/page.tsx
'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function AuthBridge() {
  const { token, user } = useAuth();
  useEffect(() => {
    if (!token) return;
    // Gửi message tới extension. Extension lắng nghe qua chrome.runtime.onMessageExternal
    window.postMessage(
      { type: 'SEO_ANALYST_AUTH', token, user },
      window.location.origin
    );
    // Hoặc dùng chrome.runtime.sendMessage nếu extension có "externally_connectable"
  }, [token]);
  return <p>Đang kết nối extension... có thể đóng tab này.</p>;
}
```

**Bước 2:** Extension manifest khai báo `externally_connectable`:

```json
{
  "externally_connectable": {
    "matches": [
      "https://seoanalyst.app/*",
      "https://*.seoanalyst.app/*",
      "http://localhost:3000/*"
    ]
  }
}
```

**Bước 3:** Web app gửi token bằng `chrome.runtime.sendMessage`:

```tsx
// apps/web/app/extension/auth-bridge/page.tsx
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID!;

useEffect(() => {
  if (!token || !window.chrome?.runtime) return;
  window.chrome.runtime.sendMessage(
    EXTENSION_ID,
    { type: 'SEO_ANALYST_AUTH', token, user },
    (response) => {
      if (response?.ok) window.close();
    }
  );
}, [token]);
```

**Bước 4:** Extension service worker nhận và lưu:

```ts
// apps/extension/src/background/auth.ts
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (sender.origin !== 'https://seoanalyst.app' &&
      !sender.origin?.endsWith('.seoanalyst.app') &&
      sender.origin !== 'http://localhost:3000') {
    sendResponse({ ok: false, error: 'Unauthorized origin' });
    return;
  }
  if (message.type === 'SEO_ANALYST_AUTH') {
    chrome.storage.local.set({
      auth: { token: message.token, user: message.user, ts: Date.now() }
    });
    sendResponse({ ok: true });
  }
});
```

**Bước 5:** SDK gọi gateway tự attach JWT:

```ts
// apps/extension/src/shared/sdk.ts
import type { AuditResult, AuditRequest } from '@repo/shared/types';

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_URL!;

async function getToken(): Promise<string | null> {
  const { auth } = await chrome.storage.local.get('auth');
  return auth?.token ?? null;
}

export async function audit(req: AuditRequest): Promise<AuditResult> {
  const token = await getToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch(`${GATEWAY_BASE}/api/v1/audit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req)
  });

  if (res.status === 401) {
    await chrome.storage.local.remove('auth');
    throw new Error('TOKEN_EXPIRED');
  }
  if (!res.ok) throw new Error(`Audit failed: ${res.status}`);
  return res.json();
}

export async function getAIFix(issueId: string, auditId: string) {
  const token = await getToken();
  const res = await fetch(`${GATEWAY_BASE}/api/v1/ai-fix`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ issueId, auditId })
  });
  return res.json();
}
```

---

## 4. API Contract — Gateway endpoints cho extension

### 4.1. `POST /api/v1/audit` — chạy audit toàn diện

**Request:**

```json
{
  "url": "https://example.com/blog/post-1",
  "scrapedDom": {
    "title": "...",
    "metaDescription": "...",
    "headings": { "h1": ["..."], "h2": [...] },
    "images": [{ "src": "...", "alt": "..." }],
    "jsonLd": [...]
  },
  "options": {
    "includeLighthouse": true,
    "includeKeywordAnalysis": false
  }
}
```

> **Lưu ý:** Extension gửi DOM đã scrape ở client để **bypass crawler** trong trường hợp trang yêu cầu auth (extension đang trong context user đăng nhập, crawler không vào được). Gateway sẽ:
> - Ưu tiên dùng `scrapedDom` nếu có (skip crawler).
> - Vẫn gọi `crawler` cho Lighthouse (vì cần fresh fetch để đo Core Web Vitals).
> - Gọi `seo-analyzer` để chạy 20 rules trên dữ liệu đã có.

**Response:**

```json
{
  "auditId": "aud_01HXY...",
  "url": "...",
  "score": 78,
  "scoreBreakdown": {
    "onPage": 82,
    "technical": 70,
    "performance": 75,
    "structuredData": 90
  },
  "issues": [
    {
      "id": "iss_01HXY...",
      "ruleId": "title-length",
      "severity": "important",
      "category": "on-page",
      "title": "Title quá dài (72 ký tự)",
      "description": "Title của bạn vượt quá 60 ký tự, có thể bị Google cắt.",
      "currentValue": "...",
      "evidence": { "length": 72, "limit": 60 },
      "fixable": true
    }
  ],
  "lighthouse": { "lcp": 2.1, "inp": 145, "cls": 0.05 },
  "ts": "2026-04-29T..."
}
```

### 4.2. `POST /api/v1/ai-fix` — yêu cầu AI suggest fix

**Request:**

```json
{
  "auditId": "aud_01HXY...",
  "issueId": "iss_01HXY...",
  "preferences": {
    "tone": "professional",
    "language": "vi",
    "model": "auto"
  }
}
```

**Response (streaming SSE — tận dụng pattern LangGraph + SSE đã có):**

```
event: token
data: {"text":"Đề xuất "}

event: token
data: {"text":"rút gọn title "}

event: result
data: {
  "fix": {
    "type": "rewrite",
    "field": "title",
    "before": "Hướng dẫn chi tiết...",
    "after": "Hướng dẫn SEO 2026: 10 bước",
    "reasoning": "..."
  },
  "model": "claude-sonnet-4-6",
  "usage": { "input": 1240, "output": 89 }
}

event: done
```

### 4.3. `GET /api/v1/audit/:id/history` — lịch sử audit cùng URL

Cho phép extension hiển thị "Lần audit trước score 65, nay 78 (+13)".

### 4.4. `POST /api/v1/audit/:id/apply-fix` — apply fix (optional, nâng cao)

Nếu user dùng CMS có integration (WordPress, Webflow), gateway có thể lưu fix vào hệ thống đợi user confirm.

---

## 5. Microservice mới: `apps/ai-fix`

### 5.1. Trách nhiệm

- Nhận request từ gateway (gRPC) với issue + context.
- Chọn AI provider theo plan của user (free / pro / enterprise).
- Gọi Claude/OpenAI với prompt template chuyên biệt cho từng loại issue.
- Stream kết quả về gateway → SSE đến extension.
- Cache prompt + response (Redis 24h) để tiết kiệm cost.
- Track token usage per user → enforce rate limit.

### 5.2. Cấu trúc DDD

```
apps/ai-fix/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── fix-request.entity.ts
│   │   │   └── ai-provider.entity.ts
│   │   ├── value-objects/
│   │   │   ├── prompt-template.vo.ts
│   │   │   └── token-usage.vo.ts
│   │   └── services/
│   │       └── prompt-builder.service.ts
│   ├── application/
│   │   ├── commands/
│   │   │   └── generate-fix.handler.ts
│   │   └── queries/
│   │       └── get-usage.handler.ts
│   ├── infrastructure/
│   │   ├── providers/
│   │   │   ├── claude.provider.ts
│   │   │   ├── openai.provider.ts
│   │   │   └── provider.factory.ts
│   │   ├── cache/
│   │   │   └── redis-fix-cache.ts
│   │   └── grpc/
│   │       └── ai-fix.grpc.controller.ts
│   ├── presentation/
│   │   └── grpc/
│   │       └── ai-fix.proto.ts
│   ├── app.module.ts
│   └── main.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 5.3. Provider abstraction (NestJS pattern)

```ts
// apps/ai-fix/src/infrastructure/providers/provider.interface.ts
export interface AIProvider {
  name: string;
  generateFix(prompt: string, options?: GenerateOptions): AsyncIterable<FixToken>;
  estimateCost(prompt: string): number;
}

@Injectable()
export class ClaudeProvider implements AIProvider {
  name = 'claude';
  constructor(@Inject('ANTHROPIC_CLIENT') private client: Anthropic) {}

  async *generateFix(prompt: string, options?: GenerateOptions) {
    const stream = await this.client.messages.stream({
      model: options?.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SEO_FIX_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        yield { type: 'token', text: chunk.delta.text };
      }
    }
    const final = await stream.finalMessage();
    yield { type: 'result', usage: final.usage };
  }

  estimateCost(prompt: string) {
    const inputTokens = Math.ceil(prompt.length / 4);
    return (inputTokens / 1_000_000) * 1.0 + 0.02; // Haiku 4.5
  }
}

@Injectable()
export class ProviderFactory {
  constructor(
    private claude: ClaudeProvider,
    private openai: OpenAIProvider
  ) {}

  selectFor(plan: 'free' | 'pro' | 'enterprise', preference?: string): AIProvider {
    if (plan === 'free') return this.openai; // GPT-5.4 Nano rẻ nhất
    if (preference === 'claude') return this.claude;
    if (preference === 'openai') return this.openai;
    return this.claude; // Default Pro: Claude Sonnet/Haiku
  }
}
```

### 5.4. Proto definition (`packages/proto/ai_fix.proto`)

```proto
syntax = "proto3";
package ai_fix.v1;

service AIFixService {
  rpc GenerateFix(GenerateFixRequest) returns (stream FixChunk);
}

message GenerateFixRequest {
  string audit_id = 1;
  string issue_id = 2;
  string user_id = 3;
  string plan = 4;
  Issue issue = 5;
  AuditContext context = 6;
  Preferences preferences = 7;
}

message Issue {
  string rule_id = 1;
  string severity = 2;
  string title = 3;
  string description = 4;
  string current_value = 5;
}

message AuditContext {
  string url = 1;
  string title = 2;
  string meta_description = 3;
  repeated string h1 = 4;
}

message Preferences {
  string tone = 1;
  string language = 2;
  string model = 3;
}

message FixChunk {
  oneof payload {
    Token token = 1;
    Result result = 2;
  }
}

message Token { string text = 1; }
message Result {
  string before = 1;
  string after = 2;
  string reasoning = 3;
  string model = 4;
  Usage usage = 5;
}
message Usage { int32 input_tokens = 1; int32 output_tokens = 2; }
```

### 5.5. Rate limit & quota

Tận dụng Redis hiện có:

```ts
// Pseudo
const dailyKey = `ai-fix:quota:${userId}:${today}`;
const limit = plan === 'free' ? 5 : plan === 'pro' ? 100 : Infinity;
const used = await redis.incr(dailyKey);
if (used === 1) await redis.expire(dailyKey, 86400);
if (used > limit) throw new TooManyRequestsException(`Hết quota ${plan}`);
```

---

## 6. Content Script — DOM scraping cho extension

Extension scrape DOM ở client (giống version standalone), nhưng **chỉ format dữ liệu**, không chạy rules. Output match đúng schema mà gateway expect.

```ts
// apps/extension/src/content/scraper.ts
import type { ScrapedDom } from '@repo/shared/types';

export function scrapePage(): ScrapedDom {
  const meta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;
  const og = (prop: string) =>
    document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`)?.content ?? null;

  return {
    url: window.location.href,
    protocol: window.location.protocol,
    lang: document.documentElement.lang,
    title: document.title,
    metaDescription: meta('description'),
    metaRobots: meta('robots'),
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
    viewport: meta('viewport'),
    og: {
      title: og('og:title'),
      description: og('og:description'),
      image: og('og:image'),
      type: og('og:type')
    },
    twitter: {
      card: meta('twitter:card'),
      title: meta('twitter:title')
    },
    headings: Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map(i => [
        `h${i}`,
        Array.from(document.querySelectorAll(`h${i}`)).map(h => h.textContent?.trim() ?? '')
      ])
    ),
    images: Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
      hasLazy: img.loading === 'lazy',
      hasDimensions: !!img.width && !!img.height
    })),
    jsonLd: Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))
      .map(s => { try { return JSON.parse(s.textContent ?? ''); } catch { return null; } })
      .filter(Boolean),
    wordCount: document.body.innerText.split(/\s+/).filter(Boolean).length,
    internalLinks: Array.from(document.querySelectorAll('a[href]')).filter(
      a => (a as HTMLAnchorElement).hostname === window.location.hostname
    ).length,
    externalLinks: Array.from(document.querySelectorAll('a[href]')).filter(
      a => (a as HTMLAnchorElement).hostname !== window.location.hostname
    ).length,
    rawHtmlLength: document.documentElement.outerHTML.length
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SCRAPE_PAGE') {
    sendResponse(scrapePage());
  }
  return true;
});
```

> **Type sharing:** `ScrapedDom`, `AuditResult`, `Issue` đặt trong `packages/shared/src/types/` để cả `apps/extension`, `apps/gateway`, `apps/seo-analyzer` cùng dùng — tránh lệch contract.

---

## 7. Service Worker — Orchestration

```ts
// apps/extension/src/background/index.ts
import { audit, getAIFix } from '../shared/sdk';
import './auth';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'AUDIT_PAGE') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) throw new Error('No active tab');

        // 1. Scrape DOM ở content script
        const scrapedDom = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });

        // 2. Gọi gateway
        const result = await audit({
          url: tab.url!,
          scrapedDom,
          options: { includeLighthouse: msg.includeLighthouse ?? false }
        });

        // 3. Cache để hiển thị nhanh lần sau
        await chrome.storage.local.set({
          [`audit:${tab.url}`]: { result, ts: Date.now() }
        });
        sendResponse({ ok: true, result });
      } else if (msg.type === 'AI_FIX_STREAM') {
        // Streaming SSE — service worker không hỗ trợ EventSource trực tiếp,
        // nên dùng fetch() + reader.read() để streaming
        const response = await fetch(`${GATEWAY}/api/v1/ai-fix`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ auditId: msg.auditId, issueId: msg.issueId })
        });
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const ev of events) {
            // forward về popup qua port message
            chrome.runtime.sendMessage({ type: 'AI_FIX_CHUNK', data: ev });
          }
        }
        sendResponse({ ok: true });
      }
    } catch (e) {
      sendResponse({ ok: false, error: (e as Error).message });
    }
  })();
  return true; // async response
});
```

---

## 8. Popup UI (React + shadcn)

Tận dụng `@repo/ui` — extension popup là React app dùng cùng design tokens với web app.

```tsx
// apps/extension/src/popup/App.tsx
import { useState } from 'react';
import { Button, Card, Badge } from '@repo/ui';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { AuditResult } from '@repo/shared/types';

export function App() {
  const [auditing, setAuditing] = useState(false);
  const auditMutation = useMutation({
    mutationFn: () => chrome.runtime.sendMessage({ type: 'AUDIT_PAGE' }),
  });

  if (auditMutation.isPending) return <p>Đang phân tích...</p>;
  if (!auditMutation.data) {
    return (
      <div className="w-[380px] p-4">
        <h2 className="font-semibold mb-3">SEO Analyst</h2>
        <Button onClick={() => auditMutation.mutate()}>
          Audit trang hiện tại
        </Button>
      </div>
    );
  }

  const result: AuditResult = auditMutation.data.result;
  return (
    <div className="w-[380px] p-4 space-y-3">
      <Card className="p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">SEO Score</span>
          <Badge variant={result.score >= 80 ? 'default' : 'destructive'}>
            {result.score}/100
          </Badge>
        </div>
      </Card>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {result.issues.map(issue => (
          <IssueCard key={issue.id} issue={issue} auditId={result.auditId} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue, auditId }: { issue: Issue; auditId: string }) {
  const [fix, setFix] = useState<string>('');
  const fixMutation = useMutation({
    mutationFn: async () => {
      // listen for streaming chunks
      const port = chrome.runtime.connect({ name: 'ai-fix' });
      port.postMessage({ type: 'AI_FIX_STREAM', auditId, issueId: issue.id });
      port.onMessage.addListener((m) => {
        if (m.type === 'AI_FIX_CHUNK') setFix(prev => prev + m.text);
      });
    }
  });
  return (
    <Card className={`p-2 border-l-4 border-l-${severityColor(issue.severity)}-500`}>
      <p className="text-sm font-medium">{issue.title}</p>
      <p className="text-xs text-muted-foreground">{issue.description}</p>
      {issue.fixable && (
        <Button size="sm" variant="outline" onClick={() => fixMutation.mutate()}>
          Fix với AI
        </Button>
      )}
      {fix && <pre className="text-xs bg-muted p-2 mt-2 whitespace-pre-wrap">{fix}</pre>}
    </Card>
  );
}
```

---

## 9. Mapping với existing project

### 9.1. Chỉnh sửa cần thiết ở các app hiện có

| App | Thay đổi |
|-----|----------|
| **gateway** | + Endpoint `/api/v1/audit` accept `scrapedDom` (skip crawler nếu có). + Endpoint `/api/v1/ai-fix` (SSE proxy gRPC stream từ ai-fix). + CORS allow `chrome-extension://<id>`. + Rate limit middleware đếm theo `userId`. |
| **crawler** | Không đổi. Chỉ cần expose mode "lighthouse-only" (không crawl HTML, chỉ measure CWV) cho case extension đã có DOM. |
| **seo-analyzer** | Refactor service nhận `ScrapedDom` từ gateway thay vì luôn nhận từ crawler. Thêm field `scrapedDomCompatible: true` cho từng rule (rule cần raw HTML mark là false). |
| **keyword-analyzer** | Không đổi (đã stateless). |
| **report** | Optional: thêm flag `source: 'extension' \| 'web'` vào audit metadata để tracking. |
| **web (Next.js)** | Thêm route `/extension/auth-bridge` để gửi JWT cho extension. Thêm dashboard hiển thị "Audit từ extension" tách riêng. |

### 9.2. Schema additions (Prisma)

`apps/seo-analyzer/prisma/schema.prisma`:

```prisma
model Audit {
  id        String   @id @default(cuid())
  userId    String
  url       String
  source    AuditSource @default(WEB)
  score     Int
  issues    Issue[]
  ...
}

enum AuditSource {
  WEB
  EXTENSION
  API
}
```

`apps/gateway/prisma/schema.prisma` (DB `seo_gateway`):

```prisma
model AIFixUsage {
  id          String   @id @default(cuid())
  userId      String
  auditId     String
  issueId     String
  provider    String
  inputTokens Int
  outputTokens Int
  costCents   Int
  createdAt   DateTime @default(now())
  @@index([userId, createdAt])
}
```

---

## 10. Trade-off & quyết định kiến trúc (ADR-style)

### 10.1. Vì sao thin client mà không hybrid?

**Phương án thay thế:** chạy 70-80% rules ở client, gọi backend chỉ khi cần Lighthouse + AI.

**Quyết định:** Thin client hoàn toàn vì:

1. **Consistency** — score giữa web app và extension phải bằng nhau. Nếu duplicate logic ở client, mọi thay đổi rule phải sync 2 nơi.
2. **Update speed** — fix bug trong rule chỉ cần redeploy `seo-analyzer`, không cần publish extension version mới và đợi user update.
3. **Code size** — bundle extension < 500KB là quan trọng cho UX (load nhanh, install nhanh).
4. **Trade-off mất:** thêm latency 200-500ms cho mỗi audit (so với chạy local). **Mitigation:** show skeleton UI ngay, dùng optimistic UI cho các check đơn giản (HTTPS, viewport).

### 10.2. Vì sao tách `ai-fix` thành microservice riêng?

| Tiêu chí | Module trong seo-analyzer | Microservice riêng |
|----------|---------------------------|---------------------|
| Cohesion | Gần với rules — có thể đọc rule context dễ | Tách bạch: rules là deterministic, AI là probabilistic |
| Cost tracking | Phải thêm logic trong seo-analyzer | Tự nhiên — có service riêng để metering |
| Scale | Phải scale cả seo-analyzer khi AI tăng load | Scale riêng — AI request thường spiky |
| Fail isolation | AI provider down → ảnh hưởng audit | AI down → audit vẫn chạy bình thường, chỉ "Fix với AI" disable |
| Multi-provider | Khó | Dễ — provider abstraction nằm trong service |

**Quyết định:** Microservice riêng. Theo CLAUDE.md project quy ước: **"Any change in @repo/proto or ≥2 apps → LARGE + proto-breaking"** — nên việc add `ai-fix` cần PR riêng, theo workflow LARGE.

### 10.3. Vì sao JWT thay vì API key?

API key tiện cho CI/CD nhưng UX kém với end-user. JWT từ web app cho UX seamless. **Tương lai:** có thể bổ sung API key cho enterprise / CLI tool — generate trong dashboard, lưu hashed trong DB.

---

## 11. Roadmap (8 tuần) — adapted

| Tuần | Phase | Output | Owner skill |
|------|-------|--------|-------------|
| 1 | Setup | `apps/extension` skeleton (Vite + crxjs + React), `apps/ai-fix` skeleton (NestJS + gRPC) | frontend + backend |
| 2 | Auth flow | Web app `/extension/auth-bridge`, extension `externally_connectable`, JWT lưu storage | backend + frontend |
| 3 | API contract | `packages/proto/ai_fix.proto`, types trong `@repo/shared`, gateway `/api/v1/audit` accept `scrapedDom` | backend |
| 4 | Audit flow E2E | Content script scrape → gateway → seo-analyzer (skip crawler) → return result → popup hiển thị | full stack |
| 5 | AI fix #1 | `ai-fix` service với Claude provider, gRPC stream, gateway SSE proxy | backend |
| 6 | AI fix #2 | OpenAI provider, model selection theo plan, Redis cache, quota | backend |
| 7 | UX polish | Side panel, history, export PDF (gọi `report` service), settings | frontend |
| 8 | Publish | Privacy policy, store listing, icon, submit Chrome Web Store, Edge Add-ons | full stack |

### 11.1. Workflow tier (theo CLAUDE.md)

- Phase 1, 2, 3, 5, 6 → **LARGE** (proto change, ≥2 apps touched, new microservice).
- Phase 4, 7 → **MEDIUM** (single-service hoặc cross-service nhỏ).
- Phase 8 → **SMALL** (config + assets).

Mỗi LARGE phase đi qua đầy đủ: `/office-hours` → `gsd:discuss` → `gsd:plan` → `gsd:execute` (TDD) → `/review` + `/cso` + `/qa` + e2e:smoke + proto typecheck → `/ship` → `/canary`.

---

## 12. Compliance & risks

### 12.1. Privacy

- Manifest khai báo `host_permissions` chỉ `https://api.seoanalyst.app/*` (không cần `<all_urls>`).
- Permission `activeTab` (chỉ scrape khi user click icon — không passive tracking).
- Privacy policy nêu rõ: DOM scraped **không persist**, gửi qua HTTPS, gateway lưu kết quả trong 30 ngày, có endpoint xóa.
- Không thu thập cookie / local storage của trang user.

### 12.2. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Chrome Web Store reject vì permission rộng | Med | High | Permission tối thiểu, justify trong store listing |
| User trả tiền AI nhiều → bill shock | Med | Med | Hard quota theo plan, alert khi gần hết, prompt cache 90% |
| Extension xung đột với CSP của trang | Low | Low | Content script chỉ đọc DOM, không inject inline |
| JWT expired giữa session | High | Low | Auto refresh qua silent re-auth, fallback open tab login |
| Rule update breaking extension cũ | Med | Med | Versioned API (`/api/v1/...`), backward compat 6 tháng |

---

## 13. Câu hỏi mở

1. **Edge / Firefox port:** Đầu tư từ đầu hay v2? — Đề xuất v2, bundle Vite có thể cross-build dễ.
2. **Offline mode:** Cache lần audit gần nhất để hiển thị offline? — Optional, dùng `chrome.storage.local`.
3. **Team workspace:** Extension cho team có shared audit history? — V2.
4. **Auto-fix CMS:** Apply fix trực tiếp lên WordPress/Webflow qua API của CMS? — V2, cần OAuth riêng cho từng CMS.

---

## 14. Tham khảo

- [Manifest V3 | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [externally_connectable — chrome.runtime](https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
- [Anthropic API Pricing 2026](https://www.finout.io/blog/anthropic-api-pricing)
- [The Prompt API | AI on Chrome](https://developer.chrome.com/docs/ai/prompt-api)
- [On-Page SEO Checklist 2026 | DebugBear](https://www.debugbear.com/blog/technical-seo-checklist)
- Existing project docs: `docs/seo-tool-strategy.md`, `apps/CLAUDE.md` (per-service DDD), `.claude/skills/seo-rules/SKILL.md`

---

## Tóm tắt thay đổi so với version standalone

| Thành phần | Standalone | SEO-Analyst integrated |
|-----------|-----------|------------------------|
| **Logic check rules** | Trong extension | Trong `seo-analyzer` service |
| **AI provider** | BYOK trong extension | Tập trung ở `ai-fix` service |
| **API key** | User tự nhập | Service-side, billed via plan |
| **Auth** | None / API key | JWT từ web app login |
| **Lighthouse** | Không có | Crawler service (mode lighthouse-only) |
| **History** | chrome.storage local | Postgres (seo_analyzer DB) |
| **Update rules** | Republish extension | Deploy seo-analyzer |
| **Code location** | Repo riêng | `apps/extension` trong monorepo |
| **Bundle size** | ~2MB (rules + AI SDK) | <500KB (chỉ UI + SDK) |
| **Latency** | ~50ms local | ~300-800ms (1 round-trip) |
| **Privacy** | 100% local | DOM scraped → gateway HTTPS |
| **Cost user** | User trả AI | Plan SaaS, có free tier |

Version integrated phù hợp hơn cho SaaS thực thụ — đồng nhất giữa web/extension, dễ scale, dễ monetize. Version standalone phù hợp cho open-source / privacy-first niche.
