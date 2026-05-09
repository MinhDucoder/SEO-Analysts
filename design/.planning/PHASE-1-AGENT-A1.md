# PHASE 1 — Agent A1: 5 Domain Components + AppShell

> **Self-contained spec.** Đọc cold. Mọi thứ cần để hoàn thành nằm trong file này + `INTENT.md` + `BACKEND-API.md` + `PHASE-0.md` (foundation reference).

---

## 0. Mission

Extend `design/system-tokens.pen` thêm:
1. **5 domain components còn lại** (4 components dùng cho audit-detail page):
   - `CategoryRadar` (alt view của CategoryBars)
   - `RuleResultRow` (collapsible, 20 rule list)
   - `CwvCard` (Core Web Vitals 3 metrics)
   - `KeywordTable` (dense table với 4 boolean badges)
   - `ScoreDelta` (pill cho audit-compare)
2. **AppShell layout components**:
   - `Sidebar/Container` (240px expanded + 64px collapsed variants)
   - `Sidebar/NavItem` (active, inactive)
   - `Sidebar/Header` (logo wordmark + collapse toggle)
   - `Sidebar/Footer` (user avatar + name + theme toggle)
   - `Topbar` (breadcrumb + spacer + actions slot + user menu)
   - `AppShell` (wrapper: sidebar + topbar + main content slot)

**A1 KHÔNG design page** — chỉ extend foundation. Phase 2 page agents sẽ clone foundation đã extended.

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §4 domain components (5 cái), §7 layout (sidebar 240/64, topbar 56), §1 vibe |
| `design/BACKEND-API.md` | §5 ReportDetail (cho RuleResultRow, CwvCard, KeywordTable shape), §5 CompareResult (cho ScoreDelta) |
| `design/.planning/PHASE-0.md` | Variables list, base components đã có, 3 backbone domain reference |
| `design/system-tokens.pen` (đã merged Phase 0) | Foundation hiện tại — đọc qua `get_editor_state` |
| Pencil guide `Web App` + `Design System` | Load qua `get_guidelines` |
| `.planning/SMOKE-TEST-RESULT.md` | Confirm pencil dual-theme work hay fallback |

---

## 2. Why this phase exists

A1 là **prerequisite cho 4 page heavy** ở Phase 2:
- `audit-detail` cần 4/5 domain components (RuleResultRow, CategoryRadar alt, CwvCard, KeywordTable).
- `audit-compare` cần ScoreDelta + RuleResultRow (diff display).
- `settings`, `audit-list`, `audit-create`, `admin-*` cần AppShell.

Nếu 5 domain + AppShell không có ở Phase 1, Phase 2 page agents phải build inline → duplicate × N file → risk inconsistency cao.

---

## 3. Backend contract slice (copy từ BACKEND-API.md để khỏi đọc lại)

### 3.1 RuleResult (cho `RuleResultRow`)

```ts
{
  ruleId: string;
  ruleName: string;               // ví dụ 'rule_title_tag'
  status: 'CHECK_STATUS_PASS' | 'CHECK_STATUS_WARN' | 'CHECK_STATUS_FAIL' | 'CHECK_STATUS_UNSPECIFIED';
  score: number;                  // 0–100
  weight: number;                 // 1–10
  category: 'ISSUE_CATEGORY_META' | 'ISSUE_CATEGORY_HEADINGS' | 'ISSUE_CATEGORY_IMAGES'
          | 'ISSUE_CATEGORY_LINKS' | 'ISSUE_CATEGORY_PERFORMANCE' | 'ISSUE_CATEGORY_TECHNICAL';
  message: string;
  suggestion?: string;
  metadata: Record<string, string>;
}
```

FE map:
- `CHECK_STATUS_PASS` → icon check, color `$color-class-excellent`
- `CHECK_STATUS_WARN` → icon alert-triangle, color `$color-class-fair`
- `CHECK_STATUS_FAIL` → icon x, color `$color-class-poor`
- Display ruleName: snake_case → Title Case (e.g. "rule_title_tag" → "Title Tag")

