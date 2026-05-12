# PHASE 0 — Foundation (`system-tokens.pen`)

> **Self-contained spec.** Đọc cold, không cần context conversation. Mọi thứ cần để hoàn thành phase này nằm trong file này + `INTENT.md` + `BACKEND-API.md`.

---

## 0. Mission

Build **1 file foundation** `design/system-tokens.pen` chứa:
1. **Variables** (tokens) — color (5 nhóm), typography, spacing, radius — dual theme dark/light.
2. **Base components** (Shadcn-style, ≥11 cái, all `reusable: true`).
3. **3 backbone domain components** — `ScoreRing`, `StatusPipeline`, `CategoryBars`.

File này là **template** mà Phase 1+ sẽ `cp` ra `design/page/<slug>.pen` cho mỗi page agent. Sai foundation = rework toàn bộ 15 page sau.

**KHÔNG design page nào ở phase này.** Chỉ tokens + components.

---

## 1. Inputs (đọc trước khi code)

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §1 vibe, §4 domain components, §5 color semantics, §6 typography, §7 layout, §10 anti-patterns |
| `design/BACKEND-API.md` | §7 enums (`AuditStatus`, `Classification`) — color palette phải map đúng |
| Pencil guide `Web App` | Load qua `get_guidelines({ category: "guide", name: "Web App" })` — đọc trước batch_design |
| Pencil guide `Design System` | Load qua `get_guidelines({ category: "guide", name: "Design System" })` |
| Pencil guide `Tailwind` | Load qua `get_guidelines({ category: "guide", name: "Tailwind" })` — vibe Linear/Vercel align với Tailwind v4 tokens |

**KHÔNG đọc**: `apps/`, `packages/`, source code FE/BE — không cần.

---

## 2. Why this phase exists (lý do bắt buộc serial 1 agent)

- `ScoreRing` + `StatusPipeline` + `CategoryBars` là "score visual = protagonist" (INTENT §1). Cả 9/15 page tier-2/3 dùng `ScoreRing`. Sai = rework cascade.
- Color conflict (green xuất hiện 3 context: `completed` / `excellent` / CWV `good`) phải resolve nhất quán bằng 1 não duy nhất (INTENT §5).
- Theme dual (dark default + light override) cần variable structure đúng từ đầu — sai schema = phải rebuild.
- Base components là Shadcn semantic, có dùng đúng mới giữ vibe Linear/Vercel.

---

## 3. Variables to define (theme-aware)

> Dùng `set_variables` tool. **Mọi color variable PHẢI có 2 entry: 1 dark, 1 light.** Dark là default theme.

### 3.1 Themes config — auto-register (KHÔNG cần manual set)

> ✅ **Verified ở smoke test 2026-05-09**: Không cần set `themes` config riêng. Khi `set_variables` nhận variable có entries `{ value, theme: { theme: "dark"|"light" } }`, document tự register `themes: {"theme": ["dark","light"]}`.
>
> ⚠️ **Variable name KHÔNG có prefix `$`** khi truyền vào `set_variables` tool. Prefix `$` chỉ dùng khi reference từ property (e.g. `fill: "$color-bg"`).
>
> **Per-node theme override**: Để QA visual cả 2 theme cạnh nhau, dùng `U("<frameId>", {theme: {theme: "light"}})` qua `batch_design`. Override propagate xuống children. Có thể clone frame và set theme override trên copy để giữ cả 2 visual.

### 3.2 Color — Surface & text (semantic)

| Variable | Dark | Light | Usage |
|---|---|---|---|
| `$color-bg` | `#0A0A0B` | `#FFFFFF` | Page background |
| `$color-bg-elevated` | `#111113` | `#FAFAFA` | Card, dialog, dropdown |
| `$color-bg-overlay` | `#1A1A1D` | `#F4F4F5` | Hover, popover |
| `$color-fg` | `#FAFAFA` | `#0A0A0B` | Primary text |
| `$color-fg-muted` | `#A1A1AA` | `#52525B` | Secondary text, label |
| `$color-fg-subtle` | `#71717A` | `#71717A` | Placeholder, hint |
| `$color-fg-disabled` | `#52525B` | `#A1A1AA` | Disabled state |
| `$color-border` | `#27272A` | `#E4E4E7` | Card stroke, divider |
| `$color-border-strong` | `#3F3F46` | `#D4D4D8` | Input focus, table row |
| `$color-primary` | `#FAFAFA` | `#0A0A0B` | Brand accent (mono Linear-style) |
| `$color-primary-fg` | `#0A0A0B` | `#FAFAFA` | Text on primary fill |

### 3.3 Color — Status palette (audit pipeline)

> KHÔNG share với classification. Mỗi context có variable riêng để FE map dễ.

| Variable | Both themes | Usage |
|---|---|---|
| `$color-status-pending` | `#71717A` (neutral-500) | `pending` audit |
| `$color-status-active` | `#3B82F6` (blue-500) | `crawling`, `analyzing`, `reporting` (3 status active) |
| `$color-status-completed` | `#22C55E` (green-500) | `completed` audit |
| `$color-status-failed` | `#EF4444` (red-500) | `failed` audit |

### 3.4 Color — Classification palette (score quality 0–100)

| Variable | Color | Range |
|---|---|---|
| `$color-class-excellent` | `#22C55E` (green-500) | ≥80 |
| `$color-class-good` | `#3B82F6` (blue-500) | 60–79 — **KHÔNG dùng green nhạt** |
| `$color-class-fair` | `#F59E0B` (amber-500) | 40–59 |
| `$color-class-poor` | `#EF4444` (red-500) | <40 |

### 3.5 Color — CWV palette (Google threshold)

> Dùng tint nhạt 10% bg để visually subtle hơn classification.

| Variable | Color (full) | BG variant |
|---|---|---|
| `$color-cwv-good` | `#22C55E` | với 10% opacity bg → derive bằng effect, KHÔNG cần variable bg riêng |
| `$color-cwv-needs-improvement` | `#F59E0B` | (tương tự) |
| `$color-cwv-poor` | `#EF4444` | (tương tự) |

### 3.6 Color — Semantic shortcuts (cho toast, alert)

| Variable | Maps to |
|---|---|
| `$color-success` | `$color-status-completed` |
| `$color-warning` | `#F59E0B` (amber-500) |
| `$color-error` | `$color-status-failed` |
| `$color-info` | `$color-status-active` |

### 3.7 Typography

| Variable | Value |
|---|---|
| `$font-ui` | `"Inter"` |
| `$font-mono` | `"JetBrains Mono"` (fallback `"Geist Mono"`) |
| `$text-xs` | `12` |
| `$text-sm` | `13` |
| `$text-base` | `14` (default body) |
| `$text-md` | `15` |
| `$text-lg` | `16` |
| `$text-xl` | `18` |
| `$text-2xl` | `20` |
| `$text-3xl` | `24` |
| `$text-4xl` | `32` |
| `$text-5xl` | `48` (ScoreRing lg center number) |
| `$weight-regular` | `"400"` |
| `$weight-medium` | `"500"` |
| `$weight-semibold` | `"600"` |
| `$weight-bold` | `"700"` |

### 3.8 Spacing (8px scale + half-step ở dưới)

| Variable | Value |
|---|---|
| `$space-1` | `4` |
| `$space-2` | `8` |
| `$space-3` | `12` |
| `$space-4` | `16` |
| `$space-5` | `20` |
| `$space-6` | `24` |
| `$space-8` | `32` |
| `$space-10` | `40` |
| `$space-12` | `48` |
| `$space-16` | `64` |

### 3.9 Radius

| Variable | Value | Usage |
|---|---|---|
| `$radius-none` | `0` | Table, sharp |
| `$radius-sm` | `4` | Badge, input |
| `$radius-md` | `6` | Default card, button |
| `$radius-lg` | `8` | Dialog |
| `$radius-xl` | `12` | Score card prominent |
| `$radius-pill` | `999` | Pill badge, avatar |

---

## 4. File structure (top-level frames)

File `system-tokens.pen` có **3 top-level frame** (placeholder: false khi done):

```
[Frame "Tokens"]      x=0,    y=0       — visual swatch của variables (QA only)
[Frame "Base"]        x=0,    y=900     — base components reusable (grid)
[Frame "Domain"]      x=0,    y=2400    — 3 backbone domain components
```

Khoảng cách y giữa frame: tối thiểu 80px gap visual.

### 4.1 Frame `Tokens` — visual swatch (QA only, không reusable)

Mục đích: human review variables đúng chưa, không phải dùng làm component.

Nội dung 3 cột:
1. **Color swatches**: 4×4 grid mỗi nhóm (surface/status/classification/cwv) — mỗi swatch là rectangle 80×80 với fill = variable + label tên variable + hex value (mono font).
2. **Typography stack**: render 10 sample text từ `$text-xs` đến `$text-5xl`, mỗi sample show "Aa Bb 123" với label tên variable.
3. **Spacing visualization**: 10 horizontal bar, length = giá trị spacing, label tên variable.

Frame width 1440. Layout vertical, gap `$space-12`.

### 4.2 Frame `Base` — components reusable (≥11 cái)

> Mỗi component `reusable: true`, name theo convention `Component/<Name>/<Variant>` (Pencil best practice).

**Required (min):**

| Component | Variants | Slot/structure |
|---|---|---|
| `Component/Button/Primary` | sm, md, lg | icon-left slot + label + icon-right slot |
| `Component/Button/Secondary` | sm, md, lg | (như primary, fill `$color-bg-elevated`) |
| `Component/Button/Outline` | sm, md, lg | stroke `$color-border`, no fill |
| `Component/Button/Ghost` | sm, md, lg | no stroke no fill, hover bg |
| `Component/Button/Destructive` | md | fill `$color-error` |
| `Component/Button/Icon` | sm, md | square, chỉ 1 icon |
| `Component/Input/Default` | md | label slot + input box + helper text slot |
| `Component/Input/Error` | md | (như default + stroke `$color-error` + error text) |
| `Component/Card` | default | header slot + content slot + actions slot (theo Design System guide §5) |
| `Component/Badge/Filled` | success, warning, error, info, neutral | dot icon optional + label |
| `Component/Badge/Outline` | neutral | (variant) |
| `Component/Tabs/Item` | active, inactive | label + underline (active) |
| `Component/Toast` | success, warning, error, info | icon + title + description + close btn |
| `Component/Skeleton` | line, rectangle, circle | placeholder shimmer (animation describe trong note, không generate gif) |
| `Component/Dialog` | default | header + content + actions slot |
| `Component/Select/Trigger` | default | label slot + chevron-down icon |
| `Component/Checkbox` | unchecked, checked, indeterminate | square 16×16 + check icon (when checked) |
| `Component/Toggle` | off, on | pill background + circle thumb |

**Optional (nếu thời gian)**:
- `Component/Sidebar/Container` (240px expanded + 64px collapsed variant) — header (logo) + nav slot + footer
- `Component/Sidebar/NavItem` (active, inactive) — icon + label + badge optional
- `Component/Topbar` — breadcrumb slot + spacer + user menu + theme toggle
- `Component/Pagination` — prev btn + page slot + next btn

> Sidebar/Topbar sẽ build chi tiết ở Phase 1 Agent A1 (AppShell). Phase 0 chỉ build nếu có thời gian; nếu skip, ghi rõ vào hand-off.

**Layout frame `Base`:**
- Width 1920, layout vertical, padding `$space-8`, gap `$space-12`.
- Mỗi component group (Button/Input/Card/...) là 1 sub-frame horizontal layout, gap `$space-4`, render hết variant cạnh nhau.
- Label sub-frame trên mỗi group: text fontSize `$text-xl`, fontWeight `$weight-semibold`, fill `$color-fg-muted`.

### 4.3 Frame `Domain` — 3 backbone components

> 3 component này MUST có ở Phase 0. 5 component domain còn lại (CategoryRadar, RuleResultRow, CwvCard, KeywordTable, ScoreDelta) làm ở Phase 1.

#### 4.3.1 `Component/ScoreRing`

**Spec:**
- 3 size: sm 48×48, md 80×80, lg 160×160.
- Cấu trúc: ellipse (innerRadius=0.7, sweepAngle theo score: `score/100 * 360`) + center group (number + suffix `/100`).
- Color: fill ring theo classification — pass classification value qua override khi instance.
- Center number: font `$font-mono`, weight `$weight-bold`, size theo ring size (sm: `$text-lg`, md: `$text-3xl`, lg: `$text-5xl`).
- Suffix `/100`: font `$font-mono`, fill `$color-fg-muted`, size 1 step nhỏ hơn number.
- Background ring (track): ellipse cùng size, full sweep, fill `$color-border`, opacity 1.
- Score ring: cùng ellipse, sweep theo score, fill = classification color.

**Demo instances** (12 cái, 4 classification × 3 size):
- Render trong sub-frame "ScoreRing Demo" — grid 4 col × 3 row.
- Score samples: excellent=92, good=68, fair=48, poor=24.

#### 4.3.2 `Component/StatusPipeline`

**Spec:**
- Horizontal layout, 6 step: pending → crawling → analyzing → reporting → completed → failed.
  - Lưu ý: trong runtime KHÔNG bao giờ thấy completed + failed cùng lúc. Nhưng component design cần render đủ 6 để demo.
- Mỗi step: vertical stack (dot/circle 24×24 + label `$text-xs` mono uppercase).
- Connector line giữa step: horizontal line, height 2, fill `$color-border`, length flex (fill_container).
- State variants per step:
  - **pending** (chưa tới): circle outline `$color-border-strong`, no fill, label `$color-fg-subtle`.
  - **active** (đang chạy, dùng cho crawling/analyzing/reporting): circle fill `$color-status-active`, có pulse ring outer (note: Pencil không animation runtime — design ring outer đậm hơn để imply pulse), label `$color-fg`.
  - **done**: circle fill `$color-status-completed` + icon check (lucide `check`, 12×12, fill `$color-primary-fg`), label `$color-fg-muted`.
  - **failed**: circle fill `$color-status-failed` + icon x (lucide `x`, 12×12, fill `$color-primary-fg`), label `$color-fg`.
  - **skipped** (sau failed): circle outline + dashed stroke, label `$color-fg-disabled`.

**Demo instances** (3 trong sub-frame "StatusPipeline Demo", vertical stack gap `$space-8`):
1. **In-progress**: pending=done, crawling=done, analyzing=active, reporting=pending, completed=pending, failed=skipped.
2. **Completed**: pending=done, crawling=done, analyzing=done, reporting=done, completed=done, failed=skipped.
3. **Failed (at analyzing)**: pending=done, crawling=done, analyzing=failed, reporting=skipped, completed=skipped, failed=skipped.

#### 4.3.3 `Component/CategoryBars`

**Spec:**
- Vertical stack 6 row, gap `$space-3`.
- Mỗi row: horizontal layout, alignItems center, gap `$space-4`:
  - Label trái: width 140, font `$font-ui`, size `$text-sm`, weight `$weight-medium`, fill `$color-fg-muted` — text từ 6 category INTENT (Meta, Headings, Images, Links, Performance, Technical).
  - Bar middle: fill_container width, height 8, radius `$radius-pill`. Track bg `$color-border`. Foreground fill width = score% (ratio), fill = classification color của score.
  - Score number phải: width 48, font `$font-mono`, size `$text-sm`, weight `$weight-semibold`, textAlign right, fill theo classification color.

**Demo instance** (1 trong sub-frame "CategoryBars Demo"):
- 6 categories với scores varied: Meta=88, Headings=72, Images=54, Links=91, Performance=43, Technical=67.

---

## 5. Layout constraints (toàn file)

- **Tokens** frame: width 1440, fit_content height.
- **Base** frame: width 1920, fit_content height.
- **Domain** frame: width 1920, fit_content height.
- All top-level: padding `$space-8`, fill `$color-bg`.
- Theme: design dark first (preview qua `set_variables` xong, screenshot frame để xác nhận dark hiển thị đúng).

---

## 6. Anti-patterns — phải refuse

(copy từ INTENT §1, §10)

- ❌ Gradient mesh, mesh fill multi-color.
- ❌ Glassmorphism overuse (background-blur > 20).
- ❌ Soft pastel palette.
- ❌ Corporate-blue Bootstrap-style.
- ❌ Hero illustration / decorative graphics.
- ❌ Emoji decoration trong component.
- ❌ Hardcoded hex value bên trong component (PHẢI ref `$variable`).
- ❌ Mock-up người dùng tên thật (dùng "Linh Nguyen", "Duc Pham", "Nam Tran" — match seed accounts).
- ❌ Marketing landing visual (anh hero card, gradient CTA).

---

## 7. Workflow (step-by-step)

1. **Setup worktree** (anh đã set up trước khi spawn agent — agent chỉ cần work tại path):
   ```bash
   git worktree add .claude/worktrees/design-phase-0 -b design/phase-0-foundation
   ```
2. **Verify file**: agent confirm `design/system-tokens.pen` tồn tại trong worktree path.
3. **Open document**: `mcp__pencil__open_document({ path: ".../design/system-tokens.pen" })`.
4. **Get state**: `mcp__pencil__get_editor_state({ include_schema: true })` để load schema.
5. **Get current vars**: `mcp__pencil__get_variables` để xem có sẵn gì chưa.
6. **Load guides** (theo thứ tự):
   - `get_guidelines({ category: "guide", name: "Web App" })`
   - `get_guidelines({ category: "guide", name: "Design System" })`
7. **Set variables** (1 call, batch all):
   - `mcp__pencil__set_variables` với toàn bộ §3 (color × 25 + typography × 14 + spacing × 10 + radius × 6 = ~55 variable).
   - **KHÔNG truyền `$` prefix trong tên variable** (truyền `color-bg`, không phải `$color-bg`). `$` chỉ dùng khi reference từ property.
   - **KHÔNG cần set themes config riêng** — auto-register khi variables có theme entries (verified smoke test).
   - Mỗi color variable PHẢI có entries cả dark + light: `value: [{ value: "#0A0A0B", theme: { theme: "dark" } }, { value: "#FFFFFF", theme: { theme: "light" } }]`.
8. **Build frame Tokens** (visual swatch):
   - `batch_design`: 1 frame top-level + 3 sub-frame (color/typography/spacing).
   - Screenshot verify.
9. **Build frame Base** (components):
   - Mỗi group (Button/Input/Card/...) là 1 batch_design call (~15 ops/call). Tách thành nhiều call nếu cần.
   - Screenshot mỗi group sau khi build.
10. **Build frame Domain** (3 backbone):
    - 1 component / batch_design call.
    - ScoreRing: build component reusable trước, sau đó 12 demo instance.
    - StatusPipeline: build component, sau đó 3 demo instance.
    - CategoryBars: build component, sau đó 1 demo instance.
    - Screenshot mỗi component.
11. **Final QA**:
    - `get_screenshot` cho 3 frame top-level (Tokens, Base, Domain).
    - Verify done checklist §8.
12. **Commit theo §9 convention.**
13. **Hand-off**: viết file `.planning/PHASE-0-DONE.md` ngắn — list components đã có, screenshot links, gap còn lại (nếu có).

---

## 8. Done checklist (mọi bullet PASS = ready merge)

### Variables
- [ ] `themes` config khai báo `dark` + `light`.
- [ ] 25 color variables defined, mỗi cái có 2 entry (dark + light).
- [ ] 14 typography variables (2 font + 10 size + 4 weight — wait 16 nhưng spec là 2+10+4 = 16; recount nếu thiếu).
- [ ] 10 spacing variables.
- [ ] 6 radius variables.
- [ ] No hardcoded hex inside any component (all reference `$variable`).

### Frame Tokens (QA swatch)
- [ ] 4 color swatch group (surface/status/classification/cwv) hiển thị đúng theme dark.
- [ ] Typography stack 10 sample render đúng font Inter.
- [ ] Spacing visualization 10 bar có length đúng tỉ lệ.
- [ ] Toggle theme dark→light qua Pencil (nếu hỗ trợ) hoặc set theme variant — light render đúng.

### Frame Base (components)
- [ ] ≥11 component required đã có, mỗi cái `reusable: true`.
- [ ] Mỗi component có ít nhất 1 demo instance render trong frame Base.
- [ ] Button có 5 variant × 3 size minimum.
- [ ] Card có 3 slot (header/content/actions) đúng pattern Design System guide §5.
- [ ] Input có label + input + helper slot đúng.

### Frame Domain (3 backbone)
- [ ] `ScoreRing` reusable, 3 size, render 12 demo instance (4 classification × 3 size).
- [ ] `StatusPipeline` reusable, render 3 demo state (in-progress/completed/failed).
- [ ] `CategoryBars` reusable, render 1 demo với 6 category scores varied.
- [ ] Color usage tuân `$color-class-*` cho ScoreRing/CategoryBars, `$color-status-*` cho StatusPipeline.

### Anti-pattern
- [ ] No gradient mesh, no glassmorphism, no pastel.
- [ ] No emoji trong component.
- [ ] No hero illustration.

### Hand-off
- [ ] File `.planning/PHASE-0-DONE.md` exist với screenshot links.
- [ ] Branch `design/phase-0-foundation` push lên remote.
- [ ] PR title: `design(phase-0): foundation tokens + base components + 3 backbone domain`.

---

## 9. Worktree + commit convention

- **Worktree path**: `.claude/worktrees/design-phase-0/`
- **Branch**: `design/phase-0-foundation`
- **Commit prefix**: `design(phase-0):`
- **Commit splits** (atomic):
  1. `design(phase-0): add theme config + color/typography/spacing/radius variables`
  2. `design(phase-0): add Tokens visual swatch frame for QA`
  3. `design(phase-0): add Base components — Button/Input/Card/Badge/Tabs/Toast`
  4. `design(phase-0): add Base components — Skeleton/Dialog/Select/Checkbox/Toggle`
  5. `design(phase-0): add ScoreRing domain component with 12 demo instances`
  6. `design(phase-0): add StatusPipeline domain component with 3 demo states`
  7. `design(phase-0): add CategoryBars domain component with 6-cat demo`
  8. `design(phase-0): hand-off doc + screenshots`

> KHÔNG commit `.claude/worktrees/`. Thêm vào `.gitignore` nếu chưa có.

---

## 10. Hand-off to Phase 1

Sau khi Phase 0 merge `main`:

1. **Foundation đóng băng**: `design/system-tokens.pen` từ giờ là **read-only template**. Convention: chỉ Phase 0 audit-fix mới đụng vào (qua patch commit `design(phase-0-fix):`).
2. **Phase 1 bootstrap**: 4 worktree spawned. Mỗi agent **first action**:
   ```bash
   cp design/system-tokens.pen design/page/<slug>.pen
   git add design/page/<slug>.pen
   git commit -m "design(phase-1): clone foundation for <slug> page"
   ```
3. **Drift handling**: nếu Phase 0 fix sau khi Phase 1 đã spawn → coordinator chạy script `sync-foundation.sh` (em sẽ viết ở Phase 0 cuối) — re-cp `system-tokens.pen` → `page/<slug>.pen`, sau đó re-apply page diff (nếu conflict, manual resolve).
4. **Phase 1 spec files** (em sẽ viết SAU khi Phase 0 merge OK):
   - `.planning/PHASE-1-AGENT-A1.md` — 5 domain còn lại + AppShell.
   - `.planning/PHASE-1-AGENT-A2.md` — auth-login + auth-register + auth-oauth-success.
   - `.planning/PHASE-1-AGENT-A3.md` — auth-forgot + auth-reset + settings.
   - `.planning/PHASE-1-AGENT-A4.md` — shared-report.

---

## 11. Risk + mitigation

| Risk | Mitigation |
|---|---|
| ~~Pencil không hỗ trợ `themes` đa giá trị~~ ✅ **RESOLVED** smoke test 2026-05-09: pencil hỗ trợ đầy đủ. Không fallback. | — |
| Pencil MCP auto-save persistence: file đang open trong editor MCP, `rm` sẽ bị re-save | Trước khi `rm` test artifact, gọi `mcp__pencil__open_document` sang file khác để release editor lock. Hoặc accept `rm -f` 2 lần. |
| ScoreRing với `sweepAngle` math sai (innerRadius vs sweepAngle conflict) | Verify từng size sm/md/lg riêng. Score ring + track ring phải overlap perfect — cùng position, cùng size, khác sweep. |
| Component count quá lớn 1 batch_design call (>25 ops) | Tách nhiều call. Mỗi call ≤25 ops theo guide. |
| Variables count >55 vượt limit Pencil | Test batch set_variables. Nếu fail, chia 4 call (color/typography/spacing/radius). |
| Anti-pattern leak (emoji trong icon font) | Lucide icon set không có emoji — ép dùng `iconFontFamily: "lucide"` only. |

---

## 12. Definition of Done (1 sentence)

> File `design/system-tokens.pen` chứa themes + 55 variables + ≥11 base reusable components + 3 backbone domain reusable components, tất cả render đúng dark theme (default) và light theme override, screenshot 3 top-level frame attached vào hand-off doc, branch `design/phase-0-foundation` push lên remote sẵn sàng PR.
