# Research: Chrome Extension cho SEO Checklist + AI Suggest/Fix

> Tài liệu research kỹ thuật chi tiết cho dự án xây dựng Chrome Extension hoạt động như một công cụ SEO checklist, có khả năng phát hiện issue và đề xuất fix bằng AI.
>
> **Ngày:** 2026-04-29
> **Mục tiêu:** Hiểu nền tảng Chrome Extension (Manifest V3), kiến trúc, API, và lựa chọn AI provider phù hợp để build sản phẩm.

---

## 1. Chrome Extension hoạt động dựa trên gì?

### 1.1. Nền tảng kỹ thuật cốt lõi

Chrome Extension về bản chất là **một web app đặc biệt** chạy bên trong trình duyệt Chrome (và các browser dùng Chromium như Edge, Brave, Arc, Opera). Nó được xây dựng từ các công nghệ web tiêu chuẩn:

- **HTML** — cho UI (popup, options page, side panel, devtools panel)
- **CSS** — cho styling
- **JavaScript** (hoặc TypeScript compile sang JS) — cho logic
- **JSON** — cho file `manifest.json` (file mô tả extension)

Khác biệt lớn nhất với một web app thông thường: extension có thể truy cập **Chrome Extension APIs** (namespace `chrome.*`) để tương tác với trình duyệt — đọc tab hiện tại, inject code vào trang web, lưu dữ liệu, hiển thị notification, mở side panel, v.v.

### 1.2. Manifest V3 — chuẩn bắt buộc từ 2024-2026

Chrome đã chính thức **deprecate Manifest V2** — từ 2026 tất cả extension mới và cũ phải dùng **Manifest V3** (MV3). Đây là điểm bắt đầu cho mọi dự án mới.

Những thay đổi quan trọng của MV3 so với MV2:

| Thành phần | Manifest V2 | Manifest V3 |
|------------|-------------|-------------|
| Background script | Persistent background page | **Service Worker** (event-driven, ngủ khi idle) |
| Remote code | Cho phép load từ CDN | **Cấm** — toàn bộ code phải đóng gói trong extension |
| Permissions | `permissions` chung | Tách `permissions` và `host_permissions` |
| Web request | Block requests trực tiếp | Phải dùng **Declarative Net Request** API |
| CSP | Nới lỏng | Strict — không cho `eval`, không cho inline script |

### 1.3. Kiến trúc 4 thành phần chính

Một Chrome Extension điển hình có 4 phần, mỗi phần chạy trong một context (process) riêng và giao tiếp qua **Message Passing API**:

