# Chrome Extension — Thiết kế Phase 4 + 5 + UX backlog

> **Ngày:** 2026-05-14
> **Tiền đề:** [01-current-state.md](01-current-state.md) — Phase 1-3 đã ship.
> **Phạm vi:** Thiết kế chi tiết Phase 4 (Side panel + i18n + history + filter), Phase 5 (Publish prep), và một số UX gap còn lại từ Phase 3.
> **Mục tiêu non-goals:** Không thay đổi contract `/api/v1/public/check`, không thêm endpoint mới, không touch gateway trừ khi thật cần (sẽ flag rõ).

---

## 0. TL;DR — phải ship gì

| # | Phase | Tier | Output | Touch gateway? |
|---|---|---|---|---|
| 3.5 | UX gap close | SMALL | Auto-reduce payload retry, Idempotency-Key, request-id copy, env URL hiện ở footer | Không |
| 4 | Side panel + i18n + history + filter | LARGE | Side panel entrypoint, `_locales/{vi,en}`, audit history (last 20), audience/severity filter, secondary keyword chips | Không |
| 5 | Publish prep | SMALL | Icons 16/48/128, screenshots, store listing vi+en, privacy policy, prod build + zip + submit | Không |

**Tổng effort ước lượng:** ~3-4 tuần (Phase 3.5: 2-3 ngày, Phase 4: 2 tuần, Phase 5: 1 tuần).

---

## 1. Phase 3.5 — UX gap close (SMALL)

Phase 3 đã ship cache + auto fallback + retry countdown. Còn 4 gap thấy được khi đọc code:

### 1.1. Auto-reduce payload trên `PAYLOAD_TOO_LARGE`

**Vấn đề:** `lib/errors.ts:55-58` map `PAYLOAD_TOO_LARGE` + `CLIENT_PAYLOAD_TOO_LARGE` → `REDUCE_PAYLOAD`, nhưng popup chỉ show toast "HTML quá lớn" — không có retry tự động. User phải tự đóng popup và mở lại.

**Thiết kế:**

- Thêm `serializeMinimalHtml(doc, { aggressive: true })` ở `lib/scraper.ts`:
  - Aggressive mode strip thêm: `<nav>`, `<footer>`, `<aside>`, `<header role="banner">`, `[role="navigation"]`, `[role="complementary"]`, comment nodes.
  - Vẫn giữ `<main>`, `<article>`, content semantic + meta tags trong `<head>`.
- `background.ts:runAudit` flow:
  ```
  HTML mode → serialize(default) → POST
    ├─ 200 OK → done
    ├─ 413 PAYLOAD_TOO_LARGE → serialize(aggressive) → POST lần 2
    │   ├─ 200 OK → done (set meta._reduced=true cho UI hiện badge "reduced")
    │   └─ 413 again → return CLIENT_PAYLOAD_TOO_LARGE với hint
    └─ other error → standard mapAuditError
  ```
- Nếu still 413 sau aggressive → toast `"Trang quá phức tạp. Thử audit URL public hoặc copy nội dung bài viết riêng."` + nút "Tạo audit ở web app" link `/playground`.

**Test:** `test/scraper.spec.ts` thêm case `aggressive=true` strip nav/footer; `test/client.spec.ts` thêm case 413 → retry → 200.

**Touch files:**
- `apps/extension/lib/scraper.ts` (+~25 LOC)
- `apps/extension/entrypoints/background.ts` (~+30 LOC ở `tryFetchHtml` + flow)
- 2 test files

### 1.2. Idempotency-Key cho retry an toàn

**Vấn đề:** Auto fallback URL→HTML hiện gửi 2 request rất gần nhau cùng nội dung. Nếu request thứ 1 thành công nhưng response lạc về network (transient), retry sẽ trigger lại analyzer/LLM → tốn quota.

**Thiết kế:**

