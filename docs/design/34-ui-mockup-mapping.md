# 34 — UI Mockup Mapping

> **Mục tiêu:** Map 3 mockup HTML/PNG đang có (`webaudit`, `aigenerate`, `learning`) + thư mục `stitch_d_n_m_i/` → page specs đã viết.
>
> **Lưu ý:** Mockup có **brand name khác** (`Analytica Pro`, `Curator AI`) — chỉ tham khảo, không copy nguyên. Brand thật của project là `SEO Analyst`.

---

## 1. Danh sách mockup có sẵn

| File | Kích thước | Brand mockup | Nội dung |
|---|---|---|---|
| `webaudit.html` + `webaudit.png` | 512×590 | Analytica Pro | Website Audit page (kết quả + issues table) |
| `aigenerate.html` + `aigenerate.png` | 600×460 | Curator AI | AI Content Editor (3-column layout) |
| `learning.html` + `learning.png` | ~580×630 | Curator AI | Learning Academy (course cards) |
| `stitch_d_n_m_i/` | — | — | Thư mục Stitch AI — 13 sub-page mockup (Dashboard, Keyword Research, Backlink Checker, Rank Tracker, On-page SEO detail, Technical SEO detail, Performance detail, SEO Academy blog, Article detail, Website Audit Light, ...) |

---

## 2. `webaudit.png` → Audit detail page `/audits/:id`

### 2.1 So sánh mockup vs spec

| Element | Mockup | Spec tương ứng |
|---|---|---|
| **Sidebar trái** | "Analytica Pro" + SEO Intelligence + 9 nav items | [32-design-system.md §7.8](32-design-system.md) Sidebar pattern |
| **Page title** | "Website Audit" (top-right) | [31-page-specs.md §11](31-page-specs.md) header |
| **Hero card** | "Technical Deep-Dive Audit" + URL input + "Run Audit" button | Không map 1-1; page spec có `<Header>` với "Export PDF" + "Share" + "Re-audit" buttons |
| **Overall SEO Health card** | Circular gauge 84/100 + green stroke + "+2% from last week" | [31-page-specs.md §11.3](31-page-specs.md) Score hero `<ScoreGauge>` |
| **3 category cards** | Technical 92%, On-page 78%, Performance 64% với colored bar | Tab Overview → `<CategoryBarsCard>` — dùng pattern này |
| **Identified Issues table** | Description \| Category \| Priority \| Action | Tab "21 Rule" → `<IssuesTable>` |
| **Row status badges** | "On-page SEO" (blue), "Technical SEO" (red), "Performance" (green) | Match với `<Badge color={category}>` trong spec |
| **Priority badges** | "High" (red), "Medium" (yellow), "Low" (green) | Map sang CheckStatus: FAIL→red, WARN→yellow, PASS→green |
| **Fix Issue button** | Solid blue | Không áp dụng (spec không có "Fix Issue" tự động — chỉ hiển thị suggestion) |

### 2.2 Keeper / Changer

**Giữ nguyên từ mockup:**
- Sidebar pattern (dark slate bg + rounded-r-2xl + active state shadow-primary).
- Color palette (primary blue `#0052ff`, surface `#f8f9ff`, sidebar `slate-900`).
- Typography (Manrope headline + Inter body).
- Circular gauge với stroke classification-colored.
- Stat cards grid pattern.
- Issues table layout.

**Không dùng từ mockup:**
- "Fix Issue" action button — platform chỉ hiển thị suggestion, không tự fix.
- URL input trên audit detail → move lên `/audits/new` page.
- "+2% from last week" trend text → chỉ hiển thị nếu có data compare.
- Mấy trang trong sidebar mà project không có: "Keyword Research", "Backlink Checker", "Rank Tracker", "Competitors". Project chỉ có Dashboard + Audit + (Admin) Rules + Settings.

### 2.3 Customization cụ thể

**Sidebar cho project SEO Analyst:**
```tsx
<Sidebar>
  <Brand>
    <Logo />
    <Name>SEO Analyst</Name>
    <Tagline>Phân tích SEO Việt</Tagline>
  </Brand>

  <NavSection>
    <NavItem href="/dashboard" icon="dashboard">Dashboard</NavItem>
    <NavItem href="/audits" icon="security">Audit Website</NavItem>
  </NavSection>

  {isAdmin && (
    <NavSection label="Admin">
      <NavItem href="/admin/users" icon="group">Người dùng</NavItem>
      <NavItem href="/admin/rules" icon="rule">Rule SEO</NavItem>
      <NavItem href="/admin/stats" icon="analytics">Thống kê</NavItem>
    </NavSection>
  )}

  <NavSection position="bottom">
    <NavItem href="/settings/profile" icon="person">Hồ sơ</NavItem>
    <NavItem href="/settings/security" icon="shield">Bảo mật</NavItem>
    <Button variant="ghost" icon="logout" onClick={logout}>Đăng xuất</Button>
  </NavSection>
</Sidebar>
```

