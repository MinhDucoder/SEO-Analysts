# PHASE 2 — Agent A4: Admin Pages (Stats + Users + Rules)

> **Self-contained spec.** Đọc cold.

---

## 0. Mission

Design 3 admin page **chỉ visible role=admin**:
1. `admin-stats` — KPI dashboard.
2. `admin-users` — user management table.
3. `admin-rules` — 20 SEO rules với weight slider + enable toggle.

**File output**: `design/page/admin-stats.pen`, `design/page/admin-users.pen`, `design/page/admin-rules.pen`.

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 page #9-#11, §1 vibe |
| `design/BACKEND-API.md` | §4.5 admin endpoints, §5 AdminStats + AdminUser + SeoRule, §6 ListUsersQuery + UpdateRulesDto |
| `design/.planning/PHASE-0.md` | Foundation |
| `design/.planning/PHASE-1-AGENT-A1.md` | AppShell |
| `design/system-tokens.pen` | Foundation |

---

## 2. Backend contract slice

### 2.1 Stats
- `GET /api/v1/admin/stats?period=30d` → `AdminStats`:
  ```ts
  {
    overview: { totalUsers, totalAudits, successRate, avgCrawlTimeMs, avgSeoScore };
    newUsersToday: number;
    auditsToday: number;
    topDomains: Array<{ domain, count }>;
  }
  ```

### 2.2 Users
- `GET /admin/users?page=1&limit=20&search=&role=&isLocked=` → `{ data: AdminUser[], meta }`.
- `AdminUser`: extends UserPublic + `isLocked, oauthProvider, auditCount`.
- `PATCH /admin/users/:id` body `{ isLocked: boolean }` → `{ id, email, isLocked }`. **Admin không lock chính mình**.

### 2.3 Rules
- `GET /admin/rules` → `{ rules: SeoRule[] }`.
- `SeoRule`: `{ id, name, displayName, description, category, weight (1-10), isEnabled }`.
- `PUT /admin/rules` body `UpdateRulesDto`: `{ rules: Array<{ name, weight }> }` → `{ updated: SeoRule[] }`.

---

## 3. Pages

### 3.1 `admin-stats.pen` — page `Page/AdminStats`

**Layout**: AppShell, sidebar active "Admin" (admin section).

**Main content** (vertical, gap `$space-6`):
1. **Page header**: "Admin Dashboard" + subtitle "Tổng quan hệ thống" + period picker dropdown right ("7d/30d/90d/Custom", default 30d).
2. **KPI cards row** (horizontal, gap `$space-4`, fill_container, 5 card):
   - Card mỗi cái: vertical, padding `$space-6`, fill `$color-bg-elevated`, stroke 1, radius `$radius-md`.
     - Label small mono uppercase muted.
     - Value large mono bold.
     - Sub-row: trend arrow (up/down) + delta % vs period trước.
   - 5 cards: Total Users / Total Audits / Success Rate / Avg Crawl Time / Avg SEO Score.
   - Demo values: 1,234 (+12% ↑), 5,678 (+8% ↑), 87.3% (+2% ↑), 8.5s (-15% ↓ good), 72.1 (+5% ↑).
3. **2-column section** (horizontal, gap `$space-6`):
   - **Left column** (fill_container 2/3):
     - Card "Audit Volume Trend" — 30-day bar chart (custom render: 30 vertical bars, height theo daily count, label x-axis date, hover tooltip count).
     - Card "Today's Activity" — 2 stat (newUsersToday + auditsToday) inline với big number.
   - **Right column** (1/3, width 360):
     - Card "Top Domains" — list 10 row: rank + domain mono + count badge.

**State variants**:
- `Page/AdminStats/Default` (30d period).
- `Page/AdminStats/Loading` (skeleton 5 KPI card + chart skeleton).
- `Page/AdminStats/Period7d` (period=7d, varied data smaller scale).

### 3.2 `admin-users.pen` — page `Page/AdminUsers`

**Layout**: AppShell.