- `lib/client.ts` accept optional `idempotencyKey?: string` → add header `Idempotency-Key: ${uuid}`.
- `background.ts:runAudit` generate `crypto.randomUUID()` per audit-session, pass cho cả 2 lần call (URL + fallback HTML). Gateway dedupe 24h.

**Touch files:**
- `apps/extension/lib/client.ts` (+5 LOC)
- `apps/extension/entrypoints/background.ts` (+3 LOC)
- `test/client.spec.ts` thêm assert header

### 1.3. Copy request-id button trên error view

**Vấn đề:** Popup hiện text `req_…` nhưng không có nút copy. User báo bug phải zoom + chép tay.

**Thiết kế:**

- `popup/App.tsx:ErrorView` thêm icon button bên cạnh `errorMeta`:
  ```tsx
  <button onClick={() => navigator.clipboard.writeText(err.requestId)}
          style={styles.copyBtn}
          aria-label="Copy request ID">📋</button>
  ```
- Tooltip 2s "Copied" sau click.

**Touch:** `popup/App.tsx` (+~15 LOC, 1 button + state).

### 1.4. Hiện env baseUrl ở popup footer

**Vấn đề:** User dev/staging/prod cùng key chuyển qua lại — không biết ext đang call host nào. Lỗi `INVALID_API_KEY` ở prod khi key là test → confused.

**Thiết kế:**

- Footer popup hiện `{new URL(API_BASE_URL).host}` (chỉ host, không path) bên cạnh "Manage key":
  ```
  api.seoanalyst.app · Manage key
  ```
- Match envBadge — `localhost:3000` ≠ `api.seoanalyst.app` cảnh báo trực quan.

**Touch:** `popup/App.tsx` (+~5 LOC).

---

## 2. Phase 4 — Side panel + i18n + history + filter (LARGE)

### 2.1. Goal

Mở rộng từ popup 380×600 chật chội sang side panel responsive, kèm 4 capability mới:

1. Lịch sử audit (last 20) → tránh re-audit, dễ so sánh trước/sau khi sửa.
2. i18n vi/en — store listing yêu cầu localize, ext UI cũng follow.
3. Audience filter (writer/dev) — gateway support sẵn qua `options.filter`, ext chưa expose.
4. Secondary keywords chips — gateway support max 5, ext chưa có input.

### 2.2. Side panel — entrypoint mới

**WXT entrypoint:** `apps/extension/entrypoints/sidepanel/`

- `index.html`, `main.tsx`, `App.tsx`.
- Manifest patch (`wxt.config.ts`):
  ```ts
  manifest: {
    ...,
    permissions: ['activeTab', 'storage', 'sidePanel'],
    side_panel: { default_path: 'sidepanel.html' },
    action: { default_popup: 'popup.html' }   // popup vẫn dùng cho quick audit
  }
  ```
- Trigger:
  - Popup vẫn là default click target (quick audit, 380px wide).
  - Popup có nút "Mở side panel" — gọi `chrome.sidePanel.open({ tabId })` để chuyển sang full view.
  - Side panel có thể đóng/mở từ Chrome toolbar (icon side panel).

**UI breakdown side panel (width 400-600px, height full):**