### 3.2 CwvMetrics (cho `CwvCard`)

```ts
{
  lcpMs: number;        // Largest Contentful Paint (ms)
  inpMs: number;        // Interaction to Next Paint (ms)
  cls: number;          // Cumulative Layout Shift (unitless)
  performanceScore: number;
  // ... other lighthouse scores
}
```

Google thresholds:
- **LCP**: ≤2500ms good, 2500-4000 needs-improvement, >4000 poor.
- **INP**: ≤200ms good, 200-500 needs-improvement, >500 poor.
- **CLS**: ≤0.1 good, 0.1-0.25 needs-improvement, >0.25 poor.

### 3.3 Keyword (cho `KeywordTable`)

```ts
{
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
}
```

Plus optional `targetKeyword` với extra fields: `isStuffing: boolean`, `verdict: string`.

### 3.4 RuleDelta (cho `ScoreDelta`)

```ts
{
  ruleId: string;
  ruleName: string;
  statusBefore: 'CHECK_STATUS_PASS' | 'CHECK_STATUS_WARN' | 'CHECK_STATUS_FAIL' | 'UNSPECIFIED';
  statusAfter: 'CHECK_STATUS_PASS' | 'CHECK_STATUS_WARN' | 'CHECK_STATUS_FAIL' | 'UNSPECIFIED';
  scoreDelta: number;             // có thể âm
}
```

`CompareResult.scoreDelta: number` (overall) — pill `+5.2` xanh / `-3.1` đỏ.

### 3.5 Category (6 fixed)

Map proto-style → display name:
- `ISSUE_CATEGORY_META` → "Meta"
- `ISSUE_CATEGORY_HEADINGS` → "Headings"
- `ISSUE_CATEGORY_IMAGES` → "Images"
- `ISSUE_CATEGORY_LINKS` → "Links"
- `ISSUE_CATEGORY_PERFORMANCE` → "Performance"
- `ISSUE_CATEGORY_TECHNICAL` → "Technical"

---

## 4. Components to deliver

### 4.1 `Component/Domain/CategoryRadar`

**Mục đích**: alt view CategoryBars — 6-axis radar chart, vibe technical/sci-fi.

**Spec**:
- Frame square 280×280.
- Background: 6-axis spider web (5 concentric hexagon outline, fill `$color-border`).
- 6 axis label ở vertices: tên category, font `$font-ui`, size `$text-xs`, fill `$color-fg-muted`.
- Score polygon: filled với `$color-class-good` (default demo) opacity 30%, stroke `$color-class-good` 2px.
- 6 score point markers (small circle 6×6 fill `$color-class-good`) ở vertices.

**Implementation note**: Pencil không có chart primitives. Build bằng:
- 5 `polygon` shape (polygonCount: 6) cho web (concentric với scale 0.2/0.4/0.6/0.8/1.0).
- 1 `path` cho score polygon — dùng `geometry` SVG path string với 6 points calc thủ công theo formula `(cx + r*cos(angle), cy + r*sin(angle))` với angle=60°*i, r=score/100*radius.
- 6 `ellipse` size 6×6 ở vertices.

Demo trong frame `Domain` → sub-frame `CategoryRadar Demo`: 1 instance với scores [Meta=88, Headings=72, Images=54, Links=91, Performance=43, Technical=67].

### 4.2 `Component/Domain/RuleResultRow`

**Mục đích**: 1 row trong list 20 rule ở audit-detail. Collapsible (header + expanded body).