**Main content**:
1. **Topbar slot**: breadcrumb `Admin / Users` + action button outline "Export CSV".
2. **Filter bar**: search input (email/fullName) + role select (All/User/Admin) + locked toggle (All/Active/Locked).
3. **Table** (Component/Table pattern):
   - Header: # | Avatar | Name | Email | Role | Verified | Locked | Audits | Created | Actions.
   - 10 row demo:
     - Row 1: admin@test.seo.local, Admin role badge, verified check, unlocked toggle on, 50 audits.
     - Row 2: duc@test.seo.local, User, verified, unlocked, 10 audits.
     - Row 3: linh@test.seo.local, User, verified, unlocked, 2 audits.
     - Row 4: nam@test.seo.local, User, verified, unlocked, 0 audits.
     - Row 5: unverified@test.seo.local, User, NOT verified (gray), unlocked, 0 audits.
     - Row 6: locked@test.seo.local, User, verified, **LOCKED toggle off** (red highlight row), 5 audits.
     - Row 7-10: random users.
   - Verified cell: check icon green hoặc x icon gray.
   - Locked cell: Component/Toggle on/off (lưu ý: admin không lock chính mình → toggle disabled cho self row).
   - Actions: icon buttons (eye view detail, mail send password reset email, trash delete) ghost.
4. **Pagination**: "Showing 1-10 of 1,234".

**State variants**:
- `Page/AdminUsers/Default` (10 row).
- `Page/AdminUsers/SelfRow` — highlight row "admin@test" với toggle disabled + tooltip "Không thể khoá chính mình".
- `Page/AdminUsers/Modal/LockConfirm` — modal warn "Khoá tài khoản X?" + Cancel + Destructive "Khoá".
- `Page/AdminUsers/Empty` — search no result.

### 3.3 `admin-rules.pen` — page `Page/AdminRules`

**Layout**: AppShell.

**Main content**:
1. **Topbar slot**: breadcrumb `Admin / Rules` + action primary "Lưu thay đổi" (disabled khi không có dirty change).
2. **Header card**: explain "20 SEO rules. Weight 1-10 quyết định trọng số trong tổng điểm. Toggle enabled để bật/tắt rule cho mọi audit từ giờ trở đi."
3. **Rules list** grouped by category (6 category):
   - Category section: header "META" `$text-lg` semibold + 4 rule row.
   - Mỗi rule row (frame horizontal, padding `$space-4`, stroke bottom 1):
     - Toggle on/off left.
     - Rule displayName (Title Case) + description small below.
     - Right column: 
       - Weight slider 1-10 horizontal (custom render: 10 dots horizontal với active dot bigger, drag handle tròn at current value).
       - Weight number mono inline right side.
   - 6 category × ~3-4 rule = 20 total.
4. **Footer save bar** (sticky bottom): "X rule đã thay đổi" muted text + Cancel outline + Primary "Lưu".

**State variants**:
- `Page/AdminRules/Default` (no dirty).
- `Page/AdminRules/Dirty` (3 rule changed, footer save enabled).
- `Page/AdminRules/Saving` (loading state).
- `Page/AdminRules/RuleDisabled` — 1 rule toggle off, row opacity 50%.

---

## 4. Cross-cutting

- AppShell sidebar có "Admin" section nếu role=admin (note metadata).
- Vietnamese copy.

---

## 5. Anti-patterns

- ❌ Admin gradient/colorful (giữ utilitarian dark Linear vibe).
- ❌ Stats chart 3D/animated.
- ❌ User table avatar gradient placeholder.
- ❌ Weight slider continuous drag (chỉ 10 step rời rạc).
- ❌ Auto-save khi đổi weight (yêu cầu confirm Save explicitly).

---

## 6. Workflow

1. Worktree `design-phase-2-a4`, branch `design/phase-2-a4`.
2. Clone foundation 3 lần.
3. Hide foundation frames.
4. Build state frames cạnh nhau.
5. Screenshot.
6. Commit atomic.

---

## 7. Done checklist

- [ ] admin-stats: 3 state với 5 KPI card + 30-day chart + top domains.
- [ ] admin-users: 4 state với table 10 row varied + lock confirm modal + self-row protection.
- [ ] admin-rules: 4 state với 20 rule grouped by 6 category + weight slider + dirty footer.
- [ ] Custom chart render (30 daily bars) đúng theo INTENT §1 (no decorative).
- [ ] Vietnamese copy.
- [ ] No anti-pattern.
- [ ] `.planning/PHASE-2-A4-DONE.md` với 11 screenshot links (3+4+4).
- [ ] Branch push + PR.