```
┌─────────────────────────────────────────────┐
│ ◉ SEO Analyst                    [live] ⚙  │  ← Header sticky
├─────────────────────────────────────────────┤
│ Target keyword                              │
│ ┌─────────────────────────────────────────┐ │
│ │ seo 2026                              x │ │
│ └─────────────────────────────────────────┘ │
│ Secondary keywords (optional, max 5)        │
│ ┌─────────────────────────────────────────┐ │
│ │ [on-page x] [vietnam x] [+ add]         │ │
│ └─────────────────────────────────────────┘ │
│ Audience:  [✓] Writer  [✓] Dev              │
│ Severity:  [✓] Error [✓] Warning [ ] Info   │
│ Language:  ( ) vi  (•) en                   │
│ ┌─────────────────────────────────────────┐ │
│ │       Audit current page                │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ History (last 20)                    ▾      │  ← collapsible
│ • example.com/post · "seo 2026" · 78 · 2h   │
│ • blog.example.com · "react"  · 92 · yest   │
│ • ...                                       │
├─────────────────────────────────────────────┤
│ Result (current audit)                      │
│ Score: 78/100  [cached]                     │
│   content: 85 · meta: 70 · technical: 72    │
│ ─────────────────────────────────────────── │
│ Issues (8)              [Filter: 5 visible] │
│ ┌─ critical ───────────────────────────┐    │
│ │ ❌ Title quá ngắn                     │   │
│ │  Title có 25 ký tự, khuyến nghị 50-60│   │
│ │  ✏️ Rewrite                           │   │
│ │  Cách viết SEO 2026: hướng dẫn …     │   │
│ │  Thêm năm và đối tượng …              │   │
│ │  ↗ Learn more                          │   │
│ └───────────────────────────────────────┘   │
│ ┌─ warning ────────────────────────────┐    │
│ │ ...                                   │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ 17 reqs/min · 482/day · req_01HW… 📋        │
└─────────────────────────────────────────────┘
```

### 2.3. Audit history (`lib/history.ts`)

**Storage shape:** `chrome.storage.local['history']` = `HistoryEntry[]` (max 20, oldest first dropped).

```ts
interface HistoryEntry {
  id: string;            // crypto.randomUUID()
  ranAt: number;         // ms
  url: string;
  keyword: string;
  language: 'vi'|'en';
  score: number;
  issueCount: number;
  cached: boolean;
  requestId: string;
  resultRef: string;     // chrome.storage.local key chứa full PublicCheckResponse
}
```

**API:**

```ts
addHistoryEntry(result: PublicCheckResponse, ctx: AuditCtx): Promise<HistoryEntry>
listHistory(limit?: number): Promise<HistoryEntry[]>
getHistoryResult(id: string): Promise<PublicCheckResponse | null>
clearHistory(): Promise<void>
deleteHistoryEntry(id: string): Promise<void>
```

**Lưu ý storage size:** `chrome.storage.local` default 5 MB quota, mỗi response ~30-80 KB. 20 entries ~1.6 MB → an toàn. Thêm `chrome.storage.local.getBytesInUse` warning nếu > 4 MB.

**UI:** Section "History" collapse default, expand show list. Click entry → re-render Result section với cached response (không re-audit). Có nút "Re-audit" trong entry để force fresh call.

### 2.4. i18n (`_locales/{vi,en}/messages.json`)