**Spec — Collapsed state (default)**:
- Frame horizontal, fill_container width, height 56, padding `[$space-3, $space-4]`, gap `$space-3`, alignItems center.
- Stroke: bottom 1, fill `$color-border`.
- Children:
  1. Status icon (24×24): pass=check `$color-class-excellent`, warn=alert-triangle `$color-class-fair`, fail=x `$color-class-poor`.
  2. Rule name (text): font `$font-ui`, size `$text-sm`, weight `$weight-medium`, fill `$color-fg`. Width fill_container.
  3. Score badge (pill): mono font, size `$text-xs`, padding `[$space-1, $space-2]`, fill bg classification color của score, fill text `$color-primary-fg`.
  4. Weight indicator (small): "w. 8" mono, size `$text-xs`, fill `$color-fg-muted`. Width 40.
  5. Chevron-down icon (16×16, fill `$color-fg-muted`) — rotate 180° khi expanded.

**Spec — Expanded state (when clicked)**:
- Same header row + body frame:
  - Body: vertical layout, padding `[$space-3, $space-6]` (left indent), gap `$space-3`.
  - "Issue: " label + message text.
  - "Suggestion: " label + suggestion text (italic, fill `$color-fg-muted`).

**Variants** (build cả 6 demo trong sub-frame `RuleResultRow Demo`):
- Pass collapsed (rule_title_tag, score 95, weight 8)
- Pass expanded
- Warn collapsed (rule_meta_description, score 60, weight 6)
- Warn expanded
- Fail collapsed (rule_image_alt, score 25, weight 7)
- Fail expanded

### 4.3 `Component/Domain/CwvCard`

**Mục đích**: 3 metric (LCP/INP/CLS) với threshold coloring.

**Spec**:
- Frame horizontal, fill_container width, gap `$space-4`, padding `$space-6`, fill `$color-bg-elevated`, radius `$radius-lg`, stroke 1 `$color-border`.
- 3 sub-frame mỗi metric, fill_container, vertical layout, gap `$space-2`, alignItems start:
  1. Metric label: "LCP" / "INP" / "CLS", font `$font-ui`, size `$text-xs`, weight `$weight-semibold`, fill `$color-fg-muted`, uppercase letterSpacing 1.
  2. Value (large): font `$font-mono`, size `$text-3xl`, weight `$weight-bold`, fill theo threshold color (good/needs-improvement/poor).
  3. Unit suffix small: "ms" / "" (CLS unitless), font `$font-mono`, size `$text-sm`, fill `$color-fg-muted`.
  4. Threshold badge (pill): "Good" / "Needs improvement" / "Poor" — bg với 10% opacity của threshold color, text full color.

**Threshold logic** (note in component metadata, hardcode demo):
- LCP demo: 1800ms → good
- INP demo: 350ms → needs-improvement
- CLS demo: 0.31 → poor

Demo trong frame `Domain` → sub-frame `CwvCard Demo`: 1 instance.

### 4.4 `Component/Domain/KeywordTable`

**Mục đích**: dense table keywords với 4 boolean badges.

**Spec**: dùng table pattern theo Pencil Design System guide §8.
- Table frame vertical, fill_container width, fill `$color-bg-elevated`, radius `$radius-md`, stroke 1 `$color-border`.
- **Header row**: horizontal, height 40, padding `[$space-3, $space-4]`, fill `$color-bg-overlay`, stroke bottom 1 `$color-border`. Cells:
  - "#" (rank), width 40
  - "Keyword", fill_container
  - "Frequency", width 100
  - "Density", width 100
  - "Title" / "H1" / "P1" / "Meta" — 4 boolean column, mỗi cái width 60, header text size `$text-xs` mono uppercase.
- **Data row** (build 5 demo): horizontal, height 48, padding `[$space-3, $space-4]`, hover bg `$color-bg-overlay` (note metadata).
  - Rank: mono `$text-sm`, fill `$color-fg-muted`.
  - Keyword: `$font-ui` `$text-sm` `$weight-medium` `$color-fg`. Truncate ellipsis nếu dài.
  - Frequency: mono `$text-sm` textAlign right.
  - Density: mono `$text-sm` textAlign right + suffix "%".
  - 4 boolean cells: render check icon 14×14 `$color-class-excellent` nếu true, dash "—" `$color-fg-disabled` nếu false. textAlign center.