---

## 3. `aigenerate.png` → (không áp dụng trực tiếp)

### 3.1 Phân tích

Mockup này là **AI Content Editor** — trang generate bài viết với:
- 3-column: Sidebar (navigation) | Editor (textarea + toolbar) | Inspector (SEO score + audit checklist + keyword clusters + hero suggestion).

### 3.2 Inspiration cho project SEO Analyst

Dù project không có feature AI writing, có thể lấy ý:

| Mockup element | Áp dụng cho spec project |
|---|---|
| **Inspector 3-column layout** | Áp dụng cho audit detail — sidebar trái, content giữa, có thể add right-rail với "Quick fixes" / "Related articles" |
| **SEO Health Score 82/82 Optimized** | Match với `<ScoreGauge>` + classification badge |
| **Audit Checklist (3 items, check/alert icon)** | [31-page-specs.md §11.3](31-page-specs.md) tab "Overview" → `<TopIssuesCard>` với checkmark cho PASS, warning cho WARN |
| **Keyword Clusters (bar chart)** | [31-page-specs.md §11.3](31-page-specs.md) tab "Keywords" → Top 20 keywords with density bar |
| **Hero Suggestion card (dark image)** | Không áp dụng |

### 3.3 Kết luận

Mockup `aigenerate` **không phải template** cho bất kỳ page nào — chỉ đóng góp **design language** (layout 3 column pattern, inspector panel, card with dark hero image).

---

## 4. `learning.png` → Landing page `/` (inspiration)

### 4.1 Phân tích

Mockup này là **Learning Academy** — trang giới thiệu khoá học SEO với:
- Hero card "Master Search Dominance" (dark navy + illustration).
- Progress card "Your Learning Path" với progress ring 63% + academy module.
- Stats card "Time Invested 24.5 hours" + "Achievements 5 badges".
- Core Curriculum grid 3 column — course cards với cover image + progress bar + metadata.
- "Join our expert community" CTA với email input + gradient.

### 4.2 Áp dụng cho project

Landing `/` có thể tham khảo:

| Mockup element | Áp dụng landing `/` |
|---|---|
| **Dark hero card với illustration** | Hero section "Audit SEO miễn phí" với illustration |
| **Stats cards (Hours Invested, Achievements)** | Stats "10,000+ audit", "500+ domains", "99% uptime" |
| **Course cards grid** | Features cards grid (21 Rules, Core Web Vitals, Vietnamese Keyword, PDF, Share, Admin) |
| **CTA "Join community"** | CTA "Đăng ký miễn phí" + email input |

### 4.3 KHÔNG áp dụng cho page nào khác trong project

Project không có feature learning/academy. Nếu tương lai có blog/docs, có thể implement tương tự.

---

## 5. Thư mục `stitch_d_n_m_i/` — 13 sub-page

Thư mục này chứa mockup nhiều page từ Stitch AI. Hiện **rỗng** (chỉ có folder, không có file) — nhưng tên folder cho biết ý định ban đầu:

| Sub-folder | Page tên mockup | Map sang spec |
|---|---|---|
| `dashboard/` | Dashboard | → [31-page-specs.md §8](31-page-specs.md) `/dashboard` |
| `keyword_research/` | Keyword Research | **Không có trong scope project** — bỏ |
| `backlink_checker/` | Backlink Checker | **Không có trong scope** — bỏ |
| `rank_tracker/` | Rank Tracker | **Không có trong scope** — bỏ |
| `on_page_seo_detail/` | On-page SEO Detail | → `/audits/:id` tab "21 Rule" (meta + headings + images + links) |
| `performance_detail/` | Performance Detail | → `/audits/:id` tab "Core Web Vitals" |
| `technical_seo_detail/` | Technical SEO Detail | → `/audits/:id` tab "21 Rule" filter technical category |
| `website_audit_light/` | Website Audit (light theme) | → `/audits/:id` giống `webaudit.png` nhưng theme light |
| `seo_academy/`, `seo_academy_blog_listing/`, `seo_article_detail_view/` | Academy pages | **Không áp dụng** (không có academy) |
| `analytica_pro/` | Root/marketing? | Possibly landing, bỏ |

