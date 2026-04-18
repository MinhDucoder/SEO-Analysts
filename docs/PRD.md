# PRD - SEO Analyst Platform v1.1

> Product Requirement Document
> Chuyển đổi từ: SEO_Report_v2.docx (Đồ án tốt nghiệp - ĐH GTVT)
> Ngày tạo: 2026-04-09 · **Cập nhật lớn 2026-04-18 (Tier 1 Upgrade)**

## Changelog

| Version | Date | Notes |
|---|---|---|
| v1.0 | 2026-04-09 | MVP từ doc gốc: 1 URL audit, 20 rule, 1 Lighthouse run (mobile) |
| **v1.1** | **2026-04-18** | **Tier 1 Upgrade** — thêm F1 site-wide crawl, F2 scheduled audits, F3 readability rule, F4 broken-link audit, F5 dual mobile+desktop Lighthouse. Số rule 20 → **22**. Thêm 3 bảng mới (`PageAudit`, `ScheduledAudit`, `AuditAlert`), 5 queue mới, 7 REST endpoint mới. Xem Section **5b** và Section **19**. |

---

## 1. Product Overview

### 1.1. Vấn đề cần giải quyết

Các công cụ SEO thương mại (Ahrefs $99-499/tháng, SEMrush $139-249/tháng, Moz Pro $99-179/tháng) quá đắt và phức tạp cho 3 nhóm đối tượng:
- Sinh viên học SEO / Digital Marketing
- Freelancer marketing mới vào nghề
- Chủ doanh nghiệp nhỏ và vừa (SME) tại Việt Nam

Nghịch lý: **người cần SEO nhất lại khó tiếp cận công cụ SEO nhất**.

### 1.2. Giải pháp

Nền tảng phân tích SEO website tự động:
- **Miễn phí** cho mức cá nhân
- **Giao diện đơn giản**, tập trung vào SEO on-page cốt lõi
- **22 rule SEO** với scoring và gợi ý cải thiện cụ thể (v1.1: +readability +broken_links)
- **Hai chế độ audit**: 1 URL (single) hoặc toàn domain (site-wide qua sitemap — v1.1 F1)
- **Lịch cron định kỳ** với regression alert tự động (v1.1 F2)
- **Dual Lighthouse** mobile + desktop song song (v1.1 F5)
- **Realtime progress** qua WebSocket
- **Xuất PDF** để chia sẻ
- Chi phí vận hành **< 40 USD/tháng**

### 1.3. Giá trị cốt lõi

1. **Accessibility**: Miễn phí, đơn giản, ai cũng dùng được
2. **Actionable**: Không chỉ chấm điểm mà đưa gợi ý cải thiện cụ thể
3. **Speed**: Phân tích xong trong < 10 giây (Cheerio) hoặc < 30 giây (Playwright)
4. **Transparency**: Score tính theo trọng số rõ ràng, user biết tại sao điểm thấp

### 1.4. Phạm vi MVP

**v1.0 (đã release 2026-04-17):**
- Phân tích SEO on-page (20 rule, mobile Lighthouse)
- Core Web Vitals (LCP, INP, CLS) via Lighthouse
- Keyword density analysis (VI/EN)
- 1-URL audit on-demand, lịch sử audit, so sánh, xuất PDF
- Admin panel

**v1.1 bổ sung (2026-04-18 — Tier 1):**
- **F1 Site-wide crawl**: audit toàn domain qua robots.txt → sitemap.xml, max 5000 URL
- **F2 Scheduled audits**: lịch cron định kỳ + regression alert (score drop ≥10 hoặc site down)
- **F3 Readability rule**: Flesch-Kincaid cho tiếng Anh (skip VN vì monosyllabic)
- **F4 Broken-link audit**: HEAD/GET fallback, redirect chain, internal broken = FAIL
- **F5 Dual Lighthouse**: mobile + desktop song song

**NGOÀI phạm vi (Tier 2+):**
- Backlink / Off-page SEO
- Keyword research đối thủ, rank tracking
- AI/ML content suggestions
- Multi-tenant / white-label
- Alert delivery transport (email/webhook/Slack) — MVP chỉ ghi `AuditAlert` row, hiển thị trong UI

---

## 2. Persona & User Goals

### Persona 1: Sinh viên SEO (Minh, 22 tuổi)
- **Bối cảnh**: Đang học Digital Marketing, cần thực hành phân tích website mẫu
- **Ngân sách**: 0 VNĐ
- **Mục tiêu**: Hiểu các rule SEO cơ bản, xem kết quả phân tích trực quan, nộp báo cáo bài tập
- **Pain point**: Không đủ tiền dùng Ahrefs/SEMrush, Google Search Console quá phức tạp
- **Key feature**: Xem chi tiết từng rule pass/fail + giải thích, xuất PDF

### Persona 2: Freelancer Marketing (Lan, 28 tuổi)
- **Bối cảnh**: Nhận project SEO cho SME, cần audit nhanh website khách hàng
- **Ngân sách**: < 500k VNĐ/tháng
- **Mục tiêu**: Audit nhanh → gửi báo cáo cho khách → đề xuất cải thiện
- **Pain point**: Phải dùng nhiều tool miễn phí rời rạc, mất thời gian tổng hợp
- **Key feature**: Audit nhanh, PDF có branding, lịch sử theo dõi tiến bộ

### Persona 3: Chủ SME (Hùng, 35 tuổi)
- **Bối cảnh**: Có website bán hàng, muốn cải thiện thứ hạng Google
- **Ngân sách**: < 200k VNĐ/tháng
- **Mục tiêu**: Kiểm tra định kỳ website, biết cần sửa gì
- **Pain point**: Không hiểu kỹ thuật, cần gợi ý rõ ràng bằng tiếng Việt
- **Key feature**: Score tổng quan, danh sách việc cần làm sắp xếp theo ưu tiên

### Persona 4: Admin (System Administrator)
- **Bối cảnh**: Quản lý hệ thống, kiểm soát người dùng
- **Mục tiêu**: Quản lý user, cấu hình trọng số rule, xem thống kê
- **Key feature**: Admin dashboard, lock/unlock user, rule weight config

---

## 3. User Flow (Step-by-step)

### Flow 1: First-time User → Audit
```
Landing Page → Click "Bắt đầu miễn phí"
    → Register Form (email, password, confirm password)
    → Email verification (status: pending_verification)
    → Verify email link → status: active
    → Login (email + password)
    → Dashboard (empty state: "Chưa có audit nào")
    → Click "Audit mới"
    → Modal: nhập URL + optional target keyword
    → Click "Bắt đầu phân tích"
    → Progress bar realtime (25% crawling → 50% analyzing → 75% reporting → 100% done)
    → Redirect to Audit Detail page
    → View: Score gauge + Radar chart + Issue list + Keywords tab + CWV tab
    → Click "Tải PDF" → download PDF
```

### Flow 2: Returning User → So sánh
```
Login → Dashboard (list of past audits as cards)
    → Filter by score range / search by URL
    → Click vào audit cũ → View detail
    → Click "Audit lại URL này" → new audit created
    → Sau khi completed → Click "So sánh với lần trước"
    → Comparison view: delta scores, issues fixed/new, trend chart
```

### Flow 3: Admin
```
Login (role=admin) → Admin Dashboard
    → Tab Users: list all users, search, lock/unlock
    → Tab Rules: list 20 rules with weight sliders, save
    → Tab Stats: charts (audits/day, top URLs, avg crawl time, success rate)
```

### Flow 4: Guest (không đăng nhập)
```
Landing Page → Xem thông tin sản phẩm, tính năng, pricing
    → Không thể tạo audit (require login)
    → Có thể truy cập shared audit link (public link nếu user share)
```

---

## 4. System Flow (Internal Processing)

### 4.1. Audit Pipeline (Core Flow)

```
[Frontend]                    [API Gateway]              [BullMQ/Redis]         [Workers]                [PostgreSQL]
    |                              |                          |                     |                        |
    |-- POST /audits {url} ------->|                          |                     |                        |
    |                              |-- validate JWT ----------|                     |                        |
    |                              |-- check rate limit ----->|                     |                        |
    |                              |-- INSERT audit(pending)->|                     |                        |-> audit row
    |                              |-- enqueue job ---------> | audit.crawl         |                        |
    |<-- 202 {auditId} -----------|                          |                     |                        |
    |                              |                          |                     |                        |
    |-- connect Socket.IO room(auditId)                      |-- pick job -------->|                        |
    |                              |                          |                     |-- Crawler Worker       |
    |<-- audit.progress(25%) ------|<--------------------------|<-- emit progress --|                        |
    |                              |                          |                     |-- fetch HTML           |
    |                              |                          |                     |   (Cheerio or Playwright)|
    |                              |                          |                     |-- enqueue audit.analyze |
    |                              |                          |                     |                        |
    |                              |                          |-- pick job -------->|-- Analyzer Worker      |
    |<-- audit.progress(50%) ------|<--------------------------|<-- emit progress --|                        |
    |                              |                          |                     |-- apply 20 SEO rules   |
    |                              |                          |                     |-- calculate scores     |
    |                              |                          |                     |-- enqueue audit.report  |
    |                              |                          |                     |                        |
    |                              |                          |-- pick job -------->|-- Report Worker        |
    |<-- audit.progress(75%) ------|<--------------------------|<-- emit progress --|                        |
    |                              |                          |                     |-- aggregate results    |
    |                              |                          |                     |-- INSERT audit_results->|-> result rows
    |                              |                          |                     |-- INSERT keywords ---->|-> keyword rows
    |                              |                          |                     |-- UPDATE audit(completed)|
    |<-- audit.completed(100%) ----|<--------------------------|<-- emit completed -|                        |
    |                              |                          |                     |                        |
    |-- GET /audits/:id ---------->|-- SELECT audit + results-|---------------------|----------------------->|
    |<-- 200 {audit, results} ----|                          |                     |                        |
```

### 4.2. Crawler Decision Logic