**Demo data** (5 keyword, sub-frame `KeywordTable Demo`):
| # | Keyword | Freq | Density | Title | H1 | P1 | Meta |
|---|---|---|---|---|---|---|---|
| 1 | seo audit | 24 | 3.20% | ✓ | ✓ | ✓ | ✓ |
| 2 | website performance | 18 | 2.40% | ✓ | ✓ | — | ✓ |
| 3 | meta description | 15 | 2.00% | — | — | ✓ | ✓ |
| 4 | core web vitals | 12 | 1.60% | — | ✓ | ✓ | — |
| 5 | image optimization | 9 | 1.20% | — | — | ✓ | — |

### 4.5 `Component/Domain/ScoreDelta`

**Mục đích**: pill hiển thị delta điểm — `+5.2` xanh / `-3.1` đỏ.

**Spec**:
- Frame horizontal, fit_content, padding `[$space-1, $space-2]`, gap `$space-1`, alignItems center, radius `$radius-pill`.
- Background: positive=`$color-class-excellent` 10% opacity, negative=`$color-class-poor` 10% opacity, zero=`$color-fg-muted` 10% opacity.
- Children:
  1. Arrow icon 12×12: positive=`trending-up`, negative=`trending-down`, zero=`minus`. Fill = full classification color.
  2. Delta text: font `$font-mono`, size `$text-xs`, weight `$weight-semibold`, fill = full classification color. Format: `+5.2` / `-3.1` / `±0` (always có sign).

**Variants** (3 demo, sub-frame `ScoreDelta Demo`):
- Positive: +12.5 (green)
- Negative: -7.3 (red)
- Zero: ±0 (neutral)

### 4.6 AppShell components

#### 4.6.1 `Component/AppShell/Sidebar/Header`

- Frame horizontal, fill_container, height 56, padding `[$space-4, $space-6]`, gap `$space-3`, alignItems center, justifyContent space-between, stroke bottom 1 `$color-border`.
- **Expanded variant** (240px parent):
  - Logo mark (icon 24×24): lucide `radar` hoặc `gauge` — chọn `gauge` (vibe SEO score). Fill `$color-fg`.
  - Wordmark text "SEO Audit": `$font-ui`, `$text-base`, `$weight-semibold`, fill `$color-fg`.
  - Collapse toggle button (lucide `panel-left-close`, 16×16 ghost icon button).
- **Collapsed variant** (64px parent):
  - Logo mark only (centered).
  - Toggle button hidden hoặc move xuống footer.

#### 4.6.2 `Component/AppShell/Sidebar/NavItem`

**States**: default, active, hover (note metadata).

**Spec**:
- Frame horizontal, fill_container, height 36, padding `[$space-2, $space-3]`, gap `$space-3`, alignItems center, radius `$radius-md`.
- Children:
  - Icon 20×20 (lucide), fill `$color-fg-muted` (default) / `$color-fg` (active).
  - Label text: `$font-ui`, `$text-sm`, weight `$weight-medium` (active) / `$weight-regular` (default), fill `$color-fg-muted` / `$color-fg`.
  - Optional trailing badge slot (small count badge).
- **Active state**: bg `$color-bg-overlay`, optional left accent bar 2×fill_container_height `$color-primary`.
- **Collapsed variant**: chỉ icon, label hidden (`enabled: false`), tooltip on hover (note metadata).

**Demo** trong sub-frame `Sidebar NavItem Demo`: 6 items (Dashboard active, Audits default, Scheduled, Compare, Settings, Admin).

#### 4.6.3 `Component/AppShell/Sidebar/Footer`

- Frame horizontal, fill_container, height 56, padding `[$space-3, $space-4]`, gap `$space-3`, alignItems center, stroke top 1 `$color-border`.
- **Expanded**:
  - Avatar 32×32 (circle, fill placeholder or initials text).
  - Vertical stack center: Name text (sm semibold) + email (xs muted, truncate).
  - Theme toggle button (sun/moon icon ghost).
  - Logout icon button (lucide `log-out`).