**Nếu sau này muốn generate mockup cho các page còn thiếu** (đặc biệt `dashboard`, `performance_detail`, `technical_seo_detail`, `on_page_seo_detail`), có thể sử dụng Stitch AI để generate với brand/token đã define trong [32-design-system.md](32-design-system.md).

---

## 6. Design decisions chốt từ mockup

### 6.1 Sidebar style

✅ **Dark slate-900 background, rounded right 2xl, fixed left, shadow-xl.**
- Active item: solid `primary-container` với `shadow-primary` (blue glow).
- Hover: bg slate-800 + text white.
- Icons: Material Symbols Outlined, fill=0 default, fill=1 khi active.

### 6.2 Content area

✅ **Off-white bg (`surface` `#f8f9ff`), cards bg white, padding 24-32px.**

### 6.3 Stats card pattern

✅ **4-card grid responsive:**
- Header: icon + label (uppercase micro, muted).
- Big number (h1 size, bold).
- Footer: trend text (small, colored).

### 6.4 Score visualization

✅ **Circular gauge là primary pattern** (không dùng linear bar cho overall score).
- Size: sm 64px, md 96px, lg 120px, xl 160px.
- Classification color mapping nhất quán.

### 6.5 Issue / rule table

✅ **Sortable, expandable rows, batch action.**
- Category badge (colored theo category).
- Priority badge (red/yellow/green match status).
- Action: kebab menu hoặc inline button "Xem chi tiết".

### 6.6 Hero card dark (audit detail + landing)

✅ **Dark navy gradient bg** cho hero section quan trọng:
- BG: `from-slate-900 to-slate-800`.
- Text: white / slate-300.
- Decorative element: pattern hoặc illustration góc.

---

## 7. Gaps cần generate mockup mới (khi dev)

Các page sau trong [31-page-specs.md](31-page-specs.md) **chưa có mockup** — nên generate thêm trước khi code:

| Page | Priority | Ghi chú |
|---|---|---|
| `/login`, `/register` | High | Đơn giản form, có thể skip mockup |
| `/dashboard` | High | Cần mockup stat cards + chart |
| `/audits` | High | Cần table + filter bar |
| `/audits/new` | Medium | Form đơn giản |
| `/audits/:id` realtime progress view | High | Cần mockup show loading states |
| `/audits/compare` | Medium | Side-by-side delta table |
| `/admin/rules` | Medium | Slider list |
| `/admin/stats` | Low | Chart-heavy |
| `/shared/:token` | Medium | Readonly view landing |

**Cách generate nhanh:**
1. Dùng Stitch AI với prompt tiếng Việt + design tokens đã define.
2. Hoặc screenshot các tool SEO tương tự (Ahrefs, SEMrush) → adapt style.

---

## 8. Mockup → Code checklist

Khi implement 1 page từ mockup, follow:

- [ ] Copy layout structure vào Next.js page/component.
- [ ] Thay brand name "Analytica Pro" / "Curator AI" → "SEO Analyst".
- [ ] Dùng fonts từ `next/font` thay vì Google Fonts CDN.
- [ ] Dùng design tokens từ [32-design-system.md](32-design-system.md) thay vì hardcode hex.
- [ ] Thay nav items đúng project (bỏ Keyword Research, Backlink, Rank).
- [ ] Thay copy text → tiếng Việt.
- [ ] Thay mock data → API call qua TanStack Query.
- [ ] Thêm loading state (skeleton), error state, empty state.
- [ ] Thêm accessibility: aria-label, focus order, keyboard.
- [ ] Thêm responsive breakpoint (mobile sidebar → drawer).
- [ ] Test đa ngôn ngữ (nếu có i18n).

---

## 9. File tham chiếu

| File | Mục đích |
|---|---|
| [docs/design/webaudit.html](webaudit.html) | Primary mockup reference cho audit detail |
| [docs/design/webaudit.png](webaudit.png) | Screenshot tham khảo |
| [docs/design/aigenerate.html](aigenerate.html) | Inspiration inspector/right-rail layout |
| [docs/design/learning.html](learning.html) | Inspiration hero + card grid |
| [docs/design/stitch_d_n_m_i/](stitch_d_n_m_i/) | Folder mockup sub-page (chưa có file) |
| [32-design-system.md](32-design-system.md) | Token được derived từ mockup này |

---

## 10. Đi tiếp

- Start coding → [30-frontend-architecture.md](30-frontend-architecture.md) bootstrap `apps/web/`.
- Chi tiết từng page → [31-page-specs.md](31-page-specs.md)
- Apply tokens → [32-design-system.md](32-design-system.md)
