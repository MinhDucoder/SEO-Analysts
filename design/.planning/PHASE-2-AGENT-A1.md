# PHASE 2 — Agent A1: Settings + Audit Create + Audit List

> **Self-contained spec.** Đọc cold.

---

## 0. Mission

Design 3 page **dùng AppShell** (đã có từ Phase 1 A1):
1. `settings` — tabs Profile + Password (Tier 1 INTENT, deferred từ Phase 1).
2. `audit-create` — form tạo audit mới.
3. `audit-list` — table audit với filter + pagination + search.

**File output**: `design/page/settings.pen`, `design/page/audit-create.pen`, `design/page/audit-list.pen` (mỗi file clone từ `design/system-tokens.pen` foundation đã có Phase 0 + Phase 1 A1 extended).

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 page #4-5, §7 layout, §8 real-time UX |
| `design/BACKEND-API.md` | §4.2 audits endpoints, §4.4 users endpoints, §6 DTOs (CreateAuditDto, ListAuditsQuery, UpdateProfileDto, ChangePasswordDto), §5 AuditSummary, Pagination |
| `design/.planning/PHASE-0.md` | Foundation (variables, base components) |
| `design/.planning/PHASE-1-AGENT-A1.md` | AppShell components (Sidebar 240/64, Topbar 56, AppShell wrapper với main slot) |
| `design/.planning/PHASE-1-A1-DONE.md` | Confirm AppShell components có ID gì, slot nào dùng được |
| `design/system-tokens.pen` | Foundation file (sau khi Phase 1 A1 merge) |

---

## 2. Backend contract slice

### 2.1 Settings — Profile
- `PATCH /api/v1/users/profile` body `UpdateProfileDto`: `{ fullName?, avatarUrl? }` (≥1 field).
- Response `200 { id, fullName, avatarUrl }`.

### 2.2 Settings — Password
- `PATCH /api/v1/users/password` body `ChangePasswordDto`: `{ currentPassword, newPassword }`.
- newPassword cùng rule register (8..72, upper, digit, special).
- Response `200 { message }` — backend revoke ALL refresh tokens → user phải re-login mọi device.

### 2.3 Audit Create
- `POST /api/v1/audits` body `CreateAuditDto`:
  ```ts
  { url: string;                // http/https only, max 2048
    targetKeyword?: string;     // max 255
    mode?: 'single' | 'site';   // default 'single'
    maxUrls?: number;           // chỉ áp dụng mode='site', 1..5000 (default 500)
  }
  ```
- Response `202 { auditId, status: 'pending', mode, message }` — async, FE redirect `/audits/:id` để theo dõi WS.
- Rate limit: 10 audit/user/1h → 400/403 với detail "Da dat gioi han".

### 2.4 Audit List
- `GET /api/v1/audits?page=1&limit=20&sort=createdAt&order=desc&search=&status=&scoreMin=&scoreMax=&dateFrom=&dateTo=`.
- Response `200 { data: AuditSummary[], meta: Pagination }`.
- AuditSummary: `{ id, url, domain, status, seoScore, targetKeyword, crawlerType, crawlDurationMs, createdAt, completedAt }`.
- Pagination: `{ total, page, limit, totalPages }`.
- Status filter values: pending/crawling/analyzing/reporting/completed/failed.

---

## 3. Pages to deliver

### 3.1 `settings.pen` — page `Page/Settings`

**Layout**: AppShell wrapper với main slot.

**Main content** (vertical, gap `$space-8`):
1. **Page header**: title "Cài đặt" + subtitle "Quản lý tài khoản và bảo mật".
2. **Tabs container** (Component/Tabs):
   - Tab 1: "Hồ sơ" (active default).
   - Tab 2: "Mật khẩu".
3. **Tab content frame** (vertical, gap `$space-6`, max-width 720):