```
┌─────────────────────────────────────────────────────────────┐
│                         CHROME BROWSER                       │
│                                                              │
│  ┌────────────────┐         ┌─────────────────────────────┐ │
│  │  POPUP UI      │         │   CONTENT SCRIPT            │ │
│  │  (popup.html)  │         │   (chạy trong context của   │ │
│  │  - React/HTML  │◄───────►│    trang web user đang xem) │ │
│  │  - Hiện kết quả│ message │   - Đọc DOM                 │ │
│  └────────────────┘         │   - Lấy meta, headings, alt │ │
│         ▲                   └─────────────────────────────┘ │
│         │ message                       ▲                    │
│         ▼                               │ message            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           SERVICE WORKER (background.js)             │    │
│  │  - Event-driven (chạy khi cần, ngủ khi idle)         │    │
│  │  - Gọi external API (Claude/OpenAI/Lighthouse...)    │    │
│  │  - Quản lý chrome.storage                            │    │
│  │  - Lắng nghe events: install, alarm, message...      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   OPTIONS PAGE / SIDE PANEL (optional)               │    │
│  │   - Settings: API key, custom rules                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Vai trò từng thành phần (cho ngữ cảnh SEO Checklist):**

- **Content Script:** Inject vào trang user đang xem để **scrape DOM** — lấy `<title>`, meta tags, heading structure, image `alt`, schema JSON-LD, internal/external links, word count.
- **Service Worker:** Là "bộ não" — nhận data từ content script, gọi **AI API** (Claude/OpenAI/Gemini) hoặc **Lighthouse/PageSpeed API** để phân tích, lưu kết quả vào `chrome.storage`.
- **Popup:** UI hiển thị checklist cho user — pass/fail từng tiêu chí, button "Fix with AI".
- **Options Page:** Cho user nhập API key, chọn AI provider, tuỳ chỉnh checklist.

### 1.4. Service Worker — điểm cần lưu ý đặc biệt

Đây là thay đổi lớn nhất và "đau" nhất khi chuyển từ MV2 → MV3:

- Service worker **không persistent** — Chrome shutdown nó sau ~30s idle.
- **Không có DOM**, không có `window`, không có `localStorage` — chỉ có `self`, `chrome.*`, `fetch`, `IndexedDB`, `chrome.storage`.
- **Global variables sẽ mất** khi service worker ngủ — phải lưu state vào `chrome.storage`.
- Wake-up bằng các event: `chrome.runtime.onMessage`, `chrome.alarms.onAlarm`, `chrome.action.onClicked`, v.v.

Hệ quả với SEO extension: cache kết quả phân tích vào `chrome.storage.local` thay vì giữ trong biến memory.

### 1.5. File `manifest.json` — DNA của extension

Đây là file bắt buộc, mô tả mọi thứ về extension:

```json
{
  "manifest_version": 3,
  "name": "SEO Checklist AI",
  "version": "1.0.0",
  "description": "Phân tích SEO on-page và đề xuất fix bằng AI",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "sidePanel"
  ],
  "host_permissions": [
    "https://api.anthropic.com/*",
    "https://api.openai.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options.html",
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## 2. SEO Checklist — các tiêu chí extension cần check

Đây là danh sách các yếu tố SEO on-page và technical SEO cần kiểm tra (theo chuẩn 2026, Google đang ưu tiên cho cả search truyền thống và AI-search như SGE/AIO):

### 2.1. On-Page Content & Metadata

| # | Tiêu chí | Cách check (DOM-based) | Pass criteria |
|---|----------|------------------------|---------------|
| 1 | Title tag tồn tại | `document.title` | Không rỗng, 30-60 ký tự |
| 2 | Meta description | `document.querySelector('meta[name="description"]')` | 70-160 ký tự, có keyword |
| 3 | Một H1 duy nhất | `document.querySelectorAll('h1').length` | = 1 |
| 4 | Cấu trúc heading H2/H3 | Đếm + check thứ tự | H2 trước H3, không skip level |
| 5 | Canonical tag | `<link rel="canonical">` | Tồn tại, URL hợp lệ |
| 6 | Meta robots | `<meta name="robots">` | Không phải `noindex` (trừ khi cố ý) |
| 7 | Open Graph + Twitter Card | `<meta property="og:*">`, `<meta name="twitter:*">` | Có đủ og:title, og:description, og:image |
| 8 | Lang attribute | `document.documentElement.lang` | Có giá trị |
| 9 | URL ngắn, mô tả | `window.location.pathname` | < 75 ký tự, có keyword |

### 2.2. Hình ảnh

| # | Tiêu chí | Cách check |
|---|----------|------------|
| 10 | Tất cả `<img>` có `alt` | `Array.from(imgs).filter(i => !i.alt)` |
| 11 | Image format hiện đại | Check extension trong `src` (.webp, .avif tốt hơn .jpg/.png) |
| 12 | Lazy loading | `img[loading="lazy"]` |
| 13 | Width/height attribute | Tránh layout shift (CLS) |

### 2.3. Links

| # | Tiêu chí | Cách check |
|---|----------|------------|
| 14 | Có internal links | `a[href]` cùng domain |
| 15 | Broken anchor text | Tìm "click here", "read more" |
| 16 | External links có `rel` | `rel="noopener"` cho `target="_blank"` |

### 2.4. Structured Data (Schema.org)

| # | Tiêu chí | Cách check |
|---|----------|------------|
| 17 | Có JSON-LD | `script[type="application/ld+json"]` |
| 18 | Schema phù hợp loại trang | Article/Product/FAQ/BreadcrumbList |
| 19 | Schema hợp lệ | Validate qua Schema Markup Validator |

### 2.5. Technical & Performance

| # | Tiêu chí | Cách check |
|---|----------|------------|
| 20 | HTTPS | `window.location.protocol === 'https:'` |
| 21 | Viewport meta | Mobile-friendly |
| 22 | Core Web Vitals (LCP, INP, CLS) | Dùng `web-vitals` library hoặc gọi PageSpeed API |
| 23 | Page size & request count | `performance.getEntries()` |
| 24 | Render-blocking resources | Phân tích `<link>`, `<script>` trong `<head>` |

### 2.6. Indexability

| # | Tiêu chí | Cách check |
|---|----------|------------|
| 25 | robots.txt cho phép | Fetch `/robots.txt`, parse |
| 26 | sitemap.xml tồn tại | Fetch `/sitemap.xml` |
| 27 | hreflang (nếu multi-lang) | `<link rel="alternate" hreflang="...">` |

> **Tip:** Có thể chia thành 3 mức ưu tiên — **Critical** (1, 3, 5, 6, 20), **Important** (2, 4, 7, 10, 17, 22), **Nice-to-have** (còn lại) — để hiển thị màu đỏ/vàng/xanh trong UI.

---

## 3. So sánh các option AI để integrate

### 3.1. Bảng so sánh tổng quan (giá tham khảo 2026)

| Tiêu chí | Claude API (Anthropic) | OpenAI API | Chrome Built-in AI (Gemini Nano) |
|----------|------------------------|------------|----------------------------------|
| **Model flagship** | Claude Sonnet 4.6 / Opus 4.6 | GPT-5.4 / GPT-5.4 Mini / Nano | Gemini Nano (on-device) |
| **Giá input** (per 1M tokens) | Sonnet 4.6: $3.00 / Opus 4.6: $5.00 / Haiku 4.5: $1.00 | GPT-5.4: $2.50 / Mini: $0.75 / Nano: $0.20 | **Miễn phí** (chạy local) |
| **Giá output** (per 1M tokens) | Sonnet: $15 / Opus: $25 / Haiku: $5 | GPT-5.4: $15 / Mini: $4.50 / Nano: $1.25 | **Miễn phí** |
| **Chất lượng** | Rất cao (đặc biệt cho long-form, code, structured output) | Rất cao (GPT-5 series), cạnh tranh sát Claude | Trung bình (model nhỏ, ~3B params) |
| **Quyền riêng tư** | Data gửi lên Anthropic | Data gửi lên OpenAI | **100% on-device** — không gửi đi đâu |
| **Cần API key?** | Có | Có | Không |
| **Latency** | Mạng (200-2000ms) | Mạng (200-2000ms) | Local (50-500ms) |
| **Yêu cầu user** | Đăng ký + nạp tiền | Đăng ký + nạp tiền | Chrome 138+, OS hỗ trợ, ~22GB disk cho model |
| **Caching** | 90% discount cho prompt cache | 90% discount cho prompt cache | N/A (đã free) |
| **Phù hợp cho** | SEO suggestion phức tạp, rewrite content | Chi phí thấp với GPT-5.4 Nano cho task đơn giản | Privacy-first, offline, không tính phí user |

### 3.2. Phân tích trade-off cho từng option

**A. Claude API (Anthropic)**
- ✅ Mạnh nhất ở việc hiểu context dài (long meta, full HTML), output có structure (JSON), reasoning về SEO best practices.
- ✅ Tool use / function calling tốt — có thể yêu cầu Claude trả về JSON schema cố định.
- ✅ Prompt caching giảm cost đáng kể nếu reuse system prompt.
- ❌ Đắt hơn cho task đơn giản. Haiku 4.5 vẫn đắt hơn GPT-5.4 Nano.
- 🎯 **Use case:** "Rewrite meta description này để vừa SEO vừa engaging" hoặc "Đề xuất 3 cải tiến chính cho structured data".

**B. OpenAI API**
- ✅ Có tier ultra-budget (GPT-5.4 Nano $0.20/$1.25) — phù hợp cho SaaS cần margin.
- ✅ Ecosystem rộng, nhiều SDK.
- ❌ Output đôi khi kém structured hơn Claude với prompt giống nhau (cần prompt engineering kỹ hơn).
- 🎯 **Use case:** Quét hàng loạt issue đơn giản, classification, generate nhiều variant title.

**C. Chrome Built-in AI (Gemini Nano + Prompt API)**
- ✅ **Miễn phí cho user** — không cần API key, không lo bill bất ngờ.
- ✅ **Privacy** — data không rời khỏi máy user. Đây là điểm bán hàng lớn cho SEO tool (vì content có thể là draft chưa publish).
- ✅ Latency thấp (chạy local, không round-trip mạng).
- ❌ Model nhỏ — chất lượng kém xa Claude/GPT-5 cho task phức tạp như rewrite content.
- ❌ Yêu cầu user có Chrome 138+, OS supported (Win 10/11, macOS 13+, Linux, ChromeOS), và Chrome phải download model ~2GB lần đầu.
- ❌ Phải bật `chrome://flags/#prompt-api-for-gemini-nano` (đang dần được rollout stable).
- 🎯 **Use case:** Phân loại issue (Critical/Warning/Info), giải thích lỗi SEO bằng ngôn ngữ tự nhiên, generate gợi ý ngắn.

### 3.3. Khuyến nghị kiến trúc AI lai (Hybrid)

Cách thiết kế tốt nhất cho production: **Hybrid AI strategy**

```
┌────────────────────────────────────────────────┐
│  SEO Checklist Engine                          │
│  (deterministic rules — no AI needed cho ~70%) │
└────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  AI Layer (cho       │
        │  suggestions/fix)     │
        └───────────────────────┘
            /        |        \
           ▼         ▼         ▼
     ┌────────┐ ┌────────┐ ┌────────────┐
     │ Local  │ │ Cloud  │ │ User-      │
     │ Gemini │ │ Cloud  │ │ provided   │
     │ Nano   │ │ Claude/│ │ API key    │
     │ (free) │ │ OpenAI │ │ (BYOK)     │
     └────────┘ └────────┘ └────────────┘
```

- **Phần lớn checklist (70-80%)** dùng **rules thuần** (regex, length check, tag presence) — không cần AI, chạy nhanh, miễn phí.
- **Phần "Suggest fix" / "Rewrite for me"** dùng AI:
  - **Default:** Gemini Nano (free, privacy) cho task đơn giản — explain issue, suggest title length, classify severity.
  - **Premium / khi user có API key:** Claude Sonnet 4.6 cho task chất lượng cao — rewrite meta description, generate FAQ schema từ content, viết alt cho image.
  - **BYOK (Bring Your Own Key):** User dán API key của họ vào options page → save vào `chrome.storage.local` (encrypted).

---

## 4. Bảo mật API key — quan trọng

> Đây là chỗ rất nhiều extension làm sai và bị leak key publicly (theo nghiên cứu của Symantec/Security.com).

### 4.1. NEVER DO

- ❌ Hard-code API key vào source code. Extension publish trên Chrome Web Store có thể unpack — ai cũng đọc được.
- ❌ Dùng `localStorage` cho key. Content script trên cùng domain có thể đọc.
- ❌ Gửi key qua HTTP. Luôn HTTPS.

### 4.2. DO

- ✅ **BYOK pattern:** User tự nhập API key của họ → lưu vào `chrome.storage.local`. Bạn (developer) không bao giờ thấy key.
- ✅ **Encryption at rest:** Dùng Web Crypto API (`crypto.subtle`) với AES-GCM trước khi lưu vào storage.
- ✅ **Backend proxy (nếu monetize):** Nếu extension là SaaS có subscription, dựng backend của bạn ở giữa — extension gọi backend, backend gọi AI provider. Key của bạn nằm ở backend, không bao giờ ship đến client.
- ✅ **CSP strict:** Trong manifest, không cho `eval`, không inline script.
- ✅ **Khai báo `host_permissions`** chính xác cho domain AI provider.

### 4.3. Code mẫu lưu key an toàn

```javascript
// options.js — lưu key user nhập
async function saveApiKey(plainKey) {
  // Lấy/tạo encryption key (lưu trong storage, hoặc dẫn xuất từ user passphrase)
  const cryptoKey = await getOrCreateCryptoKey();

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(plainKey)
  );

  await chrome.storage.local.set({
    apiKey: {
      ciphertext: Array.from(new Uint8Array(ciphertext)),
      iv: Array.from(iv)
    }
  });
}

async function loadApiKey() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) return null;
  const cryptoKey = await getOrCreateCryptoKey();
  const decoder = new TextDecoder();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(apiKey.iv) },
    cryptoKey,
    new Uint8Array(apiKey.ciphertext)
  );
  return decoder.decode(plain);
}
```

---

## 5. Code mẫu — kiến trúc SEO Checklist Extension

### 5.1. `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "SEO Checklist AI",
  "version": "0.1.0",
  "description": "On-page SEO audit + AI-powered fix suggestions",
  "permissions": ["activeTab", "storage", "scripting", "sidePanel"],
  "host_permissions": [
    "https://api.anthropic.com/*",
    "https://api.openai.com/*"
  ],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "side_panel": { "default_path": "sidepanel.html" },
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
}
```

### 5.2. `content.js` — scrape DOM

```javascript
// Chạy trong context của trang user. Không có quyền truy cập chrome.* trừ chrome.runtime
function scrapeSEOData() {
  const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || null;
  const ogMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.content || null;

  const headings = {};
  for (let i = 1; i <= 6; i++) {
    headings[`h${i}`] = Array.from(document.querySelectorAll(`h${i}`)).map(h => h.textContent.trim());
  }

  const images = Array.from(document.querySelectorAll('img')).map(img => ({
    src: img.src,
    alt: img.alt,
    hasLazy: img.loading === 'lazy',
    hasDimensions: !!img.width && !!img.height
  }));

  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
    .filter(Boolean);

  return {
    url: window.location.href,
    protocol: window.location.protocol,
    lang: document.documentElement.lang,
    title: document.title,
    metaDescription: meta('description'),
    metaRobots: meta('robots'),
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    viewport: meta('viewport'),
    og: {
      title: ogMeta('og:title'),
      description: ogMeta('og:description'),
      image: ogMeta('og:image'),
      type: ogMeta('og:type')
    },
    twitter: {
      card: meta('twitter:card'),
      title: meta('twitter:title')
    },
    headings,
    images,
    jsonLd,
    wordCount: document.body.innerText.split(/\s+/).filter(Boolean).length,
    internalLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => a.hostname === window.location.hostname).length,
    externalLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => a.hostname !== window.location.hostname).length
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SCRAPE_SEO') {
    sendResponse(scrapeSEOData());
  }
  return true; // async response
});
```

### 5.3. `background.js` — service worker với checklist engine + AI

```javascript
// Checklist rules — pure JS, không cần AI
const RULES = [
  {
    id: 'title-exists',
    severity: 'critical',
    label: 'Title tag tồn tại và đúng độ dài (30-60 ký tự)',
    check: (data) => {
      if (!data.title) return { pass: false, reason: 'Thiếu title tag' };
      const len = data.title.length;
      if (len < 30) return { pass: false, reason: `Title quá ngắn (${len} ký tự)` };
      if (len > 60) return { pass: false, reason: `Title quá dài (${len} ký tự)` };
      return { pass: true };
    }
  },
  {
    id: 'meta-description',
    severity: 'important',
    label: 'Meta description (70-160 ký tự)',
    check: (data) => {
      if (!data.metaDescription) return { pass: false, reason: 'Thiếu meta description' };
      const len = data.metaDescription.length;
      if (len < 70 || len > 160) return { pass: false, reason: `Độ dài ${len} không tối ưu` };
      return { pass: true };
    }
  },
  {
    id: 'single-h1',
    severity: 'critical',
    label: 'Có đúng 1 H1',
    check: (data) => {
      const count = data.headings.h1.length;
      if (count === 0) return { pass: false, reason: 'Trang không có H1' };
      if (count > 1) return { pass: false, reason: `Có ${count} H1 — chỉ nên có 1` };
      return { pass: true };
    }
  },
  {
    id: 'images-alt',
    severity: 'important',
    label: 'Tất cả ảnh đều có alt text',
    check: (data) => {
      const noAlt = data.images.filter(i => !i.alt);
      if (noAlt.length === 0) return { pass: true };
      return { pass: false, reason: `${noAlt.length}/${data.images.length} ảnh thiếu alt` };
    }
  },
  {
    id: 'canonical',
    severity: 'important',
    label: 'Có canonical tag',
    check: (data) => data.canonical
      ? { pass: true }
      : { pass: false, reason: 'Thiếu <link rel="canonical">' }
  },
  {
    id: 'https',
    severity: 'critical',
    label: 'HTTPS',
    check: (data) => data.protocol === 'https:'
      ? { pass: true }
      : { pass: false, reason: 'Trang đang dùng HTTP' }
  },
  {
    id: 'og-tags',
    severity: 'nice',
    label: 'Open Graph đầy đủ (title, description, image)',
    check: (data) => {
      const missing = ['title', 'description', 'image'].filter(k => !data.og[k]);
      return missing.length === 0
        ? { pass: true }
        : { pass: false, reason: `Thiếu og:${missing.join(', og:')}` };
    }
  },
  {
    id: 'structured-data',
    severity: 'important',
    label: 'Có structured data (JSON-LD)',
    check: (data) => data.jsonLd.length > 0
      ? { pass: true }
      : { pass: false, reason: 'Trang không có schema markup' }
  }
  // ... thêm rules khác
];