```
URL input
    ├── Fetch HTML via axios (timeout 10s)
    │   ├── Response has <div id="root"></div> or minimal DOM? → SPA detected
    │   │   └── Fallback to Playwright (headless Chromium)
    │   │       ├── Wait for networkidle (timeout 30s)
    │   │       ├── Extract rendered DOM
    │   │       └── Measure load time, resources
    │   └── Response has full HTML? → Static page
    │       └── Parse with Cheerio (~200ms)
    │           └── Extract DOM, meta tags, links, images
    └── Fetch failed?
        ├── HTTP 4xx/5xx → record issue "URL không thể truy cập"
        ├── Timeout → retry 2x with exponential backoff (5s, 10s)
        └── 3 failures → mark audit as 'failed'
```

### 4.3. SEO Score Calculation

```
SEO Score = Σ (rule_score × rule_weight) / Σ rule_weight

Mỗi rule trả về score 0-100:
  - pass: 100
  - warn: 50
  - fail: 0

Classification:
  - 80-100: Excellent (green)
  - 60-79: Good (blue)
  - 40-59: Fair (yellow)
  - 0-39: Poor (red)
```

### 4.4. Lighthouse Integration

```
Chạy Lighthouse programmatically (lighthouse npm package)
    → Output: performance, accessibility, best-practices, seo, pwa scores
    → Extract Core Web Vitals:
        - LCP (Largest Contentful Paint): target < 2.5s
        - FID/INP (First Input Delay / Interaction to Next Paint): target < 100ms
        - CLS (Cumulative Layout Shift): target < 0.1
    → Cache result in Redis (TTL: 1 hour, key: `lighthouse:${url_hash}`)
    → Avoid re-running for same URL within 1 hour
```

---

## 5. Feature Breakdown

### Feature 1: User Registration (UC-01)

**Mô tả**: Người dùng mới tạo tài khoản bằng email/password.

**User Story**: *As a guest, I want to register with email and password so that I can use the audit features.*

**Preconditions**: User chưa có tài khoản, đang ở trang /auth/register.

**Main Flow**:
1. User nhập: email, full_name, password, confirm_password
2. Frontend validate bằng Zod schema:
   - email: valid email format
   - full_name: 2-100 ký tự
   - password: >= 8 ký tự, ít nhất 1 chữ hoa + 1 số + 1 ký tự đặc biệt
   - confirm_password: khớp với password
3. Frontend gửi `POST /auth/register` với `{email, fullName, password}`
4. Backend validate lại (server-side)
5. Backend kiểm tra email chưa tồn tại trong DB
6. Backend hash password bằng bcrypt (cost factor 12)
7. Backend tạo user record (role='user', is_verified=false)
8. Backend gửi email xác minh (verification token, TTL 24h)
9. Backend trả về 201 `{user, message: "Vui lòng xác minh email"}`
10. Frontend redirect sang /auth/login với toast "Đăng ký thành công, vui lòng kiểm tra email"

**Edge Cases**:
- Email đã tồn tại → 409 "Email đã được sử dụng"
- Email format không hợp lệ → 400 validation error
- Password quá yếu → 400 với gợi ý cụ thể
- Rate limit: max 5 registrations/IP/hour → 429

**Error Cases**:
- Database connection failed → 500 "Lỗi hệ thống, vui lòng thử lại"
- Email service failed → Tạo user thành công nhưng log error, cho phép resend verification
- Request timeout → Frontend hiển thị "Đang xử lý..." và retry

**Business Rules**:
- BR-01: Mỗi email chỉ được đăng ký 1 lần
- BR-02: Password phải hash bằng bcrypt, KHÔNG lưu plaintext
- BR-03: User mới có is_verified=false, phải verify trước khi login
- BR-04: Verification token hết hạn sau 24h, có endpoint resend

---

### Feature 2: User Login (UC-02)

**Mô tả**: Đăng nhập bằng email/password, nhận JWT tokens.

**User Story**: *As a registered user, I want to log in so that I can access my dashboard and create audits.*

**Preconditions**: User đã đăng ký và xác minh email (is_verified=true).

**Main Flow**:
1. User nhập email + password, click "Đăng nhập"
2. Frontend gửi `POST /auth/login` với `{email, password}`
3. Backend tìm user theo email
4. Backend compare password bằng bcrypt.compare()
5. Nếu khớp:
   - Sinh access token (JWT, expiresIn=15m, payload: {sub: userId, role, email})
   - Sinh refresh token (random string, hash lưu DB, expiresIn=7d)
   - Set refresh token vào HttpOnly, Secure, SameSite=Strict cookie
   - Trả access token trong response body
6. Frontend lưu access token **trong memory** (KHÔNG localStorage)
7. Frontend redirect sang /dashboard

**Edge Cases**:
- Email không tồn tại → 401 "Email hoặc mật khẩu không đúng" (generic message)
- Password sai → 401 "Email hoặc mật khẩu không đúng" (generic message)
- User chưa verify email → 403 "Vui lòng xác minh email trước khi đăng nhập"
- User bị admin lock → 403 "Tài khoản đã bị khóa"
- Access token hết hạn → Frontend tự gọi `POST /auth/refresh` với cookie
- Refresh token hết hạn → Redirect về /auth/login

**Error Cases**:
- Brute force: Rate limit 10 login attempts/email/15min → 429 + lockout 15min
- DB down → 500

**Business Rules**:
- BR-05: KHÔNG tiết lộ email có tồn tại hay không (chống enumeration)
- BR-06: Access token = 15 min, refresh token = 7 days
- BR-07: Refresh token lưu hash trong DB, có thể revoke
- BR-08: Logout phải invalidate refresh token trong DB

---

### Feature 3: OAuth Login (Google) (UC-02b)

**Mô tả**: Đăng nhập bằng tài khoản Google.

**User Story**: *As a user, I want to sign in with Google so that I don't need to remember another password.*

**Main Flow**:
1. User click "Đăng nhập bằng Google"
2. Frontend redirect sang Google OAuth consent screen
3. User authorize → Google redirect callback với authorization code
4. Backend exchange code → Google access token → fetch user profile (email, name, avatar)
5. Backend kiểm tra email trong DB:
   - Đã tồn tại: link Google OAuth, login
   - Chưa tồn tại: tạo user mới (is_verified=true, oauth_provider='google', password_hash=null)
6. Sinh JWT tokens như flow thường
7. Redirect về /dashboard

**Edge Cases**:
- User đã đăng ký bằng email, giờ login Google cùng email → Link accounts, set oauth_provider='google'
- Google API down → 502 "Không thể kết nối Google"
- User cancel consent → Redirect back với error, hiển thị thông báo

**Business Rules**:
- BR-09: Google OAuth user tự động verified (không cần email verification)
- BR-10: User có thể có cả password + Google OAuth

---

### Feature 4: Create SEO Audit (UC-03/UC-05) - CORE FEATURE

**Mô tả**: User nhập URL, hệ thống tự động crawl + phân tích + chấm điểm SEO.

**User Story**: *As a logged-in user, I want to submit a URL and get a comprehensive SEO analysis so that I know what to improve on my website.*

**Preconditions**: User đã đăng nhập, còn quota audit (< 10 audit/hour cho free user).

**Main Flow**:
1. User click "Audit mới" trên Dashboard
2. Modal hiển thị form: URL input + optional target keyword input
3. User nhập URL (e.g., `https://example.com/page`)
4. Frontend validate URL bằng Zod:
   - Must start with http:// or https://
   - Must be valid URL format
   - Cannot be localhost, 127.0.0.1, 10.x.x.x, 192.168.x.x (SSRF prevention)
   - Cannot be IP-only (must have domain)
5. Frontend gửi `POST /audits` với `{url, targetKeyword?}`
6. Backend validate JWT → extract userId
7. Backend check rate limit: `SELECT COUNT(*) FROM audits WHERE user_id = ? AND created_at > NOW() - INTERVAL '1 hour'`
   - If >= 10 → 429 "Đã đạt giới hạn 10 audit/giờ"
8. Backend normalize URL (trim, lowercase domain, remove trailing slash)
9. Backend `INSERT INTO audits (id, user_id, url, domain, status, target_keyword) VALUES (uuid, userId, url, domain, 'pending', keyword)`
10. Backend enqueue BullMQ job: `queue.add('audit.crawl', {auditId, url}, {attempts: 3, backoff: {type: 'exponential', delay: 5000}})`
11. Backend return 202 `{auditId, status: 'pending'}`
12. Frontend connect Socket.IO room: `socket.join(auditId)`
13. Frontend navigate to `/audits/${auditId}` (detail page with progress)

**Worker Pipeline** (async, runs in background):

**Step A: Crawl** (Crawler Worker)
- Pick job from `audit.crawl` queue
- UPDATE audit SET status='crawling'
- Emit `audit.progress` (progress=25%, stage='crawling')
- Fetch URL:
  - Try axios GET with timeout 10s, User-Agent: "SEOAnalystBot/1.0"
  - Check if response indicates SPA (empty body, `<div id="root">`, `<div id="app">`)
  - If SPA: launch Playwright, navigate, wait networkidle (timeout 30s)
  - If static: parse with Cheerio
- Extract: raw HTML, rendered DOM, page title, load time, resources list, HTTP status
- Check robots.txt of domain → respect crawl rules
- Enqueue next: `queue.add('audit.analyze', {auditId, html, metadata})`

**Step B: Analyze** (Analyzer Worker)
- Pick job from `audit.analyze` queue
- UPDATE audit SET status='analyzing'
- Emit `audit.progress` (progress=50%, stage='analyzing')
- Parse DOM with Cheerio
- Apply 20 SEO rules (see Feature 5 for rule details)
- Run Lighthouse programmatically for Core Web Vitals (if not cached)
- Run Keyword Analyzer (see Feature 6)
- Enqueue next: `queue.add('audit.report', {auditId, ruleResults, lighthouseData, keywordData})`

