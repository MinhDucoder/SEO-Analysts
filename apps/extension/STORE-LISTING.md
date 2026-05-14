# Chrome Web Store listing copy

Source-of-truth strings for store submission. Each section has a
Vietnamese and English variant. When updating, keep both in sync.

## Name (max 75 chars)

- vi: SEO Analyst — Audit on-page + gợi ý AI
- en: SEO Analyst — On-page audit + AI suggestions

## Short description (max 132 chars)

- vi: Audit SEO on-page 1-click trên trang đang xem: score, issues theo
  rule chuẩn, gợi ý sửa từ AI. Dùng API key của bạn.
- en: One-click on-page SEO audit on any page you view. Score, issues
  against standard rules, AI-generated fix suggestions. Bring your
  own API key.

## Long description (max 16000 chars)

### vi

SEO Analyst là tiện ích phân tích SEO on-page nhanh gọn cho người
viết content, SEO consultant, và developer.

Một click trên trang đang xem → trong 1–2 giây, popup hiện:

- Điểm SEO tổng (0–100) + phân tách theo từng nhóm (content / meta /
  technical / a11y).
- Danh sách issue (error / warning / info), gồm bằng chứng cụ thể và
  gợi ý sửa do LLM sinh — không phải template chung chung.
- Hành động kèm theo (rewrite / add / remove / reorder) cho từng
  suggestion, kèm rationale ngắn gọn.

Hai chế độ scrape:
- URL mode (mặc định) cho trang public — gateway tự fetch.
- HTML mode tự động bật khi trang nằm sau auth (CMS draft, dashboard,
  preview…). Phù hợp WordPress/Webflow/Ghost editor.

### Bảo mật & quyền

- Mang API key của bạn (BYOK). Key chỉ lưu trên thiết bị này
  (`chrome.storage.local`), không sync qua Google account, không bao
  giờ rời Chrome trừ khi gọi API.
- Quyền tối thiểu: `activeTab` (chỉ scrape khi bạn click) + `storage`
  + `sidePanel`. Không xin tabs/cookies/<all_urls>.
- Mã nguồn mở. Repo: https://github.com/MinhDucoder/SEO-Analysts

### Cài đặt

1. Cài extension.
2. Mở web app SEO Analyst (https://seoanalyst.app), Settings → API
   keys, tạo key mới.
3. Dán key vào trang Settings của extension.
4. Mở bất kỳ trang nào, click extension, nhập từ khóa target → Audit.

### Side panel (Chrome 114+)

Mở side panel để xem chi tiết: lịch sử 20 audit gần nhất, filter theo
audience (writer / dev) hoặc severity, chuyển ngôn ngữ vi/en runtime,
re-audit từ history mà không phải gõ lại keyword.

### Không có

- Không quảng cáo.
- Không telemetry.
- Không bán dữ liệu cho bên thứ 3.
- Không passive scraping — chỉ chạy khi bạn click.

### en

SEO Analyst is a focused on-page SEO audit tool for content writers,
SEO consultants, and developers.

One click on the page you are viewing → 1–2 seconds later the popup
shows:

- Total SEO score (0–100) + breakdown by category (content / meta /
  technical / a11y).
- List of issues (error / warning / info) with concrete evidence and
  AI-generated fix suggestions — not generic templates.
- Per-suggestion action (rewrite / add / remove / reorder) with a
  short rationale.

Two scrape modes:
- URL mode (default) for public pages — the gateway fetches.
- HTML mode kicks in automatically for auth-gated pages (CMS draft,
  dashboard, preview, …). Works with WordPress/Webflow/Ghost editors.

### Privacy & permissions

- Bring your own API key (BYOK). The key lives on this device only
  (`chrome.storage.local`), never syncs via your Google account, and
  never leaves Chrome unless you call the API.
- Minimum permissions: `activeTab` (only scrapes when you click) +
  `storage` + `sidePanel`. We do not request tabs/cookies/<all_urls>.
- Open source. Repo: https://github.com/MinhDucoder/SEO-Analysts

### Getting started

1. Install the extension.
2. Open the SEO Analyst web app (https://seoanalyst.app), Settings →
   API keys, create a new key.
3. Paste the key into the extension's Settings page.
4. Open any page, click the extension, enter a target keyword →
   Audit.

### Side panel (Chrome 114+)

Open the side panel for a richer view: last-20 audit history, filter
by audience (writer / dev) or severity, switch UI language vi/en at
runtime, re-audit from history without retyping the keyword.

### Not included

- No ads.
- No telemetry.
- No third-party data sharing.
- No passive scraping — only runs when you click.

## Category

- Primary: Developer Tools
- Secondary: Productivity

## Keywords / tags

seo, on-page, audit, ai suggestions, content writing, wordpress,
webflow, ghost, chrome extension, byok, privacy-respecting

## Single purpose

This extension's single purpose is to audit the on-page SEO of the
tab the user is actively viewing, on demand, by sending the URL or
serialized DOM to the SEO Analyst public API and rendering the
returned score, issues, and suggestions inside the extension's
popup and side panel.

## Permission rationale (Chrome Web Store submission form)

- **activeTab** — The extension scrapes the current tab's URL and
  DOM only when the user explicitly clicks the action button. Without
  `activeTab`, the extension cannot read what the user is asking it
  to audit. We deliberately do not request the broader `tabs` or
  `<all_urls>` permissions because we never need passive access.
- **storage** — Used to persist (1) the user's API key, (2) up to 20
  audit history entries, (3) UI preferences (language, theme). All
  data is stored in `chrome.storage.local`, scoped to this extension
  ID; it never syncs across devices.
- **sidePanel** — Powers the larger side-panel view that holds the
  audit history and filter controls. Without it, the extension is
  limited to the 380-pixel popup. The side panel only opens when the
  user clicks "Open side panel" in the popup.
- **host_permissions: https://api.seoanalyst.app/\*** — The extension
  communicates with the SEO Analyst gateway over HTTPS. No other
  origins are requested.

## Submission checklist

- [ ] Bump `apps/extension/wxt.config.ts` `manifest.version` to
      `0.1.0` (or next semver) before zipping.
- [ ] Run `WXT_API_BASE_URL=https://api.seoanalyst.app npm run build -w @seo/extension`.
- [ ] Verify `.output/chrome-mv3/manifest.json` does NOT contain
      `http://localhost:3000/*` in `host_permissions`.
- [ ] `du -sh apps/extension/.output/chrome-mv3` — total under 1 MB
      ideally, under 500 KB gzipped.
- [ ] Sideload `chrome-mv3` in a clean Chrome profile, walk through
      audit + side panel + theme toggle smoke test.
- [ ] `npm run zip -w @seo/extension` → `chrome-mv3.zip`.
- [ ] Upload `chrome-mv3.zip` to Chrome Web Store Dev Console.
- [ ] Fill in store listing with strings above.
- [ ] Upload 5 screenshots (1280×800): popup empty, popup result,
      side panel, error w/ retry countdown, options page.
- [ ] Set privacy policy URL to where `PRIVACY.md` is published.
- [ ] Submit for review.