function runChecklist(seoData) {
  return RULES.map(rule => ({
    id: rule.id,
    severity: rule.severity,
    label: rule.label,
    ...rule.check(seoData)
  }));
}

// AI fix suggestion — Hybrid: prefer local Gemini Nano, fallback Claude/OpenAI
async function getAIFix(issue, seoData) {
  // 1. Thử Gemini Nano (Chrome built-in) trước
  if ('LanguageModel' in self) {
    try {
      const session = await self.LanguageModel.create({
        initialPrompts: [{
          role: 'system',
          content: 'Bạn là chuyên gia SEO. Đề xuất fix ngắn gọn, hành động cụ thể, tiếng Việt.'
        }]
      });
      const prompt = buildPrompt(issue, seoData);
      const result = await session.prompt(prompt);
      session.destroy();
      return { source: 'gemini-nano-local', text: result };
    } catch (e) {
      console.warn('Gemini Nano không khả dụng:', e);
    }
  }

  // 2. Fallback: dùng Claude/OpenAI nếu user có API key
  const { apiKey, provider } = await chrome.storage.local.get(['apiKey', 'provider']);
  if (!apiKey) {
    return { source: 'none', text: 'Cần Chrome 138+ với Gemini Nano hoặc nhập API key trong Settings.' };
  }

  if (provider === 'claude') return await callClaude(apiKey, issue, seoData);
  if (provider === 'openai') return await callOpenAI(apiKey, issue, seoData);
}