- **Collapsed**: avatar only.

#### 4.6.4 `Component/AppShell/Sidebar/Container`

**Reusable parent** kết hợp Header + Nav slot + Footer.

**Spec**:
- Frame vertical, height fill_container, fill `$color-bg-elevated`, stroke right 1 `$color-border`.
- Children:
  - Sidebar/Header instance.
  - Nav slot (frame, fill_container height, layout vertical, padding `$space-3`, gap `$space-1`, **slot: marked as recommended children = NavItem**).
  - Sidebar/Footer instance.

**Variants**: width 240 (expanded) / width 64 (collapsed). Build cả 2 demo cạnh nhau trong sub-frame `Sidebar Container Demo`.

#### 4.6.5 `Component/AppShell/Topbar`

- Frame horizontal, fill_container width, height 56, padding `[$space-4, $space-6]`, gap `$space-4`, alignItems center, stroke bottom 1 `$color-border`, fill `$color-bg-elevated`. **Sticky position note** (metadata: `sticky: top: 0`).
- Children:
  - Breadcrumb slot (frame fill_container horizontal, gap `$space-2` — slot for breadcrumb items + separators).
  - Actions slot (frame fit_content horizontal, gap `$space-2` — slot cho action buttons như "+ Create").
  - User menu trigger (avatar 32×32 + chevron-down).

**Demo** sub-frame `Topbar Demo`: breadcrumb `Audits / google.com`, action button "+ New Audit", user menu.

#### 4.6.6 `Component/AppShell/Wrapper`

**Master shell** dùng cho mọi page có authentication.

**Spec**:
- Frame horizontal, width 1440, height fit_content(900), fill `$color-bg`.
- Children:
  - Sidebar/Container instance (width 240, height fill_container).
  - Right column: Frame vertical, fill_container width, fill_container height, layout vertical:
    - Topbar instance (fill_container width).
    - Main slot (frame fill_container width, fill_container height, padding `$space-8`, **slot: empty for page content**).

**Demo** sub-frame `AppShell Demo`: 1 instance, main slot có placeholder text "Page content goes here" (kèm note: page agents Phase 2 sẽ replace slot).

---

## 5. Layout — extension to existing file

Foundation `system-tokens.pen` đã có 3 frame top-level: `Tokens`, `Base`, `Domain`. Phase 1 A1:

1. **Extend frame `Domain`**: thêm 5 sub-frame demo cho 5 component mới (sau 3 backbone hiện có).
2. **Thêm frame top-level mới `AppShell`** ở y=4500 (sau Domain), width 1920:
   - Sub-frame `Sidebar Header Demo`
   - Sub-frame `Sidebar NavItem Demo`
   - Sub-frame `Sidebar Footer Demo`
   - Sub-frame `Sidebar Container Demo` (240px + 64px cạnh nhau)
   - Sub-frame `Topbar Demo`
   - Sub-frame `AppShell Demo` (full shell wrapper)

---

## 6. Anti-patterns — refuse

(thêm specific cho A1 ngoài INTENT base)
- ❌ Sidebar fixed pixel khi cần dynamic (luôn dùng fill_container cho main content).
- ❌ Topbar full-height (dùng đúng 56).
- ❌ Logo emoji (dùng lucide icon).
- ❌ Avatar gradient (dùng solid bg + initials text hoặc plain placeholder).
- ❌ Nav item dùng underline (dùng bg `$color-bg-overlay` + optional left accent — không underline).
- ❌ ScoreDelta hardcoded color (luôn ref `$color-class-excellent` / `$color-class-poor`).
- ❌ KeywordTable cell padding khác nhau giữa các row (consistent strict).

---

## 7. Workflow

