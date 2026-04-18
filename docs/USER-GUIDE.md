# 📘 User Guide — SEO Analyst Platform

> **Dành cho ai?** Bất kỳ ai muốn **dùng platform này để tối ưu SEO website** — sinh viên, freelancer, chủ shop online, content writer. Không cần biết code.
>
> **Mục tiêu của guide:** Sau khi đọc xong, bạn biết (1) cách chạy audit, (2) cách đọc kết quả, (3) cách **sửa từng vấn đề theo thứ tự ưu tiên**, và (4) cách dùng scheduled audit để giữ site luôn khoẻ.
>
> **Đọc nhanh:** Section 3 (priority playbook) + Section 5 (từng rule) là phần dùng nhiều nhất.

---

## Mục lục

1. [Bắt đầu trong 3 phút](#-1-bắt-đầu-trong-3-phút)
2. [Hiểu điểm SEO của bạn](#-2-hiểu-điểm-seo-của-bạn)
3. [Priority Playbook — sửa gì trước?](#-3-priority-playbook--sửa-gì-trước)
4. [4 loại audit — dùng cái nào?](#-4-4-loại-audit--dùng-cái-nào)
5. [22 SEO rule — cách fix từng cái](#-5-22-seo-rule--cách-fix-từng-cái)
6. [Core Web Vitals — đọc mobile vs desktop](#-6-core-web-vitals--đọc-mobile-vs-desktop)
7. [Keyword analysis — dùng từ khoá đúng cách](#-7-keyword-analysis--dùng-từ-khoá-đúng-cách)
8. [Scheduled audit + alert — monitoring chiến lược](#-8-scheduled-audit--alert--monitoring-chiến-lược)
9. [Best practices — 10 checklist trước khi launch](#-9-best-practices--10-checklist-trước-khi-launch)
10. [Common mistakes — 7 lỗi hay gặp](#-10-common-mistakes--7-lỗi-hay-gặp)
11. [FAQ](#-11-faq)

---

## 🚀 1. Bắt đầu trong 3 phút

### Tạo tài khoản

1. Truy cập platform (local: `http://localhost:3000`, prod: domain của bạn)
2. Click **"Đăng ký"** → nhập email + password ≥ 8 ký tự (1 hoa + 1 số + 1 ký tự đặc biệt)
3. Verify email (check inbox, hoặc admin confirm trong dev mode)
4. Login → vào Dashboard

### Audit đầu tiên

1. Click nút **"Audit mới"**
2. Paste URL bạn muốn kiểm tra (ví dụ `https://example.com/blog/post-1`)
3. (Tuỳ chọn) Nhập **target keyword** — từ khoá bạn muốn trang này rank cho. Ví dụ "khoá học SEO miễn phí"
4. (Tuỳ chọn) Check **"Kiểm tra broken links"** nếu bạn nghi ngờ có link gãy
5. Click **"Bắt đầu phân tích"**
6. Đợi 8-25 giây (có progress bar realtime) → trang kết quả tự hiện

### Đọc kết quả

Kết quả có 4 tab:

| Tab | Xem gì |
|---|---|
| **Overview** | Điểm tổng 0-100 + radar chart 5 trục (Meta/Headings/Images/Links/Technical) |
| **Issues** | Danh sách vấn đề → fix theo thứ tự: 🔴 Critical → 🟡 Warning → ✅ Pass |
| **Core Web Vitals** | LCP, INP, CLS cho mobile + desktop |
| **Keywords** | Top 20 từ xuất hiện nhiều nhất + density |

💡 **Tip đầu tiên:** Xuất PDF ngay (nút "Tải PDF"). Lưu lại làm baseline để so sánh sau khi bạn sửa.

---

## 📊 2. Hiểu điểm SEO của bạn

### Bảng điểm tổng

| Điểm | Classification | Ý nghĩa | Hành động |
|:---:|---|---|---|
| **80-100** | 🟢 **Excellent** | Gần như không có gì để sửa | Focus content marketing + backlinks |
| **60-79** | 🔵 **Good** | Đủ dùng nhưng còn chỗ cải thiện | Fix 2-3 warnings cao weight |
| **40-59** | 🟡 **Fair** | Có vấn đề đáng kể | Fix TẤT CẢ critical issues trước |
| **0-39** | 🔴 **Poor** | SEO yếu, khó rank | Rebuild from ground up — xem Priority Playbook |

### Công thức tính điểm

```
SEO Score = Σ (rule_score × rule_weight) / Σ rule_weight

Trong đó:
  rule_score = 100 (pass) | 50 (warn) | 0 (fail)
  rule_weight = 1-10 (admin cấu hình)
```

→ **Rule có weight cao** ảnh hưởng điểm nhiều hơn. Ưu tiên fix rule weight 8-10 trước.

### Điểm từng category

Radar chart 5 trục (Meta / Headings / Images / Links / Technical) giúp bạn thấy **nhóm nào yếu nhất**. Thường:

- **Technical < 60** → website có vấn đề nghiêm trọng (không HTTPS, missing viewport, robots chặn)
- **Meta < 60** → title/description chưa tối ưu → traffic Google thấp
- **Images < 60** → ảnh thiếu alt / nặng → fail cho mobile user + accessibility
- **Headings < 60** → structure rối → Google hiểu sai chủ đề trang
- **Links < 60** → thiếu internal link / có broken link

---

## 🎯 3. Priority Playbook — sửa gì trước?

Đừng sửa lung tung. Đây là thứ tự chuẩn khi bạn audit 1 trang và muốn cải thiện điểm nhanh nhất:

### Wave 1 — Critical quick wins (làm ngay, 30 phút)

Những rule có **weight ≥ 8** và fix cực nhanh:

| Rule | Thời gian | Impact |
|---|:---:|:---:|
| 1. `https_check` | 0 (check config) | +10 điểm |
| 2. `viewport_meta` | 2 phút | +10 điểm |
| 3. `title_tag` | 5 phút | +8 điểm |
| 4. `h1_tag` | 5 phút | +8 điểm |
| 5. `http_status` | 0 (nếu 200 thì skip) | +8 điểm |
| 6. `meta_description` | 10 phút | +7 điểm |

→ Fix đủ 6 rule này thường **+40-50 điểm** cho trang nào đó đang < 50.

### Wave 2 — Content & structure (1-2 giờ)

| Rule | Công việc |
|---|---|
| `image_alt` | Thêm alt="..." cho mọi ảnh (đặc biệt ảnh quan trọng) |
| `heading_hierarchy` | Sắp xếp H1→H2→H3 không nhảy cóc |
| `internal_links` | Link tới ≥ 3 trang liên quan cùng site |
| `canonical_url` | Thêm `<link rel="canonical">` |
| `open_graph` | Thêm og:title, og:description, og:image |

→ **+20-30 điểm** cho trang đang ở mức Fair.

### Wave 3 — Performance (site-wide effort)

| Rule | Công việc |
|---|---|
| `image_optimization` | Convert JPEG/PNG → WebP/AVIF, nén < 200KB |
| `page_size` | Giảm HTML xuống < 2MB (minify JS/CSS, code split) |
| CWV (Lighthouse) | LCP < 2.5s, INP < 200ms, CLS < 0.1 |

→ Cần dev intervention — thường mất cả sprint.

### Wave 4 — Polish (weight thấp, nhưng free wins)

| Rule | Công việc |
|---|---|
| `twitter_card` | Thêm `<meta name="twitter:card">` |
| `language_tag` | Thêm `<html lang="vi">` hoặc `lang="en"` |
| `favicon` | Thêm favicon.ico |
| `schema_org` | JSON-LD structured data |
| `url_structure` | URL ngắn, dash không underscore |
| `readability` | Viết câu ngắn, từ đơn giản (chỉ English) |

---

## 🔄 4. 4 loại audit — dùng cái nào?

Platform có 4 chế độ audit. Chọn đúng cái để tiết kiệm thời gian + tránh overload:

### 4.1. Single URL audit (mặc định)

**Khi dùng:**
- Bạn chỉ quan tâm 1 trang cụ thể (landing page, sales page, blog post mới)
- Bạn đang iterate — sửa → re-audit → sửa tiếp
- Bạn muốn check nhanh trong 10-20 giây

**Command:**
```bash
POST /audits { "url": "https://example.com/blog/post-1" }
```

### 4.2. Single URL + Broken Links (F4)

**Khi dùng:**
- Bạn nghi link đã hỏng (ví dụ site cũ, external references thay đổi)
- Bạn dọn dẹp trang cũ trước khi relaunch
- Bạn muốn biết chính xác URL nào 404/500

⚠️ **Lưu ý:** Tốn thời gian hơn ~5-15 giây (mỗi link thêm 1 HTTP HEAD request).

**Command:**
```bash
POST /audits { "url": "...", "includeLinkChecks": true }
```

### 4.3. Site-wide audit (F1)

**Khi dùng:**
- Bạn mới tiếp nhận website của khách, cần báo cáo tổng quan
- Bạn muốn biết **trang nào trong site đang kéo score xuống**
- Trước khi SEO campaign, bạn muốn baseline tổng thể

**Yêu cầu:** Website phải có `robots.txt` → `Sitemap:` hoặc `sitemap.xml` ở root.

⚠️ **Thời gian:** 500 URL × 3-5s = **25-40 phút**. Không dùng khi vội.

**Command:**
```bash
POST /audits { "url": "https://example.com", "mode": "site", "maxUrls": 500 }
```

**Kết quả bạn sẽ thấy:**
- `avgScore`: điểm trung bình toàn site
- `medianScore`: điểm giữa (ít bị outlier kéo)
- `worstPages`: top 10 trang tệ nhất → **đây là danh sách bạn sửa đầu tiên**
- `failedUrls`: trang không crawl được (có thể bị chặn / offline)

💡 **Chiến lược:** Audit site-wide 1 lần/tháng để monitor; dùng single-URL audit hằng ngày khi làm việc.

### 4.4. Scheduled audit (F2)

**Khi dùng:**
- Bạn muốn **tự động** monitor, không phải nhớ audit mỗi tuần
- Bạn cần alert khi dev đẩy code mới làm hỏng SEO
- Bạn đang serve client — cần báo cáo định kỳ cho họ

**Cron pattern hay dùng:**

| Use case | Cron |
|---|---|
| Mỗi sáng thứ Hai 9h | `0 9 * * MON` |
| Mỗi ngày 0h | `0 0 * * *` |
| Mỗi thứ Hai & Thứ Năm | `0 9 * * MON,THU` |
| Mỗi tháng 1 ngày đầu | `0 8 1 * *` |

**Command:**
```bash
POST /scheduled-audits {
  "url": "https://example.com",
  "cron": "0 9 * * MON",
  "mode": "site",
  "maxUrls": 250
}
```

**Regression alert** (tự động):
- Score tụt ≥ 10 điểm so với lần trước → alert `score_drop`
- Score = 0 (site down) → alert `site_down`

---

## 🔧 5. 22 SEO rule — cách fix từng cái

### 5.1 Category: Meta (4 rule)

#### 1. `title_tag` (weight 8-10) — Title tag

**Kiểm gì:** `<title>` có tồn tại không? Dài 50-60 ký tự không?

**Pass:** 50-60 ký tự · **Warn:** 30-49 hoặc 61-70 · **Fail:** thiếu hoặc ngoài 30-70

**Cách fix:**

```html
<!-- ❌ Fail: không có hoặc quá ngắn/dài -->
<title>SEO</title>

<!-- ✅ Pass: 50-60 ký tự, có từ khoá chính -->
<title>Khoá học SEO miễn phí cho người mới — SEOAnalyst.vn</title>
```

**Quy tắc vàng:**
- Từ khoá chính đặt đầu title
- Thêm brand ở cuối (sau dash)
- Tránh spam nhồi nhét: "SEO | SEO tool | SEO | tối ưu SEO"

#### 2. `meta_description` (weight 7-8) — Meta description

**Kiểm gì:** `<meta name="description">` 120-160 ký tự, có CTA

**Cách fix:**

```html
<meta name="description" content="Học SEO từ A-Z trong 30 ngày với platform miễn phí, 22 rule chuyên sâu, phân tích realtime. Bắt đầu ngay!">
```

💡 Google **không** dùng meta description để rank, nhưng dùng nó làm snippet hiển thị → **CTR cao hơn = rank tốt hơn gián tiếp**.

#### 3. `open_graph` (weight 5) — Open Graph tags

**Kiểm gì:** Đủ 3 og:title + og:description + og:image

```html
<meta property="og:title" content="Khoá học SEO miễn phí">
<meta property="og:description" content="Học SEO từ A-Z...">
<meta property="og:image" content="https://example.com/og-image-1200x630.png">
<meta property="og:url" content="https://example.com/course">
<meta property="og:type" content="website">
```

→ Khi share lên Facebook / Zalo / Messenger, preview đẹp.

#### 4. `twitter_card` (weight 3) — Twitter Card

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Khoá học SEO miễn phí">
<meta name="twitter:image" content="https://example.com/twitter-image.png">
```

### 5.2 Category: Headings (2 rule)

#### 5. `h1_tag` (weight 8-9) — H1 tag

**Kiểm gì:** Đúng **1** H1, chứa `targetKeyword` (nếu bạn cung cấp)

```html
<!-- ❌ Fail: không có H1 -->
<h2>Tiêu đề</h2>

<!-- ❌ Fail: có 2+ H1 (gây confusion cho Google) -->
<h1>Phần 1</h1>
<h1>Phần 2</h1>

<!-- ✅ Pass: đúng 1 H1, có keyword -->
<h1>Khoá học SEO miễn phí cho người mới</h1>
```

#### 6. `heading_hierarchy` (weight 6) — Heading hierarchy

**Kiểm gì:** H1 → H2 → H3 theo thứ tự, không nhảy cóc

```html
<!-- ❌ Fail: H2 trực tiếp qua H4 -->
<h1>Title</h1>
  <h2>Section</h2>
    <h4>Subsection</h4>   <!-- Thiếu H3 -->

<!-- ✅ Pass -->
<h1>Title</h1>
  <h2>Section A</h2>
    <h3>Subsection A1</h3>
    <h3>Subsection A2</h3>
  <h2>Section B</h2>
```

### 5.3 Category: Images (2 rule)

#### 7. `image_alt` (weight 7) — Alt text

**Kiểm gì:** ≥ 90% ảnh có `alt` non-empty

```html
<!-- ❌ Fail -->
<img src="laptop.jpg">

<!-- ❌ Fail: alt rỗng (chỉ chấp nhận cho decoration) -->
<img src="laptop.jpg" alt="">

<!-- ✅ Pass -->
<img src="laptop.jpg" alt="Laptop Dell XPS 15 màn hình 4K cho designer">
```

**Tip:**
- Mô tả ảnh thật, KHÔNG nhồi nhét keyword
- Ảnh decorate (divider, icon trang trí) → `alt=""` là OK
- Ảnh là link → alt mô tả đích

#### 8. `image_optimization` (weight 4-5) — Image optimization

**Kiểm gì:** Ảnh < 200KB và dùng WebP/AVIF

**Cách fix:**
```bash
# Convert JPG → WebP với ImageMagick
convert photo.jpg -quality 85 photo.webp

# Hoặc dùng online: squoosh.app (browser-based, không upload)
```

### 5.4 Category: Links (3 rule)

#### 9. `internal_links` (weight 5) — Internal links

**Kiểm gì:** ≥ 3 internal link (cùng domain)

```html
<p>
  Xem thêm <a href="/blog/seo-cho-nguoi-moi">bài hướng dẫn SEO cho người mới</a>,
  <a href="/tools">danh sách công cụ SEO</a> và
  <a href="/about">giới thiệu về chúng tôi</a>.
</p>
```

💡 Internal link giúp Google crawl site dễ hơn + chia sẻ authority giữa các trang.

#### 10. `external_links` (weight 3-4) — External links

**Kiểm gì:** External link có `rel="noopener noreferrer"`, không có broken

```html
<!-- ✅ Pass -->
<a href="https://google.com" rel="noopener noreferrer" target="_blank">Google</a>
```

**Lý do `noopener`:** security — trang đích không thao túng được trang nguồn qua `window.opener`.

#### 11. `broken_links` (F4 - weight 7) — Broken link check

**Kiểm gì:** Dùng `statusCode` crawler đã populate (cần `includeLinkChecks=true`)

**Severity:**
- Internal link 4xx/5xx → **FAIL** (hại crawl budget + UX)
- External link 4xx/5xx → **WARN** (chỉ hại UX)

**Cách fix internal broken:**
- URL đã đổi → redirect 301 từ URL cũ → URL mới
- Trang xoá hẳn → remove link hoặc thay bằng trang tương tự
- Link bị typo → sửa typo

**Cách fix external broken:**
- Tìm URL thay thế có content tương tự
- Dùng [Wayback Machine](https://web.archive.org) link snapshot nếu nguồn gốc mất
- Xoá link nếu không có thay thế

### 5.5 Category: Technical (9 rule)

#### 12. `canonical_url` (weight 5-7) — Canonical URL

```html
<link rel="canonical" href="https://example.com/course">
```

→ Tránh content duplicate (ví dụ `/course` và `/course/` và `/course?ref=fb` cùng content nhưng khác URL).

#### 13. `robots_meta` (weight 6) — Robots meta

```html
<!-- ✅ Cho phép Google index + follow -->
<meta name="robots" content="index,follow">

<!-- ❌ NGĂN Google index (check xem có vô tình để noindex không) -->
<meta name="robots" content="noindex,nofollow">
```

#### 14. `viewport_meta` (weight 8-10) — Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

→ **Bắt buộc** cho mobile. Thiếu = mobile render vỡ → Google downrank nặng.

#### 15. `https_check` (weight 10) — HTTPS

**Cách fix:**
- Mua SSL certificate (Let's Encrypt miễn phí)
- Setup HTTP → HTTPS redirect
- Force all resources qua HTTPS (tránh mixed content)

#### 16. `schema_org` (weight 5-6) — Structured data

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Khoá học SEO miễn phí",
  "author": { "@type": "Person", "name": "Minh Đức" },
  "datePublished": "2026-04-18",
  "image": "https://example.com/cover.webp"
}
</script>
```

→ Google có thể hiển thị rich snippets (stars, price, author) → CTR cao hơn.

#### 17. `http_status` (weight 8-10) — HTTP status

**Pass:** 200 · **Warn:** 301/302 · **Fail:** 4xx/5xx

#### 18. `url_structure` (weight 3-4) — URL structure

```
❌ Fail: https://example.com/page.php?id=42&cat=3&ref=fb
✅ Pass: https://example.com/blog/seo-cho-nguoi-moi
```

Rules:
- Ngắn gọn (< 60 ký tự)
- Lowercase
- Dùng dash `-`, KHÔNG underscore `_`
- Không query params phức tạp

#### 19. `language_tag` (weight 3-4) — HTML lang attribute

```html
<html lang="vi">   <!-- Tiếng Việt -->
<html lang="en">   <!-- English -->
```

→ Screen reader đọc đúng ngôn ngữ + Google hiểu nội dung phục vụ market nào.

#### 20. `favicon` (weight 2) — Favicon

```html
<link rel="icon" type="image/png" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

→ Hiển thị trên tab trình duyệt + bookmark + mobile home screen.

### 5.6 Category: Performance (1 rule)

#### 21. `page_size` (weight 4) — Page size

**Pass:** < 2MB · **Warn:** 2-5MB · **Fail:** > 5MB

**Cách giảm:**
- Minify HTML/CSS/JS (webpack, vite tự làm)
- Remove unused CSS (`purgecss`)
- Tree shake JS (import chỉ cái cần)
- Lazy load images (`loading="lazy"`)
- Compress (`gzip` / `brotli`)

### 5.7 Category: Content (1 rule)

#### 22. `readability` (F3 - weight 4) — Readability

**Chỉ áp dụng cho tiếng Anh** (`<html lang="en">`). Dùng công thức Flesch Reading Ease:

```
FRE = 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
```

| FRE | Grade | Status |
|---|---|:---:|
| 90-100 | Lớp 5 | ✅ Very easy |
| 60-70 | Lớp 8-9 (Plain English) | ✅ Pass |
| 30-60 | Đại học | 🟡 Warn |
| 0-30 | Postgrad | 🔴 Fail |

**Cách fix cho content English:**
- Viết câu ngắn (< 20 từ/câu)
- Dùng từ ít âm tiết ("use" thay vì "utilize", "help" thay vì "facilitate")
- Tránh jargon chuyên ngành khi không cần
- Target FRE 60-70 (Plain English level — đa số user hiểu)

**Tiếng Việt:** rule skip (VI monosyllabic → formula Flesch không áp dụng đúng). Không ảnh hưởng điểm.

---

## 📱 6. Core Web Vitals — đọc mobile vs desktop

Platform chạy Lighthouse **2 lần** (mobile + desktop) cho mỗi single-mode audit (F5).

### 3 metric quan trọng

| Metric | Full name | Target Good | Ảnh hưởng |
|---|---|:---:|---|
| **LCP** | Largest Contentful Paint | < 2.5s | Tốc độ thấy element lớn nhất |
| **INP** | Interaction to Next Paint | < 200ms | Độ trễ phản hồi click/type |
| **CLS** | Cumulative Layout Shift | < 0.1 | Mức nhảy layout (bad UX) |

### Mobile vs Desktop — chênh lệch bình thường

**Mobile thường tệ hơn desktop 10-50 điểm** vì Lighthouse mô phỏng:
- Mobile: Slow 4G (1.6Mbps, 150ms RTT) + CPU throttle 4×
- Desktop: Cable (10Mbps) + no CPU throttle

→ **Google dùng mobile score** (mobile-first indexing từ 2021) → **focus mobile**.

### Cách cải thiện

**LCP chậm:**
- Preload hero image: `<link rel="preload" as="image" href="...">`
- Dùng CDN (Cloudflare, Vercel)
- Compress image (WebP/AVIF)
- Xoá CSS/JS blocking render

**INP cao:**
- Giảm JavaScript execution
- Debounce / throttle event handlers
- Dùng `requestIdleCallback` cho non-critical work
- Code split, lazy load components

**CLS cao:**
- Set `width` + `height` cho mọi `<img>` → reserve space
- Không inject ads/embeds đột ngột vào viewport
- Dùng `font-display: optional` tránh FOIT

---

## 🔑 7. Keyword analysis — dùng từ khoá đúng cách

Platform tự tokenize content (hỗ trợ tiếng Việt + English) và trả:

- Top 20 từ xuất hiện nhiều nhất
- Density % của mỗi từ
- Placement: in_title / in_h1 / in_first_paragraph / in_meta

### Target keyword — strategic placement

Khi audit, **luôn nhập target keyword** bạn muốn rank. Rule kiểm trang có chứa nó **ở 4 vị trí chiến lược**:

| Vị trí | Tại sao quan trọng |
|---|---|
| `<title>` | Google weight cao nhất |
| `<h1>` | Topic chính của trang |
| First paragraph | "Above the fold" → user + Google đọc đầu tiên |
| Meta description | Hiển thị trên SERP snippet |

→ Thiếu bất kỳ vị trí nào = dấu hiệu keyword chưa được tối ưu.

### Density — 1-3% là sweet spot

```
Density = (số lần keyword xuất hiện / tổng từ trang) × 100%
```

| Density | Verdict | Ý nghĩa |
|---|:---:|---|
| < 0.5% | 🔴 Low | Keyword xuất hiện quá ít, Google không hiểu chủ đề |
| 1-3% | 🟢 Optimal | Sweet spot — đủ để Google nhận diện |
| 3-5% | 🟡 High | Có thể ổn, nhưng viết lại cho tự nhiên |
| > 5% | 🔴 Stuffing | Google phạt vì spam từ khoá |

⚠️ **Quan trọng:** Density hiện đại **ít quan trọng hơn xưa**. Google ưu tiên **semantic relevance** — các từ liên quan xung quanh. Đừng ám ảnh với %, viết tự nhiên là chính.

### LSI (Latent Semantic Indexing) keywords

Ngoài target keyword chính, thêm các từ **liên quan**:

Ví dụ target = "khoá học SEO" → thêm: "tối ưu công cụ tìm kiếm", "Google rank", "on-page SEO", "technical SEO", "Ahrefs", "SEMrush"...

→ Google dùng LSI để xác nhận chủ đề trang.

---

## ⏰ 8. Scheduled audit + alert — monitoring chiến lược

### Khi nào cần scheduled audit?

- Bạn serve nhiều client → không có thời gian audit thủ công hàng tuần
- Website đang grow nhanh → cần theo dõi health theo thời gian
- Dev team đẩy code thường xuyên → nguy cơ regression
- SEO là KPI chính → cần báo cáo trend dài hạn

### Chiến lược cron theo use case

| Use case | Cron | Mode | maxUrls |
|---|---|---|:---:|
| **Client report** hàng tuần | `0 8 * * MON` | site | 500 |
| **Ecommerce** monitor homepage | `0 */6 * * *` (6h/lần) | single | — |
| **Landing page** critical | `*/30 * * * *` (30m/lần) | single | — |
| **Blog-heavy** site tháng | `0 9 1 * *` (ngày 1 tháng) | site | 2000 |

### Đọc regression alert

Khi score tụt ≥ 10 điểm, platform tự ghi `AuditAlert`:

```json
{
  "type": "score_drop",
  "deltaScore": 15,
  "message": "SEO score dropped 15 points (from 85 to 70)",
  "createdAt": "2026-04-18T09:00:00Z"
}
```

**Khi nhận alert, check ngay:**

1. **Audit mới nhất** — xem rule nào chuyển từ pass → fail
2. **Git log** — dev đẩy code gì tuần qua?
3. **Deploy log** — có build fail không? config sai?
4. **DNS/SSL** — cert hết hạn? hosting down?

Top 3 nguyên nhân gây score drop:

| Nguyên nhân | % gặp | Fix |
|---|:---:|---|
| Dev vô tình đẩy `noindex` | 35% | Check `robots_meta`, revert commit |
| SSL cert expire → site HTTP | 25% | Renew cert + fix redirect |
| CDN/hosting down tạm thời | 20% | Đợi + notify team |
| Migration breaks URL structure | 10% | Check `http_status` fails |
| Khác | 10% | Audit detail từng rule |

### Site-down alert (type=site_down)

Score = 0 = crawler không fetch được trang. Check ngay:
- `ping domain.com` còn không
- DNS config OK không
- Cloudflare / load balancer live không
- Có bị rate limit / blocked không

---

## ✅ 9. Best practices — 10 checklist trước khi launch

Trước khi deploy website production, audit và đảm bảo:

- [ ] **Score tổng ≥ 80** (Excellent) hoặc tối thiểu ≥ 60 (Good)
- [ ] HTTPS enabled + redirect HTTP → HTTPS
- [ ] Viewport meta đúng: `width=device-width, initial-scale=1`
- [ ] Title tag mọi trang unique + 50-60 ký tự
- [ ] Meta description mọi trang unique + 120-160 ký tự
- [ ] H1 mỗi trang đúng 1 lần + chứa primary keyword
- [ ] Image alt cho mọi ảnh quan trọng (non-decorative)
- [ ] Canonical URL cho mọi trang (đặc biệt ecommerce với pagination)
- [ ] robots.txt tồn tại + không chặn trang quan trọng
- [ ] sitemap.xml tồn tại + submit lên Google Search Console
- [ ] CWV mobile: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Broken links = 0 (chạy audit với `includeLinkChecks: true`)
- [ ] 404 page custom (không white screen)
- [ ] Language tag `<html lang="vi">` hoặc `"en"`

💡 **Tip:** Save audit này làm **pre-launch baseline**. So sánh với audit tuần 1, tháng 1, tháng 3 sau launch.

---

## ⚠️ 10. Common mistakes — 7 lỗi hay gặp

### ❌ Mistake 1: "Tôi audit 1 lần, fix xong, xong việc"

**Đúng:** SEO là process liên tục. Code mới push = regression. Content mới = keyword density thay đổi. Google update algorithm = ranking rung động.

→ Dùng **scheduled audit** (F2) để auto-monitor.

### ❌ Mistake 2: "Nhồi target keyword vào title + meta + H1 + mọi đoạn"

**Đúng:** Google phạt keyword stuffing. Viết **tự nhiên**, đủ 4 vị trí chiến lược (title/h1/first-para/meta) là đủ.

### ❌ Mistake 3: "Desktop score cao = OK"

**Đúng:** Google rank theo **mobile**. Desktop 95 + mobile 45 → vẫn fail. Focus mobile trước.

### ❌ Mistake 4: "Audit xong thấy điểm 50, fix hết 22 rule"

**Đúng:** Fix rule weight 8-10 trước (xem Wave 1 Priority Playbook). Fix tất cả = waste effort vào favicon weight 2 thay vì h1 weight 9.

### ❌ Mistake 5: "Site-wide audit mỗi ngày"

**Đúng:** Site-wide tốn 25-40 phút + N×HTTP request. Chỉ chạy 1 lần/tuần hoặc /tháng. Dùng single-URL audit hàng ngày cho trang đang edit.

### ❌ Mistake 6: "Check broken-link mọi audit"

**Đúng:** Broken-link thêm 5-15s + overhead request. Chỉ bật khi:
- Site mới tiếp nhận → baseline
- Định kỳ tháng 1 lần
- Sau migration URL

### ❌ Mistake 7: "Điểm 100 = rank top Google"

**Đúng:** SEO on-page chỉ là **1/3** công thức. Còn:
- **Off-page** (backlinks từ site authority cao) — platform không cover
- **Content quality** (E-E-A-T: experience, expertise, authority, trust)
- **User signals** (dwell time, bounce rate, CTR)

→ Platform giúp **nền móng on-page**. Muốn rank top 1 vẫn cần content + link building.

---

## ❓ 11. FAQ

### Q: Platform có miễn phí mãi không?

**A:** Tier miễn phí: 10 audit/giờ/user, lịch sử audit không giới hạn, export PDF, share link. Tier pro (tương lai): API access, larger maxUrls, email alert delivery, white-label.

### Q: Có hỗ trợ tiếng Việt content không?

**A:** Có — keyword analysis hỗ trợ cả VI + EN. Rule `readability` (F3) skip cho VI vì công thức Flesch không áp dụng cho ngôn ngữ đơn âm tiết. Các rule khác áp dụng đồng đều.

### Q: Audit site-wide có tuân thủ robots.txt không?

**A:** Có — platform respect `Sitemap:` directive trong robots.txt và `crawl-delay`. Tuy nhiên crawler chỉ đọc từ sitemap, không đi sâu qua link (polite crawling).

### Q: Tôi có phải deploy tool này trên server riêng không?

**A:** Không bắt buộc. Bạn có thể:
- **Self-host**: clone repo, `docker-compose up`, dùng localhost (miễn phí)
- **Prod deploy**: xem [README Deployment](../README.md#-deployment) — cost < $40/tháng

### Q: Scheduled audit đang chạy mà Redis restart thì sao?

**A:** Platform có **boot reconciler** — khi service khởi động, tự re-register mọi schedule `isActive=true` từ Postgres vào BullMQ. Không mất state.

### Q: Điểm dưới 40 quá, không biết bắt đầu đâu?

**A:** Follow **Priority Playbook** (Section 3):
1. Wave 1 Critical quick wins (30 phút) — thường +40 điểm
2. Wave 2 Content & structure (1-2 giờ) — thường +20 điểm
3. Re-audit, lặp lại nếu cần

### Q: Làm sao biết tôi đã cải thiện theo thời gian?

**A:** Dùng feature **So sánh 2 audit** (UC-07):
- Dashboard → chọn 2 audit cùng URL → "So sánh"
- Xem: score delta, issues fixed, issues new, trend chart

### Q: Tool có detect AI-generated content không?

**A:** Không — tool này audit **kỹ thuật + structural SEO**, không đánh giá content quality. Với AI content, quality = quality writing quality + fact-check + original insight.

### Q: Có tool nào tương tự mã nguồn mở không?

**A:** Một số option khác:
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) — chỉ CWV, không có 22 rule
- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) — mạnh cho crawl, nhưng desktop app + paid
- [SEO Rank Monitor](https://github.com/osmelmora/SEO-Rank-Monitor) — chỉ rank tracking

→ Tool này = **lighthouse + 22 rule + site-wide + scheduled + VN support** tích hợp.

---

## 📞 Need help?

- 🐛 Bug report: [GitHub Issues](https://github.com/MinhDucoder/SEO-Analysts/issues)
- 📖 Docs kỹ thuật: [docs/design/](./design/)
- 📋 Spec sản phẩm: [PRD.md](./PRD.md)
- 🎯 Onboarding dự án: [PROJECT-GUIDE.md](./PROJECT-GUIDE.md)

---

<div align="center">

**Built for Vietnamese SEO community 🇻🇳**

[⬆ Back to top](#-user-guide--seo-analyst-platform)

</div>