#### Tab Profile
- **Avatar section**: horizontal, gap `$space-6`, alignItems center.
  - Avatar 96×96 circle với placeholder hoặc initials text.
  - Vertical: button outline "Thay đổi ảnh" + helper "PNG, JPG max 2MB".
- **Form fields** (vertical, gap `$space-4`):
  - Email (Input, disabled, value pre-fill "user@example.com", helper "Email không thể thay đổi").
  - Full name (Input, label "Họ tên", placeholder).
  - Avatar URL (Input, label "URL ảnh đại diện (tùy chọn)", helper "Nhập URL nếu không upload trực tiếp").
- **Action row**: justify end, button outline "Hủy" + button primary "Lưu thay đổi".

#### Tab Password
- **Form fields**:
  - Current password (Input password, label "Mật khẩu hiện tại", eye toggle).
  - New password (Input password, label "Mật khẩu mới", eye toggle, password rules visual 4 rule như Phase 1 A2).
  - Confirm new password (Input password, label "Xác nhận mật khẩu mới", eye toggle).
- **Warning callout** (frame fill `$color-warning` 10% bg + stroke `$color-warning`, padding, icon alert-triangle + text):
  - "Khi đổi mật khẩu thành công, bạn sẽ bị đăng xuất khỏi tất cả thiết bị khác."
- **Action row**: button outline "Hủy" + button primary destructive "Đổi mật khẩu" (destructive vì hậu quả lớn).

**State variants** (frames cạnh nhau):
- `Page/Settings/Profile/Default`.
- `Page/Settings/Profile/Saving` (loading).
- `Page/Settings/Profile/Success` (toast success appear).
- `Page/Settings/Password/Default`.
- `Page/Settings/Password/Mismatch` (confirm field error).
- `Page/Settings/Password/Success` (modal "Đổi mật khẩu thành công" + button "Đăng nhập lại" primary).

### 3.2 `audit-create.pen` — page `Page/AuditCreate`

**Layout**: AppShell wrapper.

**Main content** (vertical, gap `$space-6`, max-width 720):
1. **Breadcrumb** (qua Topbar slot): `Audits / Tạo mới`.
2. **Page header**: title "Tạo audit mới" + subtitle "Phân tích SEO cho website của bạn".
3. **Form card** (Component/Card):
   - **URL field** (full width):
     - Label "URL website".
     - Input large với prefix slot icon `link` 16×16.
     - Placeholder "https://example.com".
     - Helper "Nhập URL đầy đủ bao gồm http:// hoặc https://".
   - **Target keyword** (full width, optional):
     - Label "Từ khóa mục tiêu (tùy chọn)".
     - Input.
     - Helper "Phân tích SEO sẽ tập trung vào từ khóa này".
   - **Mode toggle** (full width):
     - Label "Phạm vi audit".
     - Radio group horizontal 2 option:
       - "Single page" (icon file-text) — selected default.
       - "Toàn site" (icon globe).
     - Helper text dưới option active.
   - **Max URLs** (chỉ visible khi mode=site):
     - Label "Số trang tối đa".
     - Input number, default 500, min 1, max 5000.
     - Helper "Crawler sẽ dừng sau khi đạt số trang này".
   - **Actions**: button outline "Hủy" + button primary "Bắt đầu audit" với icon `arrow-right`.

**State variants**:
- `Page/AuditCreate/Default` (mode=single).
- `Page/AuditCreate/SiteMode` (mode=site, hiển thị maxUrls field).
- `Page/AuditCreate/Submitting` (button spinner + "Đang tạo audit...").
- `Page/AuditCreate/Error/InvalidUrl` (URL field stroke error + helper "URL không hợp lệ").
- `Page/AuditCreate/Error/RateLimit` (toast error countdown 10/h limit).

### 3.3 `audit-list.pen` — page `Page/AuditList`

**Layout**: AppShell wrapper.