1. **Setup worktree**:
   ```bash
   git worktree add .claude/worktrees/design-phase-1-a1 -b design/phase-1-a1
   cd .claude/worktrees/design-phase-1-a1
   ```
2. Verify `design/system-tokens.pen` đã có Phase 0 content (3 frame top-level).
3. Open document + get_editor_state.
4. Get_variables để verify foundation variables sẵn sàng.
5. Load guides (Web App + Design System).
6. Build 5 domain components (extend frame `Domain`):
   - 1 component / batch_design call (≤25 ops).
   - Component reusable trước → demo instance sau.
   - Screenshot mỗi component.
7. Build AppShell sub-components (frame `AppShell` mới):
   - Sidebar/Header → NavItem → Footer → Container (parent uses 3 child) → Topbar → AppShell wrapper.
   - Mỗi cái 1 batch_design call.
   - Screenshot mỗi.
8. QA tổng: `get_screenshot` cho frame `Domain` (full) + `AppShell` (full).
9. Commit theo §9 convention.
10. Hand-off: viết `.planning/PHASE-1-A1-DONE.md`.

---

## 8. Done checklist

### 5 domain components
- [ ] CategoryRadar reusable, 1 demo với 6 cat scores.
- [ ] RuleResultRow reusable, 6 demo (3 status × 2 state collapsed/expanded).
- [ ] CwvCard reusable, 1 demo với 3 metric color đúng threshold.
- [ ] KeywordTable reusable, 5 row demo + header row.
- [ ] ScoreDelta reusable, 3 demo (positive/negative/zero).
- [ ] All 5 components dùng `$variable` references, no hardcoded.

### AppShell components
- [ ] Sidebar/Header reusable, 2 variant (expanded 240 + collapsed 64).
- [ ] Sidebar/NavItem reusable, 3 state demo (active, default, collapsed).
- [ ] Sidebar/Footer reusable, expanded + collapsed.
- [ ] Sidebar/Container reusable, 2 variant demo cạnh nhau.
- [ ] Topbar reusable, demo có breadcrumb + actions + user menu.
- [ ] AppShell/Wrapper reusable, demo full với main slot placeholder.
- [ ] Slot conventions đúng (Sidebar nav slot, AppShell main slot).

### Anti-pattern
- [ ] No emoji, no gradient, no glassmorphism.
- [ ] No hardcoded color/spacing.

### Hand-off
- [ ] `.planning/PHASE-1-A1-DONE.md` exist với screenshot links.
- [ ] Branch `design/phase-1-a1` push.
- [ ] PR title: `design(phase-1-a1): 5 domain components + AppShell`.

---

## 9. Worktree + commit convention

- **Worktree path**: `.claude/worktrees/design-phase-1-a1/`
- **Branch**: `design/phase-1-a1`
- **Commit prefix**: `design(phase-1-a1):`
- **Commit splits**:
  1. `design(phase-1-a1): add CategoryRadar domain component`
  2. `design(phase-1-a1): add RuleResultRow with 6 status/state demos`
  3. `design(phase-1-a1): add CwvCard with threshold coloring`
  4. `design(phase-1-a1): add KeywordTable with 5-row demo`
  5. `design(phase-1-a1): add ScoreDelta pill with 3 variants`
  6. `design(phase-1-a1): add Sidebar Header/NavItem/Footer components`
  7. `design(phase-1-a1): add Sidebar Container with expanded+collapsed variants`
  8. `design(phase-1-a1): add Topbar component`
  9. `design(phase-1-a1): add AppShell wrapper with main slot`
  10. `design(phase-1-a1): hand-off doc + screenshots`

---

## 10. Hand-off to Phase 2

Sau khi A1 merge `main`:
- `system-tokens.pen` foundation v2 = tokens + 11 base + 8 domain + AppShell.
- Phase 2 page agents clone foundation v2 → `design/page/<slug>.pen` rồi design page content trong main slot AppShell hoặc no-shell layout.