async function callClaude(apiKey, issue, seoData) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',  // Haiku rẻ cho task này
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: buildPrompt(issue, seoData)
      }]
    })
  });
  const json = await res.json();
  return { source: 'claude-haiku', text: json.content[0].text };
}

async function callOpenAI(apiKey, issue, seoData) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5.4-nano',  // Nano cực rẻ
      messages: [
        { role: 'system', content: 'Chuyên gia SEO. Trả lời ngắn gọn, tiếng Việt.' },
        { role: 'user', content: buildPrompt(issue, seoData) }
      ]
    })
  });
  const json = await res.json();
  return { source: 'gpt-5.4-nano', text: json.choices[0].message.content };
}

function buildPrompt(issue, seoData) {
  return `URL: ${seoData.url}
Issue: ${issue.label}
Lý do fail: ${issue.reason}

Context (rút gọn):
- Title: ${seoData.title}
- Meta description: ${seoData.metaDescription || '(thiếu)'}
- H1: ${seoData.headings.h1.join(' | ') || '(thiếu)'}

Hãy đề xuất 1-2 cách fix cụ thể, kèm ví dụ HTML/text mẫu nếu cần.`;
}

// Routing message từ popup/sidepanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'AUDIT_PAGE') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const data = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_SEO' });
      const results = runChecklist(data);
      await chrome.storage.local.set({ lastAudit: { url: data.url, data, results, ts: Date.now() } });
      sendResponse({ data, results });
    } else if (msg.type === 'GET_AI_FIX') {
      const fix = await getAIFix(msg.issue, msg.seoData);
      sendResponse(fix);
    }
  })();
  return true; // async sendResponse
});
```

### 5.4. `popup.html` — UI checklist

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 380px; font-family: system-ui, sans-serif; padding: 12px; }
    .item { padding: 8px; border-bottom: 1px solid #eee; }
    .pass { color: #16a34a; }
    .fail-critical { color: #dc2626; font-weight: 600; }
    .fail-important { color: #d97706; }
    .fail-nice { color: #6b7280; }
    button { margin-top: 4px; font-size: 12px; padding: 4px 8px; cursor: pointer; }
    .fix-box { margin-top: 6px; padding: 8px; background: #f3f4f6; font-size: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h3>SEO Checklist</h3>
  <button id="run">Audit trang hiện tại</button>
  <div id="results"></div>
  <script src="popup.js"></script>
</body>
</html>
```

