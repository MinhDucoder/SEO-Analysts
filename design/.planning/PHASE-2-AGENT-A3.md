# PHASE 2 — Agent A3: Audit Compare + Scheduled List

> **Self-contained spec.** Đọc cold.

---

## 0. Mission

Design 2 page:
1. `audit-compare` — so sánh 2 audit (unified diff layout).
2. `scheduled-list` — danh sách scheduled audit (cron-based).

**File output**: `design/page/audit-compare.pen`, `design/page/scheduled-list.pen`.

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 page #6 + #8, §11 compare layout decision (unified diff + side-by-side header) |
| `design/BACKEND-API.md` | §4.2 audits/compare, §4.3 scheduled-audits, §5 CompareResult + ScheduledAuditDto, §6 CreateScheduledAuditDto |
| `design/.planning/PHASE-0.md` | Foundation |
| `design/.planning/PHASE-1-AGENT-A1.md` | ScoreDelta + RuleResultRow + AppShell |
| `design/system-tokens.pen` | Foundation |

---

## 2. Backend contract slice

### 2.1 Compare
- `GET /api/v1/audits/compare?audit1=<uuid>&audit2=<uuid>`.
- Response `CompareResult`:
  ```ts
  {
    scoreDelta: number;               // overall, có thể âm
    ruleDeltas: Array<{
      ruleId, ruleName,
      statusBefore: 'CHECK_STATUS_PASS'|'WARN'|'FAIL'|'UNSPECIFIED',
      statusAfter:  'CHECK_STATUS_PASS'|'WARN'|'FAIL'|'UNSPECIFIED',
      scoreDelta: number;
    }>;
    issuesFixed: string[];            // ruleName[] đã fail/warn → pass
    issuesNew: string[];              // ruleName[] mới fail
  }
  ```

### 2.2 Scheduled audits
- `POST /scheduled-audits` body `CreateScheduledAuditDto`: `{ url, cron (5-field), mode?, maxUrls?, targetKeyword? }`.
- `GET /scheduled-audits` → `ScheduledAuditDto[]`.
- `PATCH /scheduled-audits/:id/pause` / `:id/resume` → `ScheduledAuditDto`.
- `DELETE /scheduled-audits/:id` → 204.
- `ScheduledAuditDto`: `{ id, userId, url, cron, mode, maxUrls, targetKeyword, lastRunAt, lastScore, isActive, createdAt, updatedAt }`.

---

## 3. Pages

### 3.1 `audit-compare.pen` — page `Page/AuditCompare`

**Layout decision (INTENT §11)**: **Unified diff** cho rule list + **side-by-side ScoreRing big** ở header.

**Main content** (vertical, gap `$space-6`):

#### 3.1.1 Audit selector bar (top)
- Frame horizontal, gap `$space-4`, padding `$space-4`, fill `$color-bg-elevated`, radius `$radius-md`.
- Audit 1 selector (Component/Select trigger với label "Audit gốc" + selected text "google.com - 15/03/2025").
- Icon `arrow-right-left` 20×20 fill `$color-fg-muted`.
- Audit 2 selector (label "Audit so sánh" + selected text "google.com - 22/03/2025").

#### 3.1.2 Side-by-side header
- Frame horizontal, gap `$space-12`, padding `$space-8`, justifyContent center.
- Audit 1 column (vertical center): ScoreRing lg + label "Audit gốc" + date small mono.
- Center: ScoreDelta huge (icon arrow-right + delta text, font lớn hơn ScoreDelta thường).
- Audit 2 column (vertical center): ScoreRing lg + label "Audit so sánh" + date.

#### 3.1.3 Summary stats (3 column card grid)
- Card "Issues Fixed": large mono number + green icon + list 5 ruleName fixed.
- Card "Issues New": large mono number + red icon + list 5 ruleName new.
- Card "Net delta": large mono number ScoreDelta xl + classification change badge.