WXT support [Chrome i18n](https://developer.chrome.com/docs/extensions/reference/api/i18n) ra of the box.

**Messages keys (skeleton):**

```jsonc
// _locales/vi/messages.json
{
  "extName":            { "message": "SEO Analyst" },
  "extDesc":            { "message": "Audit SEO on-page + gợi ý AI" },
  "popupHeading":       { "message": "SEO Analyst" },
  "keywordPlaceholder": { "message": "Từ khóa mục tiêu (vd: seo 2026)" },
  "btnAudit":           { "message": "Audit trang" },
  "btnAuditing":        { "message": "Đang phân tích…" },
  "btnOpenSettings":    { "message": "Mở settings" },
  "errMissingKey":      { "message": "Chưa có API key. Thiết lập trong options." },
  "noIssues":           { "message": "Không phát hiện issue 🎉" },
  "history":            { "message": "Lịch sử" },
  "filterAudience":     { "message": "Đối tượng" },
  // ...
}
```

**Helper** `lib/i18n.ts`:

```ts
export const t = (key: string, ...sub: string[]) =>
  chrome.i18n.getMessage(key, sub);
```

Dùng `t('btnAudit')` thay `'Audit page'` ở mọi component. Default language detect qua `chrome.i18n.getUILanguage()` — user có thể override bằng `<select>` ở options (lưu `chrome.storage.local.uiLang`).

**Pitfall:** `chrome.i18n.getMessage` không reactive — đổi `_locales` cần reload ext. UI ngôn ngữ vẫn switch runtime nếu ta lưu strings dưới dạng dict bản thân và pick theo `uiLang` state. → Chọn approach manual dict (`messages/{vi,en}.ts`) để switch runtime, dùng `chrome.i18n` chỉ cho manifest fields (`extName`, `extDesc`).

### 2.5. Audience + severity filter

**State (popup/sidepanel):**

```ts
const [filter, setFilter] = useState({
  audiences: { writer: true, dev: true },
  minSeverity: 'warning' as 'info'|'warning'|'error',
});
```

**Hai cách áp dụng:**

A. **Server-side filter** — pass `options.filter` xuống gateway, gateway trả issues đã filter (gateway support sẵn). Pro: payload nhỏ, cache key thay đổi → re-fetch. Con: change filter = miss cache, gọi lại.

B. **Client-side filter** — gateway trả full issues, ext filter trước khi render. Pro: change filter instant, cache hit nhiều hơn. Con: payload to hơn (nhưng vẫn nhỏ — issues thường ≤ 20).

→ **Chọn B (client-side)** cho UX responsive. Gửi full, render filtered. Filter chỉ ảnh hưởng UI, không cache key. Nếu future cần server-side cho perf, dễ flip — gateway đã sẵn.

**UI:** Checkbox grid trên header. Severity 3 nấc tick (info ≥ warning ≥ error theo `SEVERITY_ORDER`). Visible count: `{filtered.length} of {issues.length} visible`.

### 2.6. Secondary keywords chips

**UI:** Input "Add keyword" + Enter để add chip. Max 5 (theo gateway DTO `@ArrayMaxSize(5)`). X button xóa.

**State persistence:** Lưu vào `chrome.storage.local['recentKeywords']` (top 10 by recency) để autocomplete khi gõ.

### 2.7. Phase 4 — file plan

```
apps/extension/
├── _locales/                          NEW
│   ├── vi/messages.json
│   └── en/messages.json
├── entrypoints/
│   ├── sidepanel/                     NEW
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                    (~300 LOC, share components với popup)
│   ├── popup/App.tsx                  PATCH (add "Mở side panel" button, history shortcut)
│   └── options/App.tsx                PATCH (add language select)
├── lib/
│   ├── history.ts                     NEW (~80 LOC)
│   ├── i18n.ts                        NEW (~20 LOC + 2 dict files)
│   ├── messages.vi.ts                 NEW
│   ├── messages.en.ts                 NEW
│   └── ...
├── components/                        NEW (shared popup ↔ sidepanel)
│   ├── ResultView.tsx                 (extract từ popup/App.tsx)
│   ├── IssueCard.tsx
│   ├── ErrorView.tsx
│   ├── KeywordInput.tsx               (with chip + autocomplete)
│   └── FilterBar.tsx                  (audience + severity + lang)
└── test/
    ├── history.spec.ts                NEW
    └── i18n.spec.ts                   NEW
```

### 2.8. Phase 4 — KIEM DINH gates

Theo memory `feedback_hook_vs_workflow_yagni` + `project_l4_trigger_rule`:

- **L1-L3 (fe-test-harness)**: NOT applicable — ext không thuộc `apps/web/`. Vitest unit cho `history.ts`, `i18n.ts`.
- **L4 (fe-be-integration)**: NOT triggered — ext không touch auth/session/OAuth/rate-limit/admin/CORS/webhook/upload/payment/websocket. Gateway-side CORS đã ship Phase 1. Public API rate-limit là gateway concern, ext chỉ retry.
- **L5 (e2e:smoke)**: Optional — chỉ nếu phase 5 (publish) cần verify production build trước submit.
- **/review**: Bắt buộc cho history.ts (cache eviction, quota handling) + i18n.ts (key coverage).
- **/qa**: Manual — load unpacked, paste key, audit URL public + audit CMS draft + switch language + filter + history click.

---

## 3. Phase 5 — Publish prep (SMALL)

### 3.1. Asset checklist

| Asset | Spec | Tool |
|---|---|---|
| Icon 16×16, 48×48, 128×128 PNG | Theme: scope/magnifier + brand color `#0f172a` | Figma/Pencil → export. Đã có `ext.pen` để mockup |
| 5 screenshots 1280×800 (popup) | (1) options page, (2) keyword input, (3) result với issues, (4) error retry countdown, (5) sidepanel với history | `wxt zip` build prod, chụp manual |
| Promo tile 440×280 (small), 920×680 (marquee) | Optional but recommended for Web Store | |
| Store listing copy vi + en | ≤132 chars short desc, ≤16000 chars long desc | Localize từ `extDesc` |
| Privacy policy URL | Public, mention: BYOK key in chrome.storage.local, DOM/URL sent over HTTPS, no telemetry, no third-party tracking | Host trên `seoanalyst.app/privacy` hoặc GitHub Pages |
| Justify permission rationale | `activeTab`: scrape DOM khi user click. `storage`: lưu API key. `host_permissions`: gọi gateway. **Không** xin `<all_urls>`, `tabs`, `cookies` | Submit form Chrome Web Store |

### 3.2. Production build & submit

```bash
# 1. Build prod
WXT_API_BASE_URL=https://api.seoanalyst.app \
  npm run build -w @seo/extension

# 2. Verify bundle size
du -sh apps/extension/.output/chrome-mv3
# Target: < 500 KB total, < 300 KB gzipped

# 3. Smoke test prod build
# Load unpacked .output/chrome-mv3 → manual flow

# 4. Zip for submit
npm run zip -w @seo/extension
# → apps/extension/.output/chrome-mv3.zip

# 5. Submit Chrome Web Store
# https://chrome.google.com/webstore/devconsole
# Pay $5 one-time developer fee if first time
# Upload zip + fill listing + screenshots
# Review thường 1-3 ngày
```

### 3.3. Post-publish

- Update `apps/extension/package.json` version bump per release (semver).
- Tag git: `ext-v0.1.0`.
- Document chrome-store URL trong `apps/extension/CLAUDE.md` + root `README.md`.
- Set up `/canary` skill nếu cần monitor (production usage low ban đầu, có thể skip).

---

## 4. Open design decisions

### 4.1. Có nên thêm "Compare with last audit" trong sidepanel?

User audit `example.com/post` lần 1 (score 65), sửa bài, audit lần 2 (score 82). Sidepanel có thể hiện diff:
- `meta-description` fixed (warning → resolved)
- `title-length` worsened (info → warning)

**Pro:** UX strong — visual proof của work.
**Con:** Cần lưu 2 entries per URL + so sánh logic ~50 LOC. Có thể defer V2.

**Đề xuất:** Defer. Phase 4 chỉ list history; click 2 entries open new "Compare" view chỉ là backlog.

### 4.2. Anonymous mode (no API key) — limited

V1 backlog ngày 2026-04-29 đề xuất tier free không cần key (`enrichMode=off`, không LLM). Sẽ tăng conversion.

**Vấn đề:** Cần endpoint mới không-auth hoặc gateway nhận anonymous bearer (rate limit per IP). Cả 2 đều cần gateway change → vượt scope ext.

**Đề xuất:** Defer hoàn toàn cho đến khi gateway có public-api-anonymous module. Không phải Phase 4-5 work.

### 4.3. WebSocket cho streaming?

Public API hiện sync (~1-2s p95). Streaming LLM suggestion sẽ làm UX "type-by-type" cảm giác nhanh hơn. Yêu cầu gateway có SSE endpoint.

**Đề xuất:** Defer V2. Hiện loading 1-2s không phải bottleneck.

### 4.4. Firefox port

WXT support sẵn `wxt build -b firefox`. Manifest auto-fixup (browser_specific_settings, scripts thay vì service_worker). Cần thêm `moz-extension://*` đã có ở CORS.

**Đề xuất:** Phase 5.5 sau Chrome Web Store ship. ETF (Estimated Time of Firefox addon review) ~7-10 ngày, hold lại để focus Chrome.

### 4.5. Auto-update mechanism cho `api-types.ts`

Mọi non-additive breaking change ở gateway response → ext crash hoặc miss data. Hiện đồng bộ thủ công.

**Options:**

A. **Export từ `@repo/shared`** — gateway service publishes type, ext import. Đúng nhất, đòi hỏi refactor.
B. **Code-gen from OpenAPI** — gateway expose Swagger (`/api/v1/public/docs`), ext `openapi-typescript` generate.
C. **Continue manual + integration test** — ext test gọi staging endpoint định kỳ, fail nếu shape khác.

**Đề xuất:** A là correct long-term. Defer thêm Phase 4 — risk thấp vì gateway public-api đã stable từ v0.3.

---

## 5. Non-functional concerns

### 5.1. Performance budget

| Metric | Target | Hiện tại |
|---|---|---|
| Popup first paint | < 100ms | ~70ms (inline styles, no Tailwind reset) |
| Side panel first paint | < 150ms | TBD |
| Bundle gzip total | < 300 KB | TBD (đo sau Phase 4) |
| HTML serialize 200KB cap | < 250ms | OK (đo trên happy-dom benchmark) |
| Cache lookup | < 20ms | ~5ms (cyrb53 nhanh) |

### 5.2. Quota awareness

- `chrome.storage.local`: 5 MB quota. History 20 × ~80KB = 1.6 MB → OK. Add guard nếu vượt 4 MB → drop oldest.
- LLM rate-limit: 20/min/key. Cache 1h client + 24h server giảm hit. Nếu user audit 20 URL khác nhau trong 1 phút sẽ block — UI hiện countdown.

### 5.3. Privacy & permissions audit (cho Web Store review)

| Permission | Lý do thực tế | Có thể narrow? |
|---|---|---|
| `activeTab` | Inject content script khi user click | Đã là minimum |
| `storage` | API key + cache + history | Đã là minimum |
| `sidePanel` (Phase 4) | Side panel UI | Đã là minimum |
| `host_permissions: https://api.seoanalyst.app/*` | Gateway gọi từ ext context | Đã narrow đúng đến gateway |
| `host_permissions: http://localhost:3000/*` | Dev only | **Cân nhắc** strip khỏi prod build via WXT env conditional |

**Action:** Phase 5 add conditional `host_permissions` ở `wxt.config.ts`:

```ts
host_permissions: [
  'https://api.seoanalyst.app/*',
  ...(import.meta.env.DEV ? ['http://localhost:3000/*'] : [])
]
```

---

## 6. Suggested execution sequence

```
T+0   ▼ Phase 3.5 — UX gap close (SMALL, 2-3 ngày)
        ├─ 3.5.1 auto-reduce payload retry
        ├─ 3.5.2 idempotency-key
        ├─ 3.5.3 copy request-id button
        └─ 3.5.4 env host footer
T+0.5 ▼ Phase 4 — Side panel + i18n + history + filter (LARGE, 2 tuần)
        ├─ Wave 1: components/ extract + share
        ├─ Wave 2: i18n setup (manual dict + messages.{vi,en}.ts)
        ├─ Wave 3: history.ts + storage quota guard
        ├─ Wave 4: sidepanel/ entrypoint
        ├─ Wave 5: filter + secondary keywords
        └─ /review + /qa
T+2.5 ▼ Phase 5 — Publish prep (SMALL, 1 tuần)
        ├─ Icons + screenshots
        ├─ Privacy policy host
        ├─ Store listing copy vi/en
        ├─ Prod build + smoke + zip
        └─ Submit + monitor review
T+3.5   ✅ MVP shipped to Web Store
```

---

## 7. Câu hỏi cần user xác nhận trước khi implement

1. **Side panel vs sticky popup expand?**
   Spec gốc đề xuất side panel; nhưng nếu sidepanel UX overkill cho MVP, alternative là popup expandable (`window.resizeTo`-style chưa support, nhưng có thể detach popup thành tab `chrome://extensions/?ext=...`). → **Đề xuất giữ side panel** vì Chrome 114+ support native, không hack.

2. **i18n default language detection**
   Auto theo `chrome.i18n.getUILanguage()` hay default `vi` cho local market? → **Đề xuất `vi` default cho dự án đồ án (Vietnamese-first), english toggle.**

3. **History scope** — per-tab, per-domain, hay global?
   → **Đề xuất global** (last 20 across all tabs/domains). Per-tab phức tạp + ext popup vốn không persistent.

4. **Streaming / Anonymous / Firefox** — defer hết V2 đúng không?
   → Mặc định YES theo spec; nếu user muốn ship Firefox cùng lúc thì +3 ngày Phase 5.5.

5. **Tách commit theo scope (per memory `feedback_commit_scope_split`):**
   - Phase 3.5 mỗi gap = 1 commit `fix(ext): …`.
   - Phase 4 mỗi wave = 1 commit `feat(ext/phase-4): …`.
   - Phase 5 commit `chore(ext/phase-5): publish prep`.
   - Doc commit riêng `docs(ext): add design 02 + current-state 01`.

---

## 8. Test plan

### 8.1. Unit (vitest)

| File | New cases |
|---|---|
| `test/scraper.spec.ts` | `serializeMinimalHtml(doc, { aggressive: true })` strip nav/footer; aggressive vẫn dưới 200KB cho fixture lớn |
| `test/client.spec.ts` | `Idempotency-Key` header pass through; 413 → retry logic ở caller (mock via background test) |
| `test/cache.spec.ts` | Eviction khi `getBytesInUse > 4MB` |
| `test/history.spec.ts` (NEW) | add → list FIFO 20; get by id; delete; clear; resultRef cleanup |
| `test/i18n.spec.ts` (NEW) | runtime switch dict; missing key fallback en; manifest `__MSG_…` placeholders |

### 8.2. Manual QA matrix (`/qa` Phase 4)

| Scenario | Expected |
|---|---|
| Cold install, no key | Auto open options page |
| Save sk_test_… valid | "Saved" toast + popup hiện badge `test` |
| Save sk_live_… invalid format | Red border, save button disabled |
| Click ext trên `https://example.com/post`, kw="seo" | URL mode, 1-2s, score + 3-8 issues |
| Click ext trên `https://admin.example.com` | HTML mode auto, không gửi URL |
| Re-click ext cùng URL/kw trong 1h | Cached badge xuất hiện |
| Audit 20 lần liên tục cùng key | Lần 21 → 429, retry countdown ~3s |
| Toggle ngôn ngữ → audit lại | Issues nhận `language=en`, cache key khác |
| Open side panel, click history entry | Result re-render từ cached response, không network call |
| Filter audience=writer | Issues dev-only hidden, count "5 of 8 visible" |
| 5 secondary keywords + 1 thêm | Input disabled / toast "max 5" |
| Production build với `http://localhost` host | Permission không xin localhost (verify chrome://extensions) |

### 8.3. E2e (`e2e:smoke` Phase 5)

Optional — chỉ chạy nếu production stack có docker:up + Playwright extension support.

---

## 9. Tham chiếu

- Spec v2 (2026-04-29): [`docs/superpowers/specs/2026-04-29-chrome-ext-design.md`](../superpowers/specs/2026-04-29-chrome-ext-design.md)
- Trạng thái hiện tại: [01-current-state.md](01-current-state.md)
- WXT side panel: <https://wxt.dev/guide/key-concepts/manifest.html#side-panel>
- Chrome i18n: <https://developer.chrome.com/docs/extensions/reference/api/i18n>
- Chrome Web Store guidelines: <https://developer.chrome.com/docs/webstore/program-policies>
- Public API: [`docs/public-api/`](../public-api/)