**Main content** (vertical, gap `$space-4`):
1. **Breadcrumb + actions** (Topbar slot): `Audits` / actions: `+ Tạo audit mới` button primary.
2. **Filter bar** (horizontal, gap `$space-3`, fill_container):
   - Search input (fill_container, icon search left, placeholder "Tìm theo URL hoặc domain...").
   - Status select (Component/Select, 7 option: All/Pending/Crawling/Analyzing/Reporting/Completed/Failed).
   - Score range filter (2 input number "min" + "max", inline).
   - Date range picker (button outline "30 ngày qua" với chevron-down).
   - View toggle (icon button group: Table active / Grid).
3. **Table** (Component/Table pattern):
   - Header row: # | URL | Domain | Status | Score | Target Keyword | Created | Actions.
   - 8-10 data rows demo với varied status + score:
     - Row 1: completed, score 92.5, google.com, "seo audit"
     - Row 2: completed, score 78.3, vercel.com, "deploy"
     - Row 3: crawling (50%), shopee.vn, "shop"
     - Row 4: analyzing (75%), blog.example.com, no keyword
     - Row 5: failed, error.example.com
     - Row 6: completed, 64.8, lazada.vn, "sale"
     - Row 7: pending, queued.example.com
     - Row 8: completed, 45.2, slow.example.com
   - Status cell: Badge với status color (Phase 0 status palette).
   - Score cell: ScoreRing sm (48px) inline + number mono.
   - Actions cell: icon buttons (eye view, share, trash delete) ghost.
4. **Pagination** (Component/Pagination): showing 1-20 of 156 + page buttons.

**State variants**:
- `Page/AuditList/Default` (table view, 8 rows).
- `Page/AuditList/GridView` (grid 4 col, mỗi card có ScoreRing md + URL + status + date).
- `Page/AuditList/Empty` (no audits, icon `search-x` large + text "Chưa có audit nào" + button primary "Tạo audit đầu tiên").
- `Page/AuditList/Loading` (skeleton 8 row).
- `Page/AuditList/FilterActive` (filter bar có chip active "Status: Completed × | Score 60-100 ×" với clear all).

---

## 4. Cross-cutting

- AppShell slot main render page content, sidebar nav highlight item active (Audits cho audit-* pages, Settings cho settings).
- Vietnamese copy.
- Theme dark default.
- Mỗi state = 1 frame top-level riêng cạnh nhau.

---

## 5. Anti-patterns

- ❌ Modal cho audit-create (FULL page form, không modal).
- ❌ Spinner loading toàn trang (skeleton cho table, button-level cho form).
- ❌ Confirm "Bạn có chắc?" cho mọi action (chỉ cho destructive như delete audit).
- ❌ Date picker calendar custom (dùng input date hoặc dropdown preset "7d/30d/90d/Custom").

---

## 6. Workflow

1. Setup worktree:
   ```bash
   git worktree add .claude/worktrees/design-phase-2-a1 -b design/phase-2-a1
   ```
2. Clone foundation 3 lần:
   ```bash
   cp design/system-tokens.pen design/page/settings.pen
   cp design/system-tokens.pen design/page/audit-create.pen
   cp design/system-tokens.pen design/page/audit-list.pen
   ```
3. Mỗi page: hide foundation frames (Tokens/Base/Domain/AppShell demo) → enabled false. Build page state frames cạnh nhau.
4. Screenshot mỗi state.
5. Commit atomic.

---

## 7. Done checklist

- [ ] settings: 6 state frame (Profile Default/Saving/Success + Password Default/Mismatch/Success).
- [ ] audit-create: 5 state frame.
- [ ] audit-list: 5 state frame.
- [ ] Tất cả page wire AppShell instance từ foundation.
- [ ] Sidebar active item highlight đúng (Audits hoặc Settings).
- [ ] Vietnamese copy natural.
- [ ] No anti-pattern.
- [ ] `.planning/PHASE-2-A1-DONE.md` với 16 screenshot links.
- [ ] Branch `design/phase-2-a1` push + PR title `design(phase-2-a1): settings + audit-create + audit-list`.