#### 3.1.4 Rule diff list (unified)
- Card header "Rule Comparison" + filter (All/Improved/Regressed/Unchanged).
- 20 row, mỗi row giống RuleResultRow nhưng customized:
  - Status icon: 2 icon side-by-side (statusBefore → statusAfter) với arrow giữa.
  - Rule name + ScoreDelta inline.
  - Background tint: improved=green 5%, regressed=red 5%, unchanged=transparent.
- Demo data: 6 improved (warn→pass, fail→pass), 4 regressed (pass→warn, pass→fail), 10 unchanged.

**State variants**:
- `Page/AuditCompare/Default` — varied diff (6 fix, 4 new, 10 unchanged).
- `Page/AuditCompare/Improved` — net positive (10 fix, 0 new).
- `Page/AuditCompare/Regressed` — net negative (0 fix, 8 new).
- `Page/AuditCompare/SelectorEmpty` — empty state khi chưa pick 2 audit:
  - Icon `git-compare` large + text "Chọn 2 audit để so sánh" + helper.

### 3.2 `scheduled-list.pen` — page `Page/ScheduledList`

**Layout**: AppShell.

**Main content**:
1. **Topbar slot**: breadcrumb `Scheduled` + action button primary "+ Tạo lịch audit" (mở modal).
2. **Filter bar** (horizontal): search URL + status toggle (All/Active/Paused).
3. **Table**:
   - Header: # | URL | Cron | Mode | Last Run | Last Score | Active | Actions.
   - 6-8 row demo:
     - Row 1: google.com, "0 9 * * MON", site, 2 ngày trước, 92.5, Active toggle on.
     - Row 2: shopee.vn, "0 0 * * *", single, 5h trước, 64.8, Active.
     - Row 3: lazada.vn, "*/30 * * * *", single, vừa xong, 78.3, Active.
     - Row 4: example.com, "0 12 * * 0", site, paused 1 tuần, 45.2, Paused.
     - ...
   - Cron column: hiển thị raw cron mono + tooltip readable "Mỗi thứ Hai 9h sáng" (note metadata).
   - Last Score: ScoreRing sm 48 + number mono hoặc "—" nếu chưa run.
   - Active: Component/Toggle (on/off).
   - Actions: icon buttons (eye view, pause/resume, trash delete) ghost.

**State variants**:
- `Page/ScheduledList/Default` — 6 row varied.
- `Page/ScheduledList/Empty` — icon `clock` large + "Chưa có lịch audit" + button "Tạo lịch đầu tiên".
- `Page/ScheduledList/Modal/Create` — modal full với form:
  - URL input, target keyword optional.
  - Cron builder UI (4 preset buttons: "Hourly" / "Daily 9AM" / "Weekly Monday" / "Custom") + raw input mono cho custom.
  - Mode toggle single/site + maxUrls (nếu site).
  - Helper text "Cron 5-field: minute hour day month dow".
  - Buttons Cancel + Primary "Tạo lịch".

---

## 4. Cross-cutting

- AppShell, sidebar active "Audits" (compare) hoặc "Scheduled".
- Vietnamese copy.

---

## 5. Anti-patterns

- ❌ Compare side-by-side full (rule list) — dùng unified diff.
- ❌ Cron builder visual quá phức tạp (chỉ 4 preset + raw input).
- ❌ Hiển thị "Last run: never" plain text — dùng "Chưa chạy" với muted color.

---

## 6. Workflow

1. Worktree `design-phase-2-a3`, branch `design/phase-2-a3`.
2. Clone foundation 2 lần.
3. Hide foundation frames.
4. Build state frames cạnh nhau.
5. Screenshot.
6. Commit atomic.

---

## 7. Done checklist

- [ ] audit-compare: 4 state (Default/Improved/Regressed/SelectorEmpty).
- [ ] scheduled-list: 3 state (Default/Empty/Modal Create).
- [ ] Compare unified diff đúng pattern (statusBefore→After + ScoreDelta inline).
- [ ] Scheduled cron column có raw + readable hint.
- [ ] AppShell + sidebar active.
- [ ] No anti-pattern.
- [ ] `.planning/PHASE-2-A3-DONE.md` với 7 screenshot links.
- [ ] Branch push + PR.