**Step C: Report** (Report Worker)
- Pick job from `audit.report` queue
- UPDATE audit SET status='reporting'
- Emit `audit.progress` (progress=75%, stage='reporting')
- Calculate weighted SEO score
- INSERT audit_results (one row per rule check)
- INSERT keywords (top 20 keywords)
- UPDATE audit SET status='completed', seo_score=score, completed_at=NOW()
- Cache result in Redis (key: `audit:${auditId}`, TTL: 1h)
- Emit `audit.completed` (progress=100%, score, summary)

**Edge Cases**:
- URL returns non-2xx → Record as issue, audit status='completed' with score based on available checks
- URL has redirect chain → Follow up to 5 redirects, record redirect chain as info
- URL is very slow (>30s) → Retry 2x, then mark specific checks as 'timeout'
- URL requires authentication → Detect login form, record as issue "URL yêu cầu đăng nhập"
- URL returns huge page (>5MB HTML) → Truncate at 5MB, note in results
- Concurrent same URL by same user → Allow (different audit records, may have different timestamps)
- URL has non-UTF-8 encoding → Detect charset, convert to UTF-8

**Error Cases**:
- Crawler timeout after all retries → UPDATE audit SET status='failed', error message
- Playwright crash (OOM) → Graceful restart worker, retry job
- Redis down → BullMQ retries with backoff
- PostgreSQL down → Job stays in queue, retry when DB recovers

**Business Rules**:
- BR-11: Rate limit = 10 audits/hour/user (free tier)
- BR-12: Crawl timeout = 30s per attempt, max 3 attempts
- BR-13: Respect robots.txt but still analyze the URL (record as warning)
- BR-14: SSRF prevention: block private IPs, localhost, link-local addresses
- BR-15: Cheerio-first strategy: only use Playwright when SPA detected (save resources)
- BR-16: Lighthouse cache TTL = 1 hour per URL

---

### Feature 5: SEO Rule Engine (22 Rules — post-Tier 1)

**Mô tả**: Bộ 22 rule phân tích SEO on-page, mỗi rule trả về pass/warn/fail + score + message + suggestion.

> **v1.1 note:** Tăng từ 20 → 22 rule. Bổ sung `readability` (F3, category=content) và `broken_links` (F4, category=links). Category `content` là category mới thêm Tier 1.

**Rule Interface**:
```typescript
interface RuleResult {
  ruleName: string;        // e.g. "title_tag"
  category: string;        // 'meta' | 'headings' | 'images' | 'links' | 'performance' | 'technical'
  status: 'pass' | 'warn' | 'fail';
  score: number;           // 0-100
  weight: number;          // configurable by admin
  message: string;         // human-readable result
  suggestion: string | null; // actionable fix
  metadata: Record<string, any>; // raw data for debugging
}
```

**22 Rules chi tiết**:

| # | Rule Name | Category | Check Logic | Pass | Warn | Fail | Weight | Suggestion khi fail |
|---|-----------|----------|-------------|------|------|------|--------|-------------------|
| 1 | title_tag | meta | `<title>` exists, length 50-60 chars | 50-60 chars | 30-49 or 61-70 chars | Missing or <30 or >70 | 8 | "Thêm title tag dài 50-60 ký tự chứa từ khóa chính" |
| 2 | meta_description | meta | `<meta name="description">`, length 120-160 chars | 120-160 chars | 80-119 or 161-200 | Missing or <80 or >200 | 7 | "Thêm meta description 120-160 ký tự với CTA" |
| 3 | h1_tag | headings | Exactly 1 `<h1>`, contains target keyword | 1 H1 with keyword | 1 H1 without keyword | 0 or >1 H1 | 8 | "Đảm bảo trang có đúng 1 thẻ H1 chứa từ khóa chính" |
| 4 | heading_hierarchy | headings | H1→H2→H3 in correct order, no skipping | Correct hierarchy | Minor skip (H2→H4) | Major issues (no H2, H3 before H2) | 6 | "Sắp xếp heading theo thứ tự H1→H2→H3, không bỏ cấp" |
| 5 | image_alt | images | All `<img>` have non-empty alt attribute | >90% have alt | 70-90% have alt | <70% have alt | 7 | "Thêm thuộc tính alt mô tả cho tất cả hình ảnh" |
| 6 | canonical_url | technical | `<link rel="canonical">` present | Has canonical | Has canonical but different domain | Missing | 5 | "Thêm thẻ canonical URL để tránh trùng lặp nội dung" |
| 7 | robots_meta | technical | No accidental noindex/nofollow | index,follow or absent | nofollow only | noindex | 6 | "Xóa thẻ noindex nếu muốn trang xuất hiện trên Google" |
| 8 | viewport_meta | technical | `<meta name="viewport">` present with correct content | Present and correct | Present but missing width=device-width | Missing | 10 | "Thêm meta viewport cho mobile: width=device-width, initial-scale=1" |
| 9 | https | technical | Page served over HTTPS | HTTPS | Mixed content | HTTP only | 10 | "Chuyển website sang HTTPS, mua SSL certificate" |
| 10 | open_graph | meta | og:title + og:description + og:image present | All 3 present | 1-2 present | None | 5 | "Thêm Open Graph tags để tối ưu hiển thị khi chia sẻ trên mạng xã hội" |
| 11 | twitter_card | meta | `<meta name="twitter:card">` present | Present | - | Missing | 3 | "Thêm Twitter Card meta tags" |
| 12 | schema_org | technical | JSON-LD structured data present | Has JSON-LD | Has microdata only | None | 6 | "Thêm Schema.org JSON-LD structured data" |
| 13 | internal_links | links | >= 3 internal links, no broken | >=3 and no broken | 1-2 internal links | 0 or has broken links | 5 | "Thêm ít nhất 3 internal links đến các trang liên quan" |
| 14 | external_links | links | External links have proper rel attributes | All external have rel=noopener | Some missing rel | Broken external links | 3 | "Thêm rel='noopener noreferrer' cho external links" |
| 15 | image_optimization | images | Images use modern format, < 200KB each | All <200KB, WebP/AVIF | Some >200KB | Many >500KB or no compression | 5 | "Tối ưu hình ảnh: chuyển sang WebP, nén dưới 200KB" |
| 16 | page_size | performance | Total page weight < 2MB | <2MB | 2-5MB | >5MB | 4 | "Giảm dung lượng trang xuống dưới 2MB" |
| 17 | http_status | technical | Page returns HTTP 200 | 200 | 301/302 | 4xx/5xx | 8 | "Đảm bảo trang trả về HTTP 200" |
| 18 | url_structure | technical | URL short, readable, contains keyword | Short + keyword | Long but readable | Query params, unreadable | 4 | "Tối ưu URL: ngắn gọn, chứa từ khóa, dùng dấu gạch ngang" |
| 19 | language_tag | technical | `<html lang="...">` declared | Present | - | Missing | 3 | "Thêm thuộc tính lang vào thẻ html (e.g., lang='vi')" |
| 20 | favicon | technical | favicon.ico or `<link rel="icon">` present | Present | - | Missing | 2 | "Thêm favicon cho website" |
| 21 | readability (F3) | content | Flesch Reading Ease cho tiếng Anh (skip vi) | FRE ≥ 60 | 30 ≤ FRE < 60 | FRE < 30 | 4 | "Viết câu ngắn hơn, dùng từ ít âm tiết. Target FRE 60-70 (Plain English)" |
| 22 | broken_links (F4) | links | Dùng `LinkInfo.statusCode` do LinkChecker populate | All 2xx/3xx or no checks | External 4xx/5xx only | Any internal 4xx/5xx | 7 | "Fix internal broken links (hại crawl budget). Replace or remove external broken links" |

**Business Rules**:
- BR-17: Admin có thể thay đổi weight của từng rule
- BR-18: Nếu targetKeyword không được cung cấp, rule H1 check chỉ kiểm tra sự tồn tại
- BR-19: Rule results được lưu riêng từng row trong audit_results (dễ query, filter)
- BR-17b (v1.1): `broken_links` rule skip PASS khi `includeLinkChecks=false` (mọi `statusCode=0`)
- BR-17c (v1.1): `readability` rule skip PASS khi `html[lang]=vi` hoặc text < 30 từ

---

## 5b. Tier 1 Upgrade Features (v1.1)

5 feature mới thêm vào platform trong Tier 1 (2026-04-18). Mỗi feature có user-facing capability + kiến trúc impl tóm tắt; chi tiết xem [docs/design/](design/) và [docs/TIER1-ARCHITECTURE.md](TIER1-ARCHITECTURE.md).

### Feature 18: Site-wide Crawl (F1) — CORE FEATURE

**User Story:** *As a user, I want to audit my entire website (not just 1 URL) so that I can see which pages are dragging my domain SEO score down.*

**Preconditions:** User đã đăng nhập, domain có `sitemap.xml` hoặc `robots.txt` trỏ tới sitemap.