### 5.5. `popup.js`

```javascript
document.getElementById('run').addEventListener('click', async () => {
  const { data, results } = await chrome.runtime.sendMessage({ type: 'AUDIT_PAGE' });
  render(results, data);
});

function render(results, data) {
  const root = document.getElementById('results');
  root.innerHTML = '';
  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'item';
    const status = r.pass ? '✓' : '✗';
    const cls = r.pass ? 'pass' : `fail-${r.severity}`;
    div.innerHTML = `<div class="${cls}">${status} ${r.label}</div>`;
    if (!r.pass) {
      div.innerHTML += `<div style="font-size:12px;color:#666">${r.reason}</div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Fix với AI';
      btn.onclick = async () => {
        btn.disabled = true; btn.textContent = '...';
        const fix = await chrome.runtime.sendMessage({
          type: 'GET_AI_FIX', issue: r, seoData: data
        });
        const box = document.createElement('div');
        box.className = 'fix-box';
        box.textContent = `[${fix.source}]\n${fix.text}`;
        div.appendChild(box);
        btn.remove();
      };
      div.appendChild(btn);
    }
    root.appendChild(div);
  });
}
```

---

## 6. Roadmap đề xuất (8 tuần)

| Tuần | Mục tiêu | Output |
|------|----------|--------|
| 1 | Setup + skeleton | manifest.json, popup, content script scrape DOM |
| 2 | Checklist engine | 15-20 rules deterministic, hiển thị pass/fail |
| 3 | Storage + history | Lưu audit history, so sánh giữa các lần check |
| 4 | AI integration #1 | BYOK Claude/OpenAI, options page nhập key |
| 5 | AI integration #2 | Gemini Nano local, fallback strategy |
| 6 | Side panel + UX | Side panel detailed report, export PDF/CSV |
| 7 | Lighthouse / PageSpeed | Tích hợp Core Web Vitals (LCP/INP/CLS) |
| 8 | Polish + publish | Icons, store listing, privacy policy, submit Chrome Web Store |

---

## 7. Lưu ý compliance & UX

- **Privacy policy bắt buộc** khi extension xử lý dữ liệu user (Chrome Web Store yêu cầu).
- Trang **Options** cần ghi rõ: API key được lưu local, không gửi cho developer.
- **Permission tối thiểu** — chỉ xin `activeTab` thay vì `<all_urls>` nếu có thể (audit chỉ chạy khi user click).
- **Free tier mặc định** với Gemini Nano + rules → không cần key → conversion cao hơn → upsell BYOK Claude/OpenAI cho power users.
- **i18n:** Tách string ra `_locales/vi/messages.json` và `_locales/en/messages.json` để hỗ trợ đa ngôn ngữ ngay từ đầu.

---

## 8. Khuyến nghị cuối cùng

Đối với dự án "SEO Checklist + AI Fix" của bạn, đề xuất kiến trúc **3 lớp**:

1. **Rules layer (deterministic)** — bao phủ 70-80% checklist, không cần AI, cực nhanh, miễn phí.
2. **Local AI layer (Gemini Nano)** — cho explanation và quick suggestion, free for user, privacy-first. Đây là **lớp default** để extension có giá trị ngay cho user không có API key.
3. **Premium AI layer (Claude/OpenAI BYOK)** — cho rewrite content, generate schema phức tạp. Đây là điểm khác biệt cho power users / SEO professionals.

Lý do chọn hybrid:
- **Cost cho user:** $0 nếu chỉ cần basic suggestion.
- **Quality cho premium user:** Claude Sonnet 4.6 cho output xuất sắc khi cần.
- **Privacy:** Data nhạy cảm (draft content) ở lại trên máy user với Gemini Nano.
- **Conversion funnel:** Free → trial Gemini Nano → upgrade BYOK khi cần chất lượng cao.

---

## Sources

- [Extensions / Manifest V3 | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Migrate to a service worker | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [Extension service worker basics | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)
- [How to Build a Chrome Extension in 2026: AI-First Guide (Manifest V3)](https://www.groovyweb.co/blog/chrome-extension-development-guide-2026)
- [Building Chrome Extensions in 2026: A Practical Guide with Manifest V3 - DEV Community](https://dev.to/ryu0705/building-chrome-extensions-in-2026-a-practical-guide-with-manifest-v3-12h2)
- [The Prompt API | AI on Chrome | Chrome for Developers](https://developer.chrome.com/docs/ai/prompt-api)
- [Get started with built-in AI | AI on Chrome | Chrome for Developers](https://developer.chrome.com/docs/ai/get-started)
- [Chrome's Built-in AI: Gemini Nano and Prompt API Complete Guide](https://flaming.codes/posts/chrome-gemini-nano-built-in-ai)
- [On-Page SEO Checklist (2026) — Titles, Headings, Schema & Core Web Vitals](https://prateeksha.com/blog/on-page-seo-checklist-2026-titles-headings-schema-core-web-vitals)
- [Technical SEO Checklist: The Complete Guide For 2026 | DebugBear](https://www.debugbear.com/blog/technical-seo-checklist)
- [Beginner's Guide to On-Page SEO (2026) + Checklist - SEOlogist Inc](https://www.seologist.com/knowledge-sharing/beginners-guide-on-page-seo-2026/)
- [AI API Pricing Comparison 2026: OpenAI vs Claude vs Gemini](https://nicolalazzari.ai/articles/ai-api-pricing-comparison-2026)
- [LLM API Pricing 2026: OpenAI vs Anthropic vs Gemini | Live Comparison](https://www.cloudidr.com/llm-pricing)
- [Anthropic API Pricing in 2026: Complete Guide](https://www.finout.io/blog/anthropic-api-pricing)
- [How to Secure API Keys in Chrome Extension? - DEV Community](https://dev.to/notearthian/how-to-secure-api-keys-in-chrome-extension-3f19)
- [Security Flaws in Chrome Extensions: The Hidden Dangers of Hardcoded Credentials](https://www.security.com/threat-intelligence/chrome-extension-credentials)
- [chrome.storage | API | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/storage)