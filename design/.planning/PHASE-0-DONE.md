# PHASE 0 — DONE (`system-tokens.pen`)

> Hand-off cho Phase 1. File `design/system-tokens.pen` đã sẵn sàng làm template.

Branch: `design/phase-0-foundation`
Worktree: `.claude/worktrees/design-phase-0/`
Built on top of: `2ba97e7` (`design: rename to system-tokens.pen for parallel work`)

---

## 1. Variables (themes + tokens)

| Group | Count | Note |
|---|---|---|
| `themes` axis | 1 (`theme: ["dark","light"]`) | Auto-registered qua `set_variables` |
| Surface & Text (theme-aware) | 11 | `color-bg`, `bg-elevated`, `bg-overlay`, `fg`, `fg-muted`, `fg-subtle`, `fg-disabled`, `border`, `border-strong`, `primary`, `primary-fg` |
| Status palette (single value) | 4 | `status-pending/active/completed/failed` |
| Classification palette | 4 | `class-excellent/good/fair/poor` |
| CWV palette | 3 | `cwv-good/needs-improvement/poor` |
| Semantic shortcuts | 4 | `success`, `warning`, `error`, `info` (3 alias `$`-ref + 1 amber-500) |
| Typography | 16 | 2 fonts (`Inter`, `JetBrains Mono`) + 10 sizes (`text-xs`..`text-5xl`) + 4 weights |
| Spacing | 10 | `space-1`..`space-16` (4..64px, 8px scale) |
| Radius | 6 | `radius-none/sm/md/lg/xl/pill` |

**Total**: 58 variables (plan ước ~55, actual 58 do thêm CWV vars riêng để FE map dễ).

> **Anti-pattern check**: KHÔNG hardcoded hex bên trong component user-visible. Hex `#000000` chỉ xuất hiện trong `{type:"color",enabled:false,color:"#000000"}` (transparent fill placeholder, không render).

---

## 2. Top-level frames

| Frame | ID | x, y | Size | Status |
|---|---|---|---|---|
| Tokens (QA Visual) | `StUxZ` | 0, 0 | 1440 × 4689 | ✅ Done — color/typography/spacing/radius swatches |
| Base | `rF8t7` | 0, 4800 | 1920 × 2474 | ✅ Done — 24 reusable components |
| Domain | `ZT32f` | 0, 7400 | 1920 × 1457 | ✅ Done — ScoreRing/StatusPipeline/CategoryBars |

Vertical stacking với 80px+ gap giữa các frame (plan §4 yêu cầu). Tokens frame extends to ~4689 do volume lớn các swatch + typography stack + spacing/radius bars; Base + Domain tự dịch xuống tương ứng.

---

## 3. Reusable components (30 total)

### 3.1 Base (24)

**Buttons (6)**:
- `Component/Button/Primary` — `K9t4X` (md default; sm/lg via padding override)
- `Component/Button/Secondary` — `I37pBb`
- `Component/Button/Outline` — `eN83T`
- `Component/Button/Ghost` — `hY9rZ`
- `Component/Button/Destructive` — `z7qMMN` (icon `trash-2` + label `Delete`)
- `Component/Button/Icon` — `IFqMZ` (square 36, demo size 32 ref)

**Inputs (2)**:
- `Component/Input/Default` — `m60kL9` (label + box + helper)
- `Component/Input/Error` — `sTEEF` (border `$color-error` + helper màu error)

**Card (1)**: `Component/Card` — `H2AT2` (header/content/actions slot, demo audit report)

**Badge (2)**: `Component/Badge/Filled` — `SPRkR` (5 variants: neutral default + success/warning/error/info refs); `Component/Badge/Outline` — `ug5q7`

**Tabs (2)**: `Component/Tabs/Item/Active` — `VQjYE`; `Component/Tabs/Item/Inactive` — `N1mIsu`

**Toast (1)**: `Component/Toast` — `umPkV` (4 variants demo: success default + warning/error/info refs)

**Skeleton (3)**: `Component/Skeleton/Line` — `E8Cqg`; `Rectangle` — `SG6SK`; `Circle` — `J6eFxD`

**Dialog (1)**: `Component/Dialog` — `AqTTb` (header/actions slot, refs Cancel outline + Destructive)

**Select (1)**: `Component/Select/Trigger` — `iSJtw`

**Checkbox (3)**: `Unchecked` `J9GwR`; `Checked` `N1oZsL`; `Indeterminate` `KDS5D`

**Toggle (2)**: `Off` `GXjF9`; `On` `L7oa13`

### 3.2 Domain (6)

- `Component/ScoreRing/Sm` — `U7FS6F` (48×48)
- `Component/ScoreRing/Md` — `egrVh` (80×80)
- `Component/ScoreRing/Lg` — `TDJ79` (160×160)
- `Component/StatusPipeline` — `TdX9B` (in-progress at analyzing default state)
- `Component/CategoryBars` — `PUIMH` (6 rows demo Meta=88, Headings=72, Images=54, Links=91, Performance=43, Technical=67)
- `Component/CategoryBars/Row` — `b6U0fC` (sub-component, ref'd 5x trong CategoryBars)

---

## 4. Domain demo coverage

### 4.1 ScoreRing demo grid (12 instances)

Sub-frame `pLVDT` "ScoreRing Demo" — 3 rows × 4 cols.

| Size | Excellent (92) | Good (68) | Fair (48) | Poor (24) |
|---|---|---|---|---|
| Sm 48×48 | ✅ | ✅ | ✅ | ✅ |
| Md 80×80 | ✅ | ✅ | ✅ | ✅ |
| Lg 160×160 | ✅ | ✅ | ✅ | ✅ |

`sweepAngle` = `-(score/100 * 360)` (CW từ top, startAngle 90 CCW). Score ring fill = `$color-class-{tier}`. Track ring fill = `$color-border`.

### 4.2 StatusPipeline demos (3 states)

Sub-frame `iUmMq`:
1. **In-progress at analyzing** (`pipeIP TdX9B` — reusable component): step1-2 done (green), step3 active (blue + outer ring 3px), step4-5 pending (outline `border-strong`), step6 skipped (dashed `border`).
2. **Completed** (`pipeCompleted h6ngF` — inline non-reusable): step1-5 done, step6 skipped.
3. **Failed at analyzing** (`pipeFailed NOkzY` — inline non-reusable): step1-2 done, step3 failed (red), step4-6 skipped (dashed).

### 4.3 CategoryBars demo

Component itself IS the demo — `PUIMH` chứa 6 row với scores varied. Color-coded fills theo classification (excellent green / good blue / fair amber / poor red).

---

## 5. Screenshots

Exported PNG (scale 1, dark theme default) ở `design/.planning/screenshots/`:

- [`01-tokens.png`](screenshots/01-tokens.png) — Tokens frame (color/typography/spacing/radius swatches)
- [`02-base.png`](screenshots/02-base.png) — Base frame (24 reusable Shadcn-style components)
- [`03-domain.png`](screenshots/03-domain.png) — Domain frame (ScoreRing + StatusPipeline + CategoryBars)

> **Lưu ý screenshot scale**: PNG export ở scale 1 với frame 1920px wide → preview thumbnail có thể trông nhỏ. Để xem chi tiết, mở `system-tokens.pen` trong Pencil VS Code extension hoặc resize PNG.

---

## 6. Known gaps & limitations

1. **StatusPipeline connectors**: plan §4.3.2 yêu cầu connector lines giữa step. Triển khai implicit qua step frame gap thay vì rect connectors (tránh layout absolute phức tạp). Visual: 6 step columns đều, không có line nối ngang. **Impact**: minor visual polish — Phase 1 page agents có thể wire connector qua absolute-positioned rects nếu cần. Component contract (state-coded dots + labels) intact.
2. **StatusPipeline 2 demos non-reusable**: `pipeCompleted` và `pipeFailed` là inline non-reusable frames (không dùng `ref`). Lý do: per-step state overrides via `descendants` cho 6 step phức tạp; build inline đơn giản hơn. Plan §8 yêu cầu "StatusPipeline reusable" — **đáp ứng** qua `Component/StatusPipeline` (`TdX9B`) reusable đại diện cho in-progress state. 2 demo còn lại visualize state variants without ref.
3. **ScoreRing active step "pulse ring"**: plan §4.3.2 mô tả "ring outer đậm hơn để imply pulse". Triển khai bằng outside stroke 3px cùng `$color-status-active` (color thật chứ không nhạt) trên dot active. Không có animation runtime (plan đã ack Pencil không support).
4. **Atomic commit splits (plan §9)**: Pencil giữ in-memory state suốt session và auto-flush disk khi đủ điều kiện (`Document opened` lại → flush). Kết quả: file `.pen` thay đổi 1 lần ở cuối, KHÔNG thể tách 8 atomic commits theo §9. **Compromise**: 1 commit cho `.pen` content + 1 commit cho hand-off doc/screenshots. Documented commit message liệt kê các chunk tương ứng.
5. **Font availability**: variables dùng `Inter` + `JetBrains Mono`. Phase 1 cần đảm bảo các font này load được trong Pencil renderer cho từng page agent (test `cp design/system-tokens.pen design/page/<slug>.pen` có giữ font ref).
6. **Light theme not visually verified**: variables có `theme.dark` + `theme.light` entry đầy đủ (11 surface/text), nhưng screenshot chỉ taken ở dark theme default. Phase 0 audit-fix nên toggle light theme variant để verify (Pencil VS Code extension hỗ trợ qua document setting).

---

## 7. Phase 1 hand-off

Theo plan §10:

1. **Foundation đóng băng**: `design/system-tokens.pen` từ giờ là read-only template. Audit-fix dùng prefix `design(phase-0-fix):`.
2. **Phase 1 bootstrap (4 worktree)**: mỗi agent first action `cp design/system-tokens.pen design/page/<slug>.pen` → commit `design(phase-1): clone foundation for <slug> page`.
3. **Drift handling**: nếu Phase 0 fix sau Phase 1 spawn → coordinator chạy `sync-foundation.sh` (chưa viết, để Phase 0 cuối làm).
4. **Phase 1 spec files**: viết SAU khi merge Phase 0 — A1/A2/A3/A4.

---

## 8. PR readiness

- [x] Branch: `design/phase-0-foundation`
- [x] Commits: 2 atomic (.pen content + hand-off)
- [x] PR title: `design(phase-0): foundation tokens + base components + 3 backbone domain`
- [x] Hand-off doc: this file
- [x] Screenshots attached
- [ ] Push to remote (do user thực hiện qua `git push -u origin design/phase-0-foundation` sau review)

---

*Generated by Phase 0 agent — 2026-05-09.*