**Main Flow:**
1. User click "Audit toàn site" → chọn mode=site, maxUrls (default 500, max 5000).
2. `POST /audits { url: "https://example.com", mode: "site", maxUrls: 500 }`
3. Backend tạo Audit row mode=site, enqueue BullMQ `site-crawl.start`.
4. `SiteCrawlStartWorker` discover URL qua chain: robots.txt → sitemap index → sub-sitemaps.
   - Tuân thủ chuẩn [sitemaps.org](https://sitemaps.org): max 50k URL/sitemap file, 50MB, recursion depth ≤ 2.
   - Cap tại `maxUrls` hoặc `HARD_CAP_MAX_URLS_PER_AUDIT=5000`.
5. Fan-out N job `site-crawl.url-audit` (1 job/URL).
6. Mỗi `UrlAuditWorker`: crawl (skip Lighthouse) → gRPC `AnalyzePage` → publish `page-audit.done` → `SiteCrawlCounter.markDone`.
7. Khi counter complete → enqueue `site-crawl.aggregate` → compute avg, median, top-10 worst pages → publish `site-crawl.done`.
8. Gateway `SiteCrawlSubscriber` nhận event → finalize Audit (status=COMPLETED, seoScore=avgScore) + emit WebSocket `audit:completed` với summary.

**Edge Cases:**
- Sitemap >50k URL → truncate tại 5000, flag `truncated=true` trong metadata
- Sitemap index depth > 2 → skip deeper, log warning
- robots.txt chặn crawl → fail gracefully với error "Site blocks crawlers"
- Một URL riêng lẻ fail → record score=0, audit vẫn complete (graceful degradation)

**Business Rules:**
- BR-36: `maxUrls` cap tại 5000 (`HARD_CAP_MAX_URLS_PER_AUDIT`)
- BR-37: Per-URL audit skip Lighthouse (quá đắt cho N URL)
- BR-38: Per-URL analyze qua gRPC sync (không qua BullMQ để tránh flood queue)

---

### Feature 19: Scheduled Audits + Regression Alert (F2) — CORE FEATURE

**User Story:** *As an SEO freelancer, I want to schedule weekly audits of my client's websites so that I get alerted when their SEO score drops.*

**Preconditions:** User đã đăng nhập.

**Main Flow (tạo lịch):**
1. User click "Tạo lịch audit" → chọn URL, cron (ví dụ "0 9 * * MON" = 9h sáng thứ Hai), mode, maxUrls.
2. `POST /scheduled-audits { url, cron, mode, maxUrls? }`
3. Backend insert `ScheduledAudit` row + `upsertJobScheduler` vào BullMQ với key `sched:<userId>:<scheduleId>`.

**Main Flow (khi cron fire):**
1. BullMQ Job Scheduler fire → enqueue `scheduled-audit.tick`.
2. `ScheduledAuditTickWorker`: tạo Audit row mới cho user + Redis map `audit:<newAuditId>:schedule → <scheduleId>` (TTL 24h).
3. Enqueue `crawl.start` hoặc `site-crawl.start` tùy mode → chạy pipeline bình thường.
4. Khi audit xong, publish `report.done` / `site-crawl.done`.
5. `RegressionDetectorService` listen 2 channel → đọc Redis map → so sánh `newScore` với `ScheduledAudit.lastScore`:
   - Nếu `newScore === 0` → ghi `AuditAlert` type=`site_down`
   - Nếu `lastScore - newScore ≥ 10` (SCORE_DROP_THRESHOLD) → ghi `AuditAlert` type=`score_drop`, deltaScore
   - Update `ScheduledAudit.lastScore = newScore`.

**Lifecycle:**
- Pause: `PATCH /scheduled-audits/:id/pause` → `removeJobScheduler` + `isActive=false`
- Resume: `PATCH /scheduled-audits/:id/resume` → `upsertJobScheduler` + `isActive=true`
- Delete: `DELETE /scheduled-audits/:id` → cascade row + scheduler
- Boot reconcile: `ScheduledAuditsService.onModuleInit` re-register toàn bộ lịch `isActive=true` (tránh mất state khi Redis restart)

**Edge Cases:**
- Cron sai format → validation error 400 (class-validator regex check 5-field)
- User xoá account → CASCADE xoá ScheduledAudit + AuditAlert rows
- Scheduler fire nhưng DB row mất (drift) → `TickWorker` skip gracefully
- 2 cron fire gần nhau (ví dụ mỗi phút) → BullMQ Job Scheduler dedupe; MVP yêu cầu `MIN_CRON_INTERVAL_MINUTES=15`

**Business Rules:**
- BR-39: Cron tối thiểu 15 phút/lần (chống abuse)
- BR-40: SCORE_DROP_THRESHOLD = 10 điểm (có thể config tương lai)
- BR-41: AuditAlert.sentAt nullable — MVP chưa gửi email/webhook, UI hiển thị alert list
- BR-42: Pause schedule KHÔNG xoá AuditAlert history

---

### Feature 20: Readability Rule (F3)

**User Story:** *As a content writer, I want to see Flesch-Kincaid score so that I know if my content is easy to read for my audience.*

**Main Flow:**
- Analyzer chạy trên `PageData.textContent` + `PageData.language` (auto-detect từ `<html lang>`).
- Nếu `lang=en` và text ≥ 30 words: tính Flesch Reading Ease + Flesch-Kincaid Grade
- Nếu `lang=vi` hoặc text < 30 words: skip PASS với `metadata.applicable=false`
- Scoring: FRE ≥ 60 → PASS (Plain English), 30-59 → WARN, <30 → FAIL

**Tại sao skip VN?** Flesch formula được thiết kế cho English phonology. Tiếng Việt monosyllabic (mỗi tiếng = 1 âm tiết), công thức Flesch không áp dụng trực tiếp. Thay thế cho VN có thể tính avg-words-per-sentence, nhưng scope MVP skip.

---

### Feature 21: Broken-link Audit (F4, opt-in)

**User Story:** *As a site owner, I want to detect broken links on my pages so that I can fix them before Google crawl budget is wasted.*

**Main Flow:**
1. User request: `POST /audits { url, includeLinkChecks: true }`
2. Crawler sau khi extract PageData, collect tất cả `<a href>` (internal + external)
3. `LinkChecker.checkAll(hrefs)`:
   - HEAD-first với GET fallback khi server trả 405/501
   - Follow redirect manual (max 5 hop), record redirect chain
   - Timeout 5s/request, concurrency 10 global + 2 per-host (tránh DDoS domain đối tác)
   - Trả `LinkCheckResult[]` với `reason: HTTP_4XX | HTTP_5XX | NETWORK | TIMEOUT | TOO_MANY_REDIRECTS`
4. Orchestrator ghi `statusCode` ngược vào `LinkInfo` (reuse existing field, không cần proto change)
5. Analyzer rule `broken_links` đọc `LinkInfo.statusCode` → FAIL nếu internal broken, WARN nếu external broken

**Edge Cases:**
- URL 429 rate-limited → retry 1 lần với backoff 2s
- Redirect loop (A→B→A) → detect qua visited set, mark TOO_MANY_REDIRECTS
- Cloudflare chặn HEAD → fallback GET tự động

**Business Rules:**
- BR-43: Opt-in only (`includeLinkChecks: true` trong request body) — mặc định tắt vì thêm N HTTP request
- BR-44: Per-host concurrency cap 2 → không bị xem là DDoS
- BR-45: Internal broken = FAIL (hại crawl budget); external broken = WARN (chỉ UX)

---

### Feature 22: Dual Mobile + Desktop Lighthouse (F5)

**User Story:** *As a site owner, I want to see both mobile and desktop Core Web Vitals so that I can compare performance across form factors.*

**Main Flow:**
- `CrawlerOrchestrator.crawl` chạy `LighthouseRunner.runBoth(url)` thay vì 1 run
- Mobile: Slow 4G (1.6Mbps/150ms RTT) + 4× CPU throttle + viewport 412×823 (preset default)
- Desktop: Cable (10Mbps) + no CPU throttle + viewport 1350×940 (preset=desktop)
- 2 run mặc định chạy **tuần tự** (protect low-RAM 1GB Railway instances)
- Env flag `LIGHTHOUSE_PARALLEL=true` → Promise.all cả 2 (cần ≥2GB RAM)
- Kết quả lưu vào 10 cột mới trên `audits` table: `mobileScore/mobileLcpMs/mobileFcpMs/mobileClsScore/mobileInpMs` + `desktopScore/desktopLcpMs/desktopFcpMs/desktopClsScore/desktopInpMs`

**Edge Cases:**
- 1 form factor fail (vd desktop crash) → store partial, mobile vẫn có
- OOM → sequential mode default đã prevent

**Business Rules:**
- BR-46: Mobile score = primary SEO score (Google mobile-first indexing từ 2021)
- BR-47: Desktop cột nullable — backward compat với audit v1.0 chỉ có mobile

---

### Feature 6: Keyword Analysis

**Mô tả**: Phân tích mật độ từ khóa, vị trí xuất hiện trong trang.

**User Story**: *As a user, I want to see keyword density and placement so that I can optimize my content.*

**Main Flow**:
1. Extract text content từ rendered DOM (remove script, style, nav, footer)
2. Tokenize: lowercase, remove punctuation, split by whitespace
3. Remove stopwords (English + Vietnamese stopword lists)
4. Calculate Term Frequency (TF) cho mỗi unique word
5. Rank top 20 keywords by frequency
6. For each keyword:
   - Count frequency
   - Calculate density = (count / total_words) * 100
   - Check if in `<title>` tag
   - Check if in `<h1>` tag
   - Check if in first paragraph (first 100 words)
7. If targetKeyword provided:
   - Check placement in title, H1, first paragraph, meta description
   - Check density (optimal: 1-3%, stuffing: >5%)
8. INSERT keywords into `keywords` table

**Edge Cases**:
- Page has very little text (<50 words) → Note as issue "Nội dung quá ít"
- Page is mostly images → Note "Nội dung chủ yếu là hình ảnh, cần thêm text"
- Keyword stuffing detected (density > 5%) → Warn user
- Non-Latin characters (Vietnamese) → UTF-8 tokenizer handles correctly

**Business Rules**:
- BR-20: Optimal keyword density = 1-3%
- BR-21: Keyword stuffing threshold = 5%
- BR-22: Stop words list phải hỗ trợ cả English và Vietnamese

---

### Feature 7: View Audit Detail (UC-04)

**Mô tả**: Trang chi tiết hiển thị toàn bộ kết quả phân tích SEO.

**User Story**: *As a user, I want to view detailed audit results so that I understand what needs improvement.*

**Preconditions**: Audit status = 'completed', audit thuộc về user hiện tại.

**Main Flow**:
1. User navigate to `/audits/${auditId}`
2. Frontend gửi `GET /audits/:id`
3. Backend kiểm tra: audit.user_id === currentUser.id (hoặc admin)
4. Backend trả về: audit info + audit_results + keywords
5. Frontend render:
   - **Header**: URL, domain, score gauge (0-100 với màu), created_at, nút "Tải PDF"
   - **Tab 1 - Overview**: Radar chart 5 trục (Meta, Headings, Images, Links, Technical), summary stats
   - **Tab 2 - Issues**: Danh sách issues phân nhóm theo severity:
     - Critical (fail, weight >= 8): đỏ
     - Warning (warn): vàng
     - Info (pass): xanh
     - Mỗi issue: tên rule, message, suggestion, metadata
   - **Tab 3 - Core Web Vitals**: LCP, FID/INP, CLS với gauge charts + thresholds
   - **Tab 4 - Keywords**: Table top 20 keywords (keyword, frequency, density%, in_title, in_h1, in_first_paragraph)

**Edge Cases**:
- Audit đang processing → Show progress bar, auto-refresh when completed
- Audit failed → Show error message, offer "Thử lại"
- User try to access audit of another user → 403
- Audit not found → 404

---

### Feature 8: Audit History (UC-05)

**Mô tả**: Dashboard hiển thị danh sách audit đã thực hiện.

**User Story**: *As a user, I want to see my past audits so that I can track improvement over time.*

**Main Flow**:
1. User truy cập /dashboard
2. Frontend gửi `GET /audits?page=1&limit=20&sort=created_at&order=desc`
3. Backend query: `SELECT * FROM audits WHERE user_id = ? ORDER BY created_at DESC LIMIT 20 OFFSET 0`
4. Frontend render grid of audit cards:
   - Each card: URL (truncated), domain favicon, score (color-coded), status badge, created_at
   - Audit đang chạy: animated loading indicator + progress bar

**Filters**:
- Search by URL (ILIKE '%keyword%')
- Filter by score range: 0-39, 40-59, 60-79, 80-100
- Filter by status: completed, failed, processing
- Filter by date range

**Pagination**: 20 items/page, total count in response

**Edge Cases**:
- No audits → Empty state: "Chưa có audit nào. Bắt đầu audit đầu tiên!"
- Many audits (>1000) → Pagination, consider cursor-based if needed

---

### Feature 9: Compare Audits (UC-07)

**Mô tả**: So sánh 2 audit cùng domain để theo dõi tiến bộ.

**User Story**: *As a user, I want to compare two audits of the same URL to see what improved and what regressed.*

**Preconditions**: 2 audit cùng domain, cả 2 status='completed', thuộc cùng user.

**Main Flow**:
1. User chọn 2 audit (checkbox hoặc dropdown)
2. Frontend gửi `GET /audits/compare?audit1=id1&audit2=id2`
3. Backend validate: cùng user, cùng domain, cả 2 completed
4. Backend compute delta cho từng rule:
   - score_delta = audit2.score - audit1.score
   - status_change: fail→pass = "Fixed", pass→fail = "Regression"
5. Frontend render:
   - Overall score delta (+/- with color)
   - Table: rule name, audit1 status, audit2 status, delta, change indicator
   - Issues fixed (green list)
   - New issues (red list)
   - Trend chart (if >2 audits for same URL)

**Edge Cases**:
- Different domains → 400 "Chỉ có thể so sánh audit cùng domain"
- One audit is failed → 400 "Không thể so sánh audit chưa hoàn thành"

---

### Feature 10: Export PDF Report (UC-08)

**Mô tả**: Tải báo cáo PDF chi tiết của một audit.

**User Story**: *As a freelancer, I want to download a PDF report so that I can share it with my client.*

**Preconditions**: Audit status='completed', thuộc user hiện tại.

**Main Flow**:
1. User click "Tải PDF" trên trang audit detail
2. Frontend gửi `GET /audits/:id/export?format=pdf`
3. Backend validate JWT + ownership
4. Backend query audit + audit_results + keywords
5. Backend render HTML template (Handlebars) với data
6. Backend launch Playwright, `page.setContent(html)`, `page.pdf({format: 'A4'})`
7. Backend set headers:
   - Content-Type: application/pdf
   - Content-Disposition: attachment; filename="seo-report-{domain}-{date}.pdf"
8. Stream PDF buffer to client
9. Browser auto-downloads file

**PDF Content**:
- Cover page: "SEO Analysis Report", URL, date, score
- Executive summary: overall score, top 3 issues
- Detailed results by category
- Core Web Vitals section
- Keyword analysis table
- Recommendations prioritized by impact
- Footer: "Generated by SEO Analyst Platform"

**Edge Cases**:
- Audit not completed → 400 "Audit chưa hoàn thành"
- PDF generation timeout (>30s) → 504, suggest retry
- PDF too large (>10MB) → Compress images, limit content

**Business Rules**:
- BR-23: PDF max 5MB
- BR-24: PDF includes branding watermark "SEO Analyst Platform"
- BR-25: Future: allow custom logo/company name for Pro users

---

### Feature 11: Delete Audit (UC-05b)

**Mô tả**: Xóa một audit và tất cả dữ liệu liên quan.

**User Story**: *As a user, I want to delete an old audit to keep my dashboard clean.*

**Main Flow**:
1. User click "Xóa" trên audit card hoặc detail page
2. Confirmation dialog: "Bạn có chắc chắn muốn xóa audit này?"
3. Frontend gửi `DELETE /audits/:id`
4. Backend validate ownership
5. Backend cascade delete: audit_results → keywords → audit
6. Return 204 No Content
7. Frontend remove card from UI, show toast "Đã xóa audit"

**Edge Cases**:
- Audit đang processing → Reject "Không thể xóa audit đang chạy"
- Already deleted → 404

---

### Feature 12: Admin - User Management

**Mô tả**: Admin quản lý danh sách users.

**User Story**: *As an admin, I want to manage users so that I can lock abusive accounts.*

**Preconditions**: User role='admin'.

**Main Flow**:
1. Admin truy cập /admin/users
2. `GET /admin/users?page=1&limit=20&search=keyword`
3. Display table: email, full_name, role, is_verified, created_at, audit_count, status (active/locked)
4. Actions per user:
   - Lock: `PATCH /admin/users/:id` body `{isLocked: true}` → User cannot login
   - Unlock: `PATCH /admin/users/:id` body `{isLocked: false}`
   - View audits: link to filtered audit list

**Edge Cases**:
- Admin cannot lock themselves
- Non-admin access /admin → 403 redirect

**Business Rules**:
- BR-26: Locked user nhận thông báo "Tài khoản đã bị khóa" khi login
- BR-27: Lock không xóa data, chỉ prevent login

---

### Feature 13: Admin - SEO Rule Configuration

**Mô tả**: Admin điều chỉnh trọng số các rule SEO.

**User Story**: *As an admin, I want to adjust rule weights so that scoring reflects current SEO best practices.*

**Main Flow**:
1. Admin truy cập /admin/rules
2. `GET /admin/rules` → list of 20 rules with current weights
3. Admin điều chỉnh weight bằng slider hoặc input (1-10)
4. Click "Lưu" → `PUT /admin/rules` body `{rules: [{name, weight}, ...]}`
5. Backend validate: all weights > 0
6. Backend update in DB/config
7. New weights apply to ALL future audits

**Business Rules**:
- BR-28: Weight thay đổi KHÔNG ảnh hưởng audit đã completed (score đã tính)
- BR-29: Weight range: 1-10 (integer)

---

### Feature 14: Admin - System Statistics

**Mô tả**: Dashboard thống kê cho admin.

**User Story**: *As an admin, I want to see system stats so that I can monitor usage and performance.*

**Main Flow**:
1. Admin truy cập /admin/stats
2. Backend aggregate queries:
   - Total users, new users today/this week/this month
   - Total audits, audits today/this week
   - Average crawl time
   - Success rate (completed / total)
   - Top 10 most audited domains
   - Audit distribution by score range
3. Frontend render:
   - KPI cards (total users, total audits, success rate, avg time)
   - Line chart: audits per day (last 30 days)
   - Bar chart: score distribution
   - Table: top domains

---

### Feature 15: Realtime Progress (WebSocket)

**Mô tả**: Cập nhật tiến độ audit theo thời gian thực.

**User Story**: *As a user, I want to see real-time progress so that I know the analysis is running.*

**Main Flow**:
1. After creating audit, frontend connects to Socket.IO
2. Frontend joins room: `audit:${auditId}`
3. Workers emit events through Redis adapter:
   - `audit.progress`: `{auditId, progress: 25|50|75, stage: 'crawling'|'analyzing'|'reporting'}`
   - `audit.completed`: `{auditId, progress: 100, score, summary}`
   - `audit.failed`: `{auditId, error: 'message'}`
4. Frontend updates progress bar and stage label in real-time
5. On `audit.completed`: invalidate TanStack Query cache, fetch full results

**Edge Cases**:
- Socket disconnects → Auto reconnect (Socket.IO built-in)
- User navigates away and back → Reconnect to room, fetch current status via REST
- Multiple browser tabs → All tabs receive updates

**Business Rules**:
- BR-30: Socket.IO authenticates via JWT (query param on connect)
- BR-31: Users can only join rooms for their own audits
- BR-32: Redis adapter required for multi-instance deployment

---

### Feature 16: User Profile Management (UC-08b)

**Mô tả**: User cập nhật thông tin cá nhân.

**Main Flow**:
- View profile: `GET /auth/me`
- Update name: `PATCH /users/profile` body `{fullName}`
- Change password: `PATCH /users/password` body `{currentPassword, newPassword}`
  - Must verify current password first
  - New password same validation rules as registration

**Edge Cases**:
- Wrong current password → 400
- OAuth-only user tries to change password → 400 "Tài khoản đăng nhập bằng Google không có mật khẩu"

---

### Feature 17: Shared Audit Link

**Mô tả**: User chia sẻ link audit công khai.

**User Story**: *As a freelancer, I want to share an audit result link with my client.*

**Main Flow**:
1. User click "Chia sẻ" trên audit detail
2. Backend generate shareable token: `POST /audits/:id/share` → `{shareToken, shareUrl}`
3. Share URL: `/shared/audits/{shareToken}`
4. Anyone with link can view (no login required, read-only)

**Business Rules**:
- BR-33: Share token là random string, không chứa audit ID
- BR-34: User có thể revoke share link
- BR-35: Shared view không hiển thị user info

---

## 6. Functional Requirements

| ID | Requirement | Priority | Feature Ref |
|----|------------|----------|-------------|
| FR-01 | Đăng ký tài khoản bằng email/password với validation | High | Feature 1 |
| FR-02 | Đăng nhập bằng email/password, nhận JWT tokens | High | Feature 2 |
| FR-03 | Đăng nhập bằng Google OAuth 2.0 | Medium | Feature 3 |
| FR-04 | Tạo SEO audit bằng URL, xử lý async qua BullMQ | High | Feature 4 |
| FR-05 | Crawl HTML/DOM (Cheerio cho static, Playwright cho SPA) | High | Feature 4 |
| FR-06 | Áp dụng 20 rule SEO on-page và chấm điểm | High | Feature 5 |
| FR-07 | Phân tích keyword density và placement | High | Feature 6 |
| FR-08 | Đo Core Web Vitals qua Lighthouse (cache 1h) | High | Feature 4 |
| FR-09 | Hiển thị audit detail với charts và issue list | High | Feature 7 |
| FR-10 | Lưu và hiển thị lịch sử audit có phân trang | Medium | Feature 8 |
| FR-11 | So sánh 2 audit cùng domain | Medium | Feature 9 |
| FR-12 | Xuất báo cáo PDF | Medium | Feature 10 |
| FR-13 | Xóa audit (cascade delete) | Low | Feature 11 |
| FR-14 | Admin: quản lý users (list, lock, unlock) | Medium | Feature 12 |
| FR-15 | Admin: cấu hình trọng số rule SEO | Medium | Feature 13 |
| FR-16 | Admin: xem thống kê hệ thống | Low | Feature 14 |
| FR-17 | Realtime progress via Socket.IO | High | Feature 15 |
| FR-18 | Cập nhật profile và đổi mật khẩu | Low | Feature 16 |
| FR-19 | Chia sẻ link audit công khai | Low | Feature 17 |
| FR-20 | Rate limiting: 10 audit/hour/user, 60 req/min/user | High | Feature 4 |
| FR-21 | SSRF prevention: block private IPs, localhost | High | Feature 4 |
| FR-22 | Email verification khi đăng ký | High | Feature 1 |
| FR-23 | Refresh token rotation | High | Feature 2 |
| FR-24 | Dark mode toggle | Low | UI |
| FR-25 | Responsive design (320px - 2560px) | Medium | UI |
| FR-26 | Đăng xuất (invalidate refresh token) | High | Feature 2 |
| FR-27 | Quên mật khẩu (reset password via email) | Medium | Feature 16 |
| FR-28 | Lọc audit theo score/status/date | Medium | Feature 8 |
| FR-29 | Tìm kiếm audit theo URL | Medium | Feature 8 |
| FR-30 (v1.1) | Audit site-wide từ sitemap.xml với `mode=site` + `maxUrls` (max 5000) | High | Feature 18 |
| FR-31 (v1.1) | Lưu per-URL results (`PageAudit` rows) cho site audit | High | Feature 18 |
| FR-32 (v1.1) | Tạo/list/pause/resume/xoá lịch cron audit định kỳ | Medium | Feature 19 |
| FR-33 (v1.1) | Phát hiện regression (score drop ≥10 hoặc score=0) → ghi `AuditAlert` row | Medium | Feature 19 |
| FR-34 (v1.1) | Readability rule (Flesch-Kincaid) cho tiếng Anh | Medium | Feature 20 |
| FR-35 (v1.1) | Broken-link audit opt-in (`includeLinkChecks=true`) với HEAD/GET fallback, redirect chain | Medium | Feature 21 |
| FR-36 (v1.1) | Dual mobile + desktop Lighthouse cho mỗi single-mode audit | High | Feature 22 |
| FR-37 (v1.1) | WebSocket `audit:completed` payload có thêm `summary` cho site-mode | High | Feature 18 |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement | Metric |
|----|----------|-------------|--------|
| NFR-01 | Performance | Thời gian phân tích SEO hoàn chỉnh | <= 30s (p95) |
| NFR-02 | Performance | API response time (cached) | <= 200ms (p95) |
| NFR-03 | Performance | Frontend initial page load | <= 2s on 4G |
| NFR-04 | Performance | Concurrent audit throughput | >= 10 req/min |
| NFR-05 | Scalability | Horizontal scale via Docker | 1→5 instances, zero downtime |
| NFR-06 | Scalability | BullMQ queue capacity | 100+ jobs without loss |
| NFR-07 | Scalability | DB connection pool | >= 20 concurrent connections |
| NFR-08 | Security | JWT expiration | Access: 15min, Refresh: 7 days |
| NFR-09 | Security | API rate limiting | 60 req/min/user |
| NFR-10 | Security | URL input validation | 100% through whitelist validation |
| NFR-11 | Security | HTTPS enforcement | TLS 1.2+, HSTS |
| NFR-12 | Security | Password hashing | bcrypt, salt rounds >= 12 |
| NFR-13 | Security | XSS prevention | Access token in memory (NOT localStorage) |
| NFR-14 | Security | CSRF protection | SameSite=Strict cookies |
| NFR-15 | Reliability | System uptime | >= 99% |
| NFR-16 | Reliability | Failed job retry | 3x with exponential backoff |
| NFR-17 | Reliability | Error handling | Clear messages, no stack trace exposure |
| NFR-18 | Maintainability | Test coverage (business logic) | >= 70% |
| NFR-19 | Maintainability | Structured logging | Correlation ID per request |
| NFR-20 | Maintainability | API documentation | 100% Swagger/OpenAPI coverage |
| NFR-21 | Usability | Responsive design | 320px - 2560px |
| NFR-22 | Usability | Task completion efficiency | Audit in <= 3 clicks from landing |
| NFR-23 | Cost | Monthly infrastructure | < 40 USD/month |
| NFR-24 | Data | Audit data retention | Indefinite (user can delete) |

---

## 8. Data Model

### 8.1 Entity: users

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NULLABLE | null nếu OAuth-only |
| full_name | VARCHAR(100) | NOT NULL | |
| role | ENUM('user','admin') | DEFAULT 'user' | |
| is_verified | BOOLEAN | DEFAULT false | |
| is_locked | BOOLEAN | DEFAULT false | Admin lock/unlock |
| oauth_provider | VARCHAR(50) | NULLABLE | 'google' or null |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### 8.2 Entity: audits

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, ON DELETE CASCADE | |
| url | TEXT | NOT NULL | Full URL analyzed |
| domain | VARCHAR(255) | NOT NULL | Extracted domain |
| status | ENUM | NOT NULL | 'pending','crawling','analyzing','reporting','completed','failed' |
| seo_score | DECIMAL(5,2) | NULLABLE | 0-100, set on completion |
| target_keyword | VARCHAR(255) | NULLABLE | User-provided keyword |
| error_message | TEXT | NULLABLE | Error details if failed |
| completed_at | TIMESTAMPTZ | NULLABLE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**:
- `idx_audits_user_created`: (user_id, created_at DESC) - dashboard list
- `idx_audits_domain`: (domain) - for comparison queries
- `idx_audits_status`: (status) - for admin stats

### 8.3 Entity: audit_results

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| audit_id | UUID | FK → audits.id, ON DELETE CASCADE | |
| category | VARCHAR(50) | NOT NULL | 'meta','headings','images','links','performance','technical' |
| check_name | VARCHAR(100) | NOT NULL | e.g. 'title_tag', 'h1_tag' |
| status | ENUM('pass','warn','fail') | NOT NULL | |
| score | DECIMAL(5,2) | NOT NULL | 0-100 |
| weight | INTEGER | NOT NULL | Weight used at time of calculation |
| message | TEXT | NOT NULL | Human-readable result |
| suggestion | TEXT | NULLABLE | Actionable fix |
| metadata | JSONB | NULLABLE | Raw data (e.g., list of images without alt) |

**Indexes**:
- `idx_audit_results_audit`: (audit_id)
- `idx_audit_results_status`: (audit_id, status)
- GIN index on metadata

### 8.4 Entity: keywords

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| audit_id | UUID | FK → audits.id, ON DELETE CASCADE | |
| keyword | VARCHAR(255) | NOT NULL | |
| frequency | INTEGER | NOT NULL | |
| density | DECIMAL(5,2) | NOT NULL | Percentage |
| in_title | BOOLEAN | DEFAULT false | |
| in_h1 | BOOLEAN | DEFAULT false | |
| in_first_paragraph | BOOLEAN | DEFAULT false | |

**Index**: (audit_id)

### 8.5 Entity: refresh_tokens (bổ sung - document gốc thiếu)

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, ON DELETE CASCADE | |
| token_hash | VARCHAR(255) | NOT NULL | bcrypt hash of refresh token |
| expires_at | TIMESTAMPTZ | NOT NULL | created_at + 7 days |
| is_revoked | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### 8.6 Entity: share_links (bổ sung - document gốc thiếu)

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| audit_id | UUID | FK → audits.id, ON DELETE CASCADE | |
| token | VARCHAR(64) | UNIQUE, NOT NULL | Random share token |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### 8.7 Entity: seo_rules (bổ sung - cho admin config)

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | e.g. 'title_tag' |
| display_name | VARCHAR(100) | NOT NULL | e.g. 'Title Tag' |
| category | VARCHAR(50) | NOT NULL | v1.1: thêm category 'content' |
| weight | INTEGER | NOT NULL, CHECK(1-10) | Admin-configurable |
| is_enabled | BOOLEAN | DEFAULT true | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed v1.1:** 22 rows (thêm `readability`, `broken_links`).

### 8.8 Entity: audits — bổ sung v1.1 columns

Các cột mới thêm vào bảng `audits` trong Tier 1:

| Column | Type | Notes |
|---|---|---|
| mode | ENUM('single','site') | Default 'single'. Site mode → fan-out site-wide audit |
| discovered_urls_count | INTEGER NULLABLE | Tổng URL discover được (site mode) |
| audited_urls_count | INTEGER NULLABLE | URL audit thành công (site mode) |
| mobile_score | INTEGER NULLABLE | F5 Lighthouse mobile score 0-100 |
| mobile_lcp_ms | INTEGER NULLABLE | F5 |
| mobile_fcp_ms | INTEGER NULLABLE | F5 |
| mobile_cls_score | DOUBLE PRECISION NULLABLE | F5 |
| mobile_inp_ms | INTEGER NULLABLE | F5 |
| desktop_score | INTEGER NULLABLE | F5 Lighthouse desktop score 0-100 |
| desktop_lcp_ms | INTEGER NULLABLE | F5 |
| desktop_fcp_ms | INTEGER NULLABLE | F5 |
| desktop_cls_score | DOUBLE PRECISION NULLABLE | F5 |
| desktop_inp_ms | INTEGER NULLABLE | F5 |

### 8.9 Entity: page_audits (v1.1 — F1)

One row per URL crawled trong site-mode audit. Single-mode → table rỗng.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| audit_id | UUID | FK audits.id CASCADE | |
| url | TEXT | NOT NULL | |
| score | INTEGER | NOT NULL | 0-100 |
| issues | JSONB | NOT NULL DEFAULT '[]' | Array snapshot từ analyzer |
| fetched_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `idx_page_audits_audit(audit_id)`, `idx_page_audits_score(score)` (filter worst 10).

### 8.10 Entity: scheduled_audits (v1.1 — F2)

Lịch cron định kỳ do user sở hữu.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK users.id CASCADE | |
| url | TEXT | NOT NULL | |
| cron | VARCHAR(255) | NOT NULL | 5-field: "minute hour dom month dow" |
| mode | ENUM AuditMode | DEFAULT 'single' | |
| max_urls | INTEGER NULLABLE | Site-mode cap | |
| target_keyword | VARCHAR(255) NULLABLE | | |
| last_run_at | TIMESTAMPTZ NULLABLE | Set bởi TickWorker | |
| last_score | INTEGER NULLABLE | Set bởi RegressionDetector | |
| is_active | BOOLEAN | DEFAULT true | false = paused, remove scheduler |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Indexes:** `idx_scheduled_audits_user(user_id)`, `idx_scheduled_audits_active(is_active)`.

### 8.11 Entity: audit_alerts (v1.1 — F2)

Alert do `RegressionDetectorService` ghi.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| audit_id | UUID | FK audits.id CASCADE | |
| schedule_id | UUID NULLABLE | FK scheduled_audits.id SET NULL | Null cho one-off audits |
| type | ENUM AlertType | NOT NULL | score_drop \| new_issues \| site_down |
| delta_score | INTEGER NULLABLE | Dùng cho score_drop | |
| message | TEXT | NOT NULL | |
| sent_at | TIMESTAMPTZ NULLABLE | Null = chưa gửi email/webhook | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `idx_audit_alerts_audit`, `idx_audit_alerts_schedule`, `idx_audit_alerts_created`.

**Migration:** [apps/gateway/prisma/migrations/20260418140000_add_scheduled_audits/migration.sql](../apps/gateway/prisma/migrations/20260418140000_add_scheduled_audits/migration.sql)

---

## 9. API Surface

### 9.1 Authentication

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | /api/v1/auth/register | No | Đăng ký | `{email, fullName, password}` | 201: `{user, message}` |
| POST | /api/v1/auth/login | No | Đăng nhập | `{email, password}` | 200: `{user, accessToken}` + cookie |
| POST | /api/v1/auth/refresh | Cookie | Refresh token | - | 200: `{accessToken}` |
| POST | /api/v1/auth/logout | JWT | Đăng xuất | - | 200: `{message}` |
| GET | /api/v1/auth/me | JWT | Get current user | - | 200: `{user}` |
| GET | /api/v1/auth/google | No | Google OAuth redirect | - | 302 redirect |
| GET | /api/v1/auth/google/callback | No | Google OAuth callback | - | 302 redirect + set tokens |
| POST | /api/v1/auth/verify-email | No | Verify email | `{token}` | 200: `{message}` |
| POST | /api/v1/auth/resend-verification | No | Resend verification | `{email}` | 200: `{message}` |
| POST | /api/v1/auth/forgot-password | No | Request password reset | `{email}` | 200: `{message}` |
| POST | /api/v1/auth/reset-password | No | Reset password | `{token, newPassword}` | 200: `{message}` |

### 9.2 Audits

| Method | Endpoint | Auth | Description | Request/Query | Response |
|--------|----------|------|-------------|--------------|----------|
| POST | /api/v1/audits | JWT | Create audit | `{url, mode?:'single'\|'site', targetKeyword?, maxUrls?, includeLinkChecks?}` | 202: `{auditId, status, mode}` |
| GET | /api/v1/audits | JWT | List user's audits | `?page&limit&sort&order&search&scoreMin&scoreMax&status&dateFrom&dateTo` | 200: `{data[], total, page, limit}` |
| GET | /api/v1/audits/:id | JWT | Get audit detail | - | 200: `{audit, results[], keywords[], pageAudits?[], siteSummary?}` |
| GET | /api/v1/audits/:id/status | JWT | Get audit progress | - | 200: `{status, progress, stage}` |
| DELETE | /api/v1/audits/:id | JWT | Delete audit | - | 204 |
| GET | /api/v1/audits/:id/export | JWT | Export PDF | `?format=pdf` | 200: application/pdf |
| GET | /api/v1/audits/compare | JWT | Compare 2 audits | `?audit1&audit2` | 200: `{delta, improvements[], regressions[]}` |
| POST | /api/v1/audits/:id/share | JWT | Create share link | - | 201: `{shareToken, shareUrl}` |
| DELETE | /api/v1/audits/:id/share | JWT | Revoke share link | - | 204 |

**v1.1 Body mới:**
- `mode` (enum `single`\|`site`, default `single`) — F1
- `maxUrls` (1-5000, chỉ dùng `mode=site`) — F1
- `includeLinkChecks` (boolean, default false) — F4

### 9.2b Scheduled Audits (v1.1 — F2)

| Method | Endpoint | Auth | Description | Request/Query | Response |
|--------|----------|------|-------------|--------------|----------|
| POST | /api/v1/scheduled-audits | JWT | Tạo lịch cron | `{url, cron, mode?, maxUrls?, targetKeyword?}` | 201: `{id, ..., isActive: true}` |
| GET | /api/v1/scheduled-audits | JWT | List lịch của user | - | 200: `[{id, url, cron, lastRunAt, lastScore, isActive, ...}]` |
| GET | /api/v1/scheduled-audits/:id | JWT | Detail lịch | - | 200: `{schedule}` |
| PATCH | /api/v1/scheduled-audits/:id/pause | JWT | Pause (removeJobScheduler) | - | 200: `{..., isActive: false}` |
| PATCH | /api/v1/scheduled-audits/:id/resume | JWT | Resume (upsertJobScheduler) | - | 200: `{..., isActive: true}` |
| DELETE | /api/v1/scheduled-audits/:id | JWT | Xoá lịch | - | 204 |

**Validation:**
- `cron`: regex 5-field `^\S+\s+\S+\s+\S+\s+\S+\s+\S+$`, ví dụ `"0 9 * * MON"` (thứ Hai 9h sáng)
- `maxUrls`: 1-5000
- `targetKeyword`: max 255 chars

### 9.3 Shared (Public)

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | /api/v1/shared/audits/:shareToken | No | View shared audit | 200: `{audit, results[], keywords[]}` |

### 9.4 User Profile

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| PATCH | /api/v1/users/profile | JWT | Update profile | `{fullName?}` | 200: `{user}` |
| PATCH | /api/v1/users/password | JWT | Change password | `{currentPassword, newPassword}` | 200: `{message}` |

### 9.5 Admin

| Method | Endpoint | Auth | Description | Query/Body | Response |
|--------|----------|------|-------------|-----------|----------|
| GET | /api/v1/admin/users | Admin | List all users | `?page&limit&search` | 200: `{data[], total}` |
| PATCH | /api/v1/admin/users/:id | Admin | Lock/unlock user | `{isLocked: boolean}` | 200: `{user}` |
| GET | /api/v1/admin/rules | Admin | List SEO rules | - | 200: `{rules[]}` |
| PUT | /api/v1/admin/rules | Admin | Update rule weights | `{rules: [{name, weight}]}` | 200: `{rules[]}` |
| GET | /api/v1/admin/stats | Admin | System statistics | `?period=7d\|30d\|90d` | 200: `{stats}` |

### 9.6 WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `audit:progress` | Server→Client | `{auditId, progress: 0-100, stage, message?}` | Progress update. Stage bao gồm `crawling`, `analyze`, `report`, và v1.1 F1 stages: `site-crawl-discovery`, `site-crawl-fanout`, `site-crawl-audit`, `site-crawl-done` |
| `audit:completed` (single) | Server→Client | `{auditId, finalScore}` | Single-mode audit done |
| `audit:completed` (site, v1.1) | Server→Client | `{auditId, finalScore, summary: { rootUrl, totalUrls, auditedUrls, failedUrls, avgScore, medianScore, worstPages: [{ url, score, issueCount, error? }] }}` | Site-mode audit done — payload thêm `summary` do `SiteCrawlSubscriber` emit |
| `audit:failed` | Server→Client | `{auditId, error}` | Audit failed |

**Client-side events (Server nhận):**
| Event | Payload | Mô tả |
|---|---|---|
| `audit:subscribe` | `{ auditId }` | Join room `audit:<id>` để nhận progress |
| `audit:unsubscribe` | `{ auditId }` | Leave room |

### 9.7 Error Response Format (RFC 7807)
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "URL format không hợp lệ",
  "details": [{"field": "url", "message": "Must start with http:// or https://"}]
}
```

---

## 10. Document Gaps & Assumptions

### 10.1 Gaps trong document gốc (những thứ THIẾU)

| # | Gap | Impact | Giả định đưa ra |
|---|-----|--------|-----------------|
| 1 | **Không có bảng `refresh_tokens`** trong ERD | Không thể revoke token, không logout đúng cách | Bổ sung bảng refresh_tokens với token_hash, expires_at, is_revoked |
| 2 | **Không có bảng `seo_rules`** cho admin config | Admin không thể persist weight changes | Bổ sung bảng seo_rules với weight column |
| 3 | **Không có bảng `share_links`** | Feature chia sẻ link không có data model | Bổ sung bảng share_links |
| 4 | **Thiếu trường `is_locked` ở bảng users** | Admin không thể lock user | Bổ sung field is_locked BOOLEAN |
| 5 | **Thiếu trường `error_message` ở bảng audits** | Khi audit failed, không biết lý do | Bổ sung field error_message TEXT |
| 6 | **Thiếu trường `weight` ở bảng audit_results** | Không biết weight tại thời điểm tính score | Bổ sung field weight INTEGER |
| 7 | **Status enum thiếu 'crawling', 'analyzing', 'reporting'** | Chỉ có pending/processing/completed/failed, không đủ granularity cho progress | Mở rộng: pending, crawling, analyzing, reporting, completed, failed |
| 8 | **Email verification flow không rõ** | Nói "gửi email xác minh" nhưng không có endpoint verify, resend | Bổ sung endpoint verify-email, resend-verification |
| 9 | **Forgot password flow hoàn toàn thiếu** | Được liệt kê trong phân rã chức năng nhưng không có use-case | Bổ sung flow: forgot-password → email link → reset-password |
| 10 | **Shared audit link flow thiếu** | Được liệt kê nhưng không có API/data model | Bổ sung share_links table + API endpoints |
| 11 | **20 SEO rules chỉ liệt kê tên, không có logic chi tiết** | Dev không biết threshold nào là pass/warn/fail | Bổ sung bảng chi tiết cho mỗi rule (Section 5 Feature 5) |
| 12 | **CSV export được nhắc đến nhưng không đặc tả** | Liệt kê "Xuất CSV" trong phân rã chức năng nhưng không use-case | Defer to v1.1, không implement trong MVP |
| 13 | **Notification email flow thiếu** | "Thông báo audit hoàn thành" + "cấu hình thông báo email" chỉ nhắc tên | Defer to v1.1, MVP chỉ dùng Socket.IO realtime |
| 14 | **Lighthouse chạy thế nào với Cheerio path?** | Doc nói Cheerio cho static nhưng Lighthouse cần browser | Lighthouse chạy riêng bằng `lighthouse` npm package (tự launch Chrome), không phụ thuộc crawler path |
| 15 | **Inconsistency: Puppeteer vs Playwright** | Doc dùng cả 2 tên (Puppeteer trong architecture, Playwright trong use-case) | Chọn Playwright nhất quán (modern, cross-browser, Microsoft-maintained) |
| 16 | **Rate limit chưa rõ cho admin** | Admin có bị rate limit không? | Admin exempt from audit rate limit |
| 17 | **Concurrency cho BullMQ workers** | Chỉ nói "concurrency 3 jobs" nhưng không rõ cho service nào | Crawler: 3, Analyzer: 5, Report: 3 |
| 18 | **Thiếu health check endpoints** | Cần cho load balancer và monitoring | Bổ sung GET /health cho mỗi service |

### 10.2 Domain Knowledge Corrections

| # | Sai trong document | Đúng | Impact |
|---|-------------------|------|--------|
| 1 | **FID (First Input Delay)** được nhắc đến | Google đã thay FID bằng **INP (Interaction to Next Paint)** từ tháng 3/2024 | Cần đo INP thay vì FID |
| 2 | **"Microservices architecture"** cho 1 developer, 1 codebase | Thực tế đây là **modular monolith** hoặc **service-oriented monolith** vì deploy trên monorepo, cùng infra | Không ảnh hưởng code nhưng cần chính xác trong báo cáo. Thực tế dùng BullMQ workers trong cùng process hoặc tách workers là "modular monolith with async workers" |
| 3 | **Keyword density optimal 1-3%** | SEO hiện đại ít coi trọng density cố định, quan trọng hơn là semantic relevance. Tuy nhiên 1-3% vẫn là guideline hữu ích cho beginners | Keep 1-3% nhưng message nên nói "guideline" thay vì hard rule |
| 4 | **Code coverage 80% rồi lại nói 70%** | Document nói 80% ở requirements nhưng 70% ở testing section | Chọn 70% là realistic cho MVP |
| 5 | **Supabase cho Redis** | Supabase KHÔNG cung cấp managed Redis. Supabase chỉ có PostgreSQL + Auth + Storage + Realtime | Dùng Railway hoặc Upstash cho Redis managed |

---

## 11. Risks If Dev Builds From Original Document

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **SSRF vulnerability**: Document không đề cập deep SSRF prevention | Critical | Implement URL validation: block private IPs (10.x, 172.16-31.x, 192.168.x), localhost, link-local (169.254.x), IPv6 loopback. Resolve DNS before fetch to prevent DNS rebinding |
| 2 | **Puppeteer/Playwright confusion**: Codebase sẽ inconsistent | Medium | Quyết định rõ: Playwright everywhere. Remove Puppeteer references |
| 3 | **No refresh token table**: Login/logout sẽ broken, token cannot be revoked | High | Must add refresh_tokens table |
| 4 | **Lighthouse blocks main thread**: Chạy Lighthouse đồng bộ trong API sẽ block server | High | Phải chạy Lighthouse trong BullMQ worker, cache result |
| 5 | **Memory leak from Playwright**: Mỗi audit mở browser → OOM nếu nhiều concurrent | High | Pool Playwright browser instances, limit concurrent crawls, reuse browser context |
| 6 | **Missing CORS configuration**: Frontend (Vercel) vs Backend (Railway) different domains | Medium | Configure CORS whitelist in NestJS |
| 7 | **No graceful shutdown**: BullMQ worker bị kill → job stuck in 'active' | Medium | Implement graceful shutdown handler: close queue, wait for active jobs |
| 8 | **PDF generation in API process**: Playwright PDF đồng bộ block API thread | High | Generate PDF trong worker hoặc endpoint riêng với timeout |
| 9 | **No pagination on audit_results**: Single audit có 20+ results → OK. Nhưng admin query all results sẽ slow | Low | Always scope queries by audit_id |
| 10 | **FID metric deprecated**: Lighthouse đã chuyển sang INP | Medium | Đo INP thay vì FID, update UI labels |
| 11 | **No input sanitization for target keyword**: Potential SQL injection or XSS | High | Sanitize and parameterize all user inputs |
| 12 | **Supabase Redis assumption**: Supabase không có Redis → deployment sẽ fail | High | Dùng Upstash Redis (free tier: 10k commands/day) hoặc Railway Redis |
| 13 | **No database connection pooling config**: Prisma default pool size may be too small | Medium | Configure Prisma connection pool: `connection_limit=20` |
| 14 | **Missing error boundary in frontend**: Uncaught errors → white screen | Medium | Add React Error Boundary components |
| 15 | **No monitoring/alerting**: Production issues invisible | Medium | Add Sentry for error tracking, basic health checks |

---

---

## 19. Tier 1 Upgrade Delivery Log (v1.1)

Tham chiếu triển khai Tier 1 trong repo:

| Feature | Commits (git log) | Tests added | Key files |
|---|---|---|---|
| F1 Site-wide crawl | `4140792` (PageAuditResultStore) · `7a384a2` (UrlAuditWorker) · `8f8a5fc` (SiteCrawlAggregateWorker) · `acd806a` (gateway subscribers) · `2b5e005` (POST /audits routing) · `76ac1b1` (e2e) | +50 | [apps/crawler/src/crawler/controllers/site-crawl-start.worker.ts](../apps/crawler/src/crawler/controllers/site-crawl-start.worker.ts), [apps/gateway/src/audits/services/site-crawl-subscriber.service.ts](../apps/gateway/src/audits/services/site-crawl-subscriber.service.ts) |
| F2 Scheduled audits | `0368db5` (migration) · `96ed8f0` (service + worker + detector) | +28 | [apps/gateway/src/scheduled-audits/](../apps/gateway/src/scheduled-audits/) |
| F3 Readability | `9834858` (pre-Tier-1 lineage) | +11 | [apps/seo-analyzer/src/analyzer/domain/rules/content/readability.rule.ts](../apps/seo-analyzer/src/analyzer/domain/rules/content/readability.rule.ts) |
| F4 Broken links | `ac56422` (LinkChecker + shared) · `aa91614` (orchestrator integration) · `c332852` (analyzer rule) | +18 | [apps/crawler/src/crawler/infra/fetchers/link-checker.ts](../apps/crawler/src/crawler/infra/fetchers/link-checker.ts), [apps/seo-analyzer/src/analyzer/domain/rules/links/broken-links.rule.ts](../apps/seo-analyzer/src/analyzer/domain/rules/links/broken-links.rule.ts) |
| F5 Dual Lighthouse | `6605b66` · `658feda` · `87529d3` · `ce79b44` (pre-Tier-1 lineage) | +15 | [apps/crawler/src/crawler/services/lighthouse-runner.ts](../apps/crawler/src/crawler/services/lighthouse-runner.ts) |

**Monorepo gates sau Tier 1:**

| Gate | Result |
|---|---|
| `turbo run check-types` | 8/8 services pass |
| `turbo run test` | 448 tests (+127 từ v1.0 baseline) |
| `turbo run build` | 7/7 services build |
| `turbo run lint` | 0 errors (warnings only) |

**Planning docs cho Tier 1:**
- [docs/TIER1-BRAINSTORM.md](TIER1-BRAINSTORM.md) — research + 20+ nguồn uy tín
- [docs/TIER1-ARCHITECTURE.md](TIER1-ARCHITECTURE.md) — architecture lock-in, queue topology, DB schema
- [docs/TIER1-SUBPHASE1-PLAN.md](TIER1-SUBPHASE1-PLAN.md) — sub-phase 1 plan (F3 + F5)
- [docs/TIER1-SESSION-CONTEXT.md](TIER1-SESSION-CONTEXT.md) — resume point tracking

---

*PRD Version: 1.1 | Generated: 2026-04-09 | Tier 1 update: 2026-04-18 | Source: SEO_Report_v2.docx + Tier 1 architecture lock-in*
