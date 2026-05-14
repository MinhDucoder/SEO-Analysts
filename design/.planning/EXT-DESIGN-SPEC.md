# Extension Design Spec — Pencil source: `apps/extension/ext.pen`

> **Ngày:** 2026-05-14
> **Pencil file:** [`apps/extension/ext.pen`](../../apps/extension/ext.pen)
> **Backup file v1:** `apps/extension/ext-v1.pen.bak`
> **Tiền đề doc:** [`docs/extension/01-current-state.md`](../../docs/extension/01-current-state.md), [`docs/extension/02-design.md`](../../docs/extension/02-design.md)
> **Aesthetic:** Linear-mono (theo decision trong [project_design_phase_system](#)) — `#FAFAFA` light / `#0A0A0B` dark, không corporate-blue.

---

## 0. TL;DR

Pencil file v2 redesign hoàn toàn từ doc system. 4 view nhóm canvas, 18 reusable components, dual-theme (light/dark) qua variable system. Implement bằng inline React styles trong `apps/extension/` (theo `feedback_ext_inline_styles` memory — không Tailwind/shadcn).

| Group | Top-level node ID | Nội dung |
|---|---|---|
| Design System | `Mdvgq` | 18 reusable components + tokens reference |
| Popup Screens | `Bz06Y` | 5 states: Empty, Idle, Loading, Result, Error |
| Options Page | `j1BZm` | Saved key card + paste form + permission/trust card |
| Issue Card Variants | `QeIpJ` | 6 cards × 3 severity × 4 suggestion types |
| Side Panel | `oOviX` | Phase 4 full view 496px wide |

---

## 1. Design Tokens

### 1.1. Color — Linear-mono dual theme

Tất cả color đều có variant `light` + `dark` qua `theme: { mode: ... }`.

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `bg-canvas` | `#FAFAFA` | `#0A0A0B` | Page background (options, sidepanel host) |
| `bg-surface` | `#FFFFFF` | `#111113` | Card, popup window, modal |
| `bg-subtle` | `#F4F4F5` | `#18181B` | Header strip, hero, history row hover |
| `bg-muted` | `#EEEEEF` | `#1F1F23` | Score ring track, progress bar track |
| `border-default` | `#E4E4E7` | `#27272A` | Card border, input default |
| `border-strong` | `#D4D4D8` | `#3F3F46` | Input hover, divider emphasized |
| `text-primary` | `#0A0A0B` | `#FAFAFA` | Body text, heading |
| `text-secondary` | `#52525B` | `#A1A1AA` | Subdued copy, label |
| `text-tertiary` | `#71717A` | `#71717A` | Placeholder, meta caption |
| `text-inverse` | `#FAFAFA` | `#0A0A0B` | Text on `accent-primary` |
| `accent-primary` | `#0A0A0B` | `#FAFAFA` | Primary CTA, focus ring, active toggle |
| `accent-on-primary` | `#FAFAFA` | `#0A0A0B` | Text on accent button |

### 1.2. Severity — single value (high-contrast trên cả 2 theme)

| Token | Value | Dùng cho |
|---|---|---|
| `sev-error` / `sev-error-bg` | `#DC2626` / `#FEF2F2` ↔ `#2A0F0F` | severity `error` stripe + alert background |
| `sev-warning` / `sev-warning-bg` | `#B45309` / `#FFFBEB` ↔ `#2A1F0A` | severity `warning` |
| `sev-info` / `sev-info-bg` | `#0284C7` / `#F0F9FF` ↔ `#0A1A2A` | severity `info` |
| `sev-success` / `sev-success-bg` | `#16A34A` / `#F0FDF4` ↔ `#0A2A14` | score ≥ 80, history dot, "fixed" state |

### 1.3. Tag — semantic background pairs

| Pair | Light | Dark | Dùng cho |
|---|---|---|---|
| `tag-live-bg / tag-live-fg` | `#DCFCE7` / `#15803D` | `#0F2A1B` / `#15803D` | API key environment "live" |
| `tag-test-bg / tag-test-fg` | `#DBEAFE` / `#1D4ED8` | `#0F1A2A` / `#1D4ED8` | API key environment "test" |
| `tag-cached-bg / tag-cached-fg` | `#FEF3C7` / `#92400E` | `#2A1F0A` / `#92400E` | `meta.cached=true` |
| `tag-degraded-bg / tag-degraded-fg` | `#E0E7FF` / `#3730A3` | `#1A1F3A` / `#3730A3` | `meta.degraded=true` (LLM → template fallback) |

### 1.4. Spacing scale (4px base)

`space-1`=4 · `space-2`=8 · `space-3`=12 · `space-4`=16 · `space-5`=20 · `space-6`=24 · `space-8`=32 · `space-10`=40

### 1.5. Radius

`radius-xs`=4 · `radius-sm`=6 · `radius-md`=8 · `radius-lg`=12

### 1.6. Typography

- `font-display` = **Inter** — UI default
- `font-mono` = **JetBrains Mono** — URLs, suggestion text, request IDs

| Token | Size (px) | Dùng |
|---|---|---|
| `fs-xs` | 11 | meta caption, badge label |
| `fs-sm` | 12 | description, severity meta |
| `fs-base` | 13 | body, button label, input |
| `fs-md` | 14 | issue title, section heading |
| `fs-lg` | 15 | popup heading H1 |
| `fs-xl` | 18 | section title (options) |
| `fs-2xl` | 22 | design system H1 |
| `fs-3xl` | 28 | score ring number, options page H1 |

---

## 2. Reusable components (18)

Tất cả live trong frame `Mdvgq` (Design System) ở góc trên trái canvas.

| ID | Name | Variants | Notes |
|---|---|---|---|
| `PdbWU` | Button/Primary | — | bg=accent-primary, text=accent-on-primary, padding `[$space-3, $space-2]`, radius `$radius-sm` |
| `q9SMip` | Button/Secondary | — | bg=bg-subtle, border 1px, text=text-primary |
| `jppRX` | Button/Ghost | — | no bg, text=text-secondary, padding `[$space-2, $space-1]` |
| `j4xcH` | Button/Danger | — | bg=sev-error-bg, border=sev-error, text=sev-error |
| `nQos1` | Input/Default | — | width 280 (auto trong screen), placeholder text=text-tertiary |
| `H0lGU` | Input/Focused | — | border 1.5px accent-primary |
| `VTohh` | Input/Error | — | border 1.5px sev-error, text=sev-error |
| `C4H0rT` | Badge/Live | — | tag-live-* |
| `K2QIPy` | Badge/Test | — | tag-test-* |
| `tKWWH` | Badge/Cached | — | tag-cached-* |
| `r9Fx5` | Badge/Degraded | — | tag-degraded-*, content "template-fallback" |
| `pPBAT` | Badge/SevError | — | sev-error-bg / sev-error, content "ERROR" uppercase |
| `T2TM1e` | Badge/SevWarning | — | "WARNING" |
| `xUbGK` | Badge/SevInfo | — | "INFO" |
| `L7tHGP` | ScoreRing | 78/100 default — fill overridable | 96×96, donut (innerRadius 0.78), sweep -280° từ angle 90° (top start) |
| `j0TYc` | SuggestionCard | 4 suggestion types via icon + label | icon=lucide pencil-line/plus/minus/arrow-down-up, mono text, italic rationale |
| `gebbx` | IssueCard | severity stripe 4px + ref nested SuggestionCard | width 340 (override `fill_container` trong screens) |
| `ii18A` | KeywordChip | — | bg=bg-muted, X icon lucide |
| `oVeLb` | FilterChip (active) | — | bg=accent-primary, check icon |
| `Y6bvKr` | FilterChip/Off | — | bg=bg-subtle, border, no check |
| `cGCLL` | HistoryRow | dot color overridable | 380 wide, dot + url(mono) + meta + score(weight 700) |

### 2.1. Override pattern

Khi instance IssueCard, override theo nested descendant paths:

```
gebbx                       (IssueCard)
├─ nQ6O0                    severity-bar (cập nhật fill: $sev-error|warning|info)
├─ YJQMS                    body
│  ├─ HD4w8                 issue-header
│  │  ├─ STntf              title text
│  │  └─ CNv2I              severity badge ref (R-replace với pPBAT/T2TM1e/xUbGK)
│  ├─ lSdtA                 description text
│  ├─ Pvp2W                 SuggestionCard ref
│  │  ├─ U31CXJ             suggestion text
│  │  ├─ iQDdL              rationale text
│  │  ├─ EmjCt              type label
│  │  └─ ooSXF              icon (iconFontName: pencil-line/plus/minus/arrow-down-up)
│  └─ O7fF75                docRef row
```

Example (Pencil DSL):

```js
issue=I(parent,{type:"ref",ref:"gebbx",width:"fill_container"})
U(issue+"/nQ6O0",{fill:"$sev-error"})
U(issue+"/STntf",{content:"Thiếu meta description"})
R(issue+"/CNv2I",{type:"ref",ref:"pPBAT"})
U(issue+"/lSdtA",{content:"…"})
U(issue+"/Pvp2W/U31CXJ",{content:"Hướng dẫn …"})
U(issue+"/Pvp2W/EmjCt",{content:"Add"})
U(issue+"/Pvp2W/ooSXF",{iconFontName:"plus"})
```

---

## 3. Screens

### 3.1. Popup (380×variable, frame `Bz06Y`)

**Window chrome (chung cả 5 state):**
- Container: width 380, radius `$radius-md`, drop shadow `(0, 8, 24, -8, #0A0A0B22)`, border 1px `$border-default`, bg `$bg-surface`
- Header: bg `$bg-subtle`, padding `[$space-4, $space-3]`, height ~50px
  - icon lucide `search-check` 16px text-primary
  - title "SEO Analyst" `$fs-lg` weight 600
  - environment badge (live/test) hoặc `settings-2` icon nếu không có key

#### 3.1.1. Empty state (`FxWhh`)
**Khi:** `loadApiKey()` trả null

Layout (vertical, center):
- Hero icon `key-round` 24px trong 64×64 circle bg `$bg-subtle`
- H1 "Chưa có API key" `$fs-lg` weight 600 center
- Description "Tạo API key ở web app rồi dán vào settings để bật audit on-page." `$fs-sm` text-secondary center
- Primary button "Mở settings" → `chrome.runtime.openOptionsPage()`
- Footer mini: host text `localhost:3000` mono `$fs-xs`

#### 3.1.2. Idle state (`HO97j`)
**Khi:** có key, chưa audit

Form layout:
- Label "Target keyword" → Input/Focused với value "seo 2026"
- Label "Secondary keywords (optional)" → row 2 chips ("on-page", "vietnam") + dashed "+add"
- Label "Language" → segmented control `[vi]` (active) `[en]`
- Divider 1px `$border-default`
- Primary button "Audit trang hiện tại" full-width
- Footer: host (left) + Ghost button "Manage key" (right)

#### 3.1.3. Loading state (`cKuLV`)
**Khi:** audit đang chạy (~1-2s)

- Spinner ellipse 48px dashed stroke `[80, 40]` accent-primary, animate rotation
- H1 "Đang phân tích trang…" weight 600
- Step list (bg `$bg-subtle`, radius sm, padding `$space-3`):
  - ✓ "Probe DOM (URL mode)" — done state
  - ⟳ "Phân tích 20 rules SEO…" — active (icon `loader`, color accent-primary)
  - ◌ "Sinh gợi ý từ LLM" — pending (icon `circle-dashed`, color tertiary)
- Hint "Thường mất 1–2s. Không đóng popup."

#### 3.1.4. Result state (`ZDOAH`) — **screen chính**

Section sequence (top → bottom):

1. **Header** — như chung
2. **Hero** (`sMkIH`, padding `$space-4`, horizontal):
   - ScoreRing 96×96 trái
   - Body right: keyword (sm), URL (mono md), stats "1243 từ · 8 issues · 876ms" tertiary, tags row (cached badge)
3. **Breakdown** (`E56Hw`, padding `[$space-4, $space-2]`):
   - 4 cột equally distributed: content / meta / technical / a11y
   - Mỗi cột: value (`$fs-md` weight 700, color theo điểm: ≥80 primary, ≥60 sev-warning, <60 sev-error) + label `$fs-xs` tertiary
4. **Divider** 1px
5. **Issues header** (`AAcLu`): "Issues" weight 600 + count "5 of 8" tertiary
6. **Issues list** (`bAjI0`, vertical gap `$space-2`):
   - 1+ IssueCard instances width fill_container
   - Demo: warning "Title quá ngắn" + error "Thiếu meta description"
7. **Usage footer** (`HvQgc`, bg `$bg-subtle`, justifyContent space_between):
   - Left: "17 reqs/min · 482/day" tertiary
   - Right: requestId mono + lucide `copy` icon (click → `navigator.clipboard.writeText`)

#### 3.1.5. Error state (`jNJF1`)
**Khi:** PublicApiError thrown

- Alert card bg `$sev-error-bg`, border `$sev-error`:
  - Icon `triangle-alert` 18px
  - Title "Rate limit exceeded" `$fs-base` weight 600 color sev-error
  - Description copy theo code (`$fs-sm` text-primary)
  - Meta row: code mono uppercase + "HTTP {status}" tertiary
- Countdown card bg `$bg-subtle`, padding `$space-3`:
  - Icon `timer` 16px
  - "Retry in 12s…" weight 500
  - Progress bar 4px height (fill width = `12/retryAfter * 100%`, color accent-primary)
- Actions row:
  - Secondary button "Retry now" full-width
  - Ghost button "Copy req_id"

**Branching theo error action** (xem [01-current-state.md § 4.4](../../docs/extension/01-current-state.md)):
- `OPEN_OPTIONS` → swap alert thành "Settings cần thiết" + button "Mở settings"
- `INPUT_FIX` → text-secondary alert (không error-bg)
- `SHOW_SERVER_OUTAGE` → alert text "Server đang bảo trì" (no retry button, only refresh)
- `SHOW_GENERIC` → alert + "Copy req_id" làm CTA chính

### 3.2. Options page (frame `j1BZm`, width 720 demo, render 560-720 prod)

Layout vertical, padding 48px, gap `$space-6`:

1. **Hero** (`nwfwx`):
   - Breadcrumb: icon `settings-2` + "Settings · API key" tertiary
   - H1 "SEO Analyst — Settings" `$fs-3xl` weight 700
   - Intro paragraph `$fs-md` line-height 1.55 text-secondary

2. **Saved key card** (`KJ61m`, hidden khi chưa có key):
   - Header: icon `key-round` + "Saved key" weight 600 + environment badge
   - Row: masked key blob `sk_live_AbCd…E7f9` mono `$fs-md` + "Last used 12m ago" tertiary
   - Actions: Secondary "Replace key" + Danger "Forget this key"

3. **Form card** (`cc5Pr`):
   - Title "Add or replace key" weight 600
   - Hint "Tạo key mới tại web app › Settings › API keys. Plaintext chỉ hiện đúng 1 lần khi tạo."
   - Label "API key" → input type=password mono placeholder `sk_live_…  (43 ký tự sau prefix)`
   - Label "Language (UI)" → segmented [Tiếng Việt] [English]
   - Primary "Save key"

4. **Trust card** (`fTQ1T`) — explain permissions:
   - Icon `shield-check` 18px text-secondary
   - Title "Quyền & bảo mật" weight 600
   - Description liệt kê activeTab/storage/host_permissions + giải thích `chrome.storage.local` không sync

### 3.3. Side panel (frame `oOviX`, Phase 4)

Container 496×variable, sticky header, scrollable content:

1. **Sticky header** (`usbZV`, bg `$bg-subtle`, radius `$radius-md $radius-md 0 0`):
   - `search-check` icon 18px
   - "SEO Analyst" `$fs-lg` weight 600
   - Live badge
   - `settings-2` icon 16px (right) → open options page

2. **Form** (`qvbyC`, padding `$space-4`):
   - Target keyword label + Input/Focused (full width)
   - Secondary label + 3 KeywordChips ("on-page", "vietnam", "2026 trends") + dashed "+add"
   - Filter label + row: FilterChip "Writer" (active) + FilterChip/Off "Dev" + FilterChip "≥ warning" (active)
   - Primary "Audit current page" full-width

3. **Divider**

4. **History section** (`EzYAB`, padding `[$space-3, $space-3]`):
   - Header: "History" weight 600 + "last 20" tertiary + chevron-up (collapsible)
   - 3 HistoryRow demo:
     - dot success #0 + url mono + meta + score 78 green
     - dot warning + score 68 amber
     - dot error + draft URL + score 42 red

5. **Divider**

6. **Result section** (`xC36e`):
   - Section header "Result" weight 600 + cached badge right
   - Hero (`a3ADnP`, bg `$bg-subtle`, radius md, padding `$space-3`):
     - ScoreRing 96 + body: keyword + URL mono + stats "rule v1.2"
   - Issues header "Issues" + "5 of 8 visible" tertiary
   - 3 IssueCard variants (warning + error + info)

7. **Usage footer** (`yBQs5`, bg `$bg-subtle`, radius bottom):
   - Left: "17 reqs/min · 482/day · resets 14:08 UTC" tertiary
   - Right: req_id mono + copy icon

### 3.4. Issue Card variants showcase (frame `QeIpJ`)

Demo 6 cards × 2 cột × 3 rows — coverage:

| Card | Severity | Suggestion type | Purpose |
|---|---|---|---|
| `gxbu5` | error | Rewrite | over-optimization title |
| `aq0l3` | warning | Rewrite | H1 thiếu keyword |
| `pB9w9` | info | Add | thêm internal link |
| `F6MTeK` | warning | Remove | section navigation quá dài |
| `EPcyn` | info | Reorder | thứ tự heading sai |
| `IRELb` | info | Add | thiếu alt cho ảnh |

---

## 4. Theme + variable usage trong code

### 4.1. CSS variable export (proposed `apps/extension/lib/tokens.css.ts`)

```ts
// Generated from design tokens — do NOT edit by hand.
export const tokens = {
  light: {
    '--bg-canvas': '#FAFAFA',
    '--bg-surface': '#FFFFFF',
    '--bg-subtle': '#F4F4F5',
    '--bg-muted': '#EEEEEF',
    '--border-default': '#E4E4E7',
    '--text-primary': '#0A0A0B',
    '--text-secondary': '#52525B',
    '--accent-primary': '#0A0A0B',
    '--accent-on-primary': '#FAFAFA',
    // …
  },
  dark: {
    '--bg-canvas': '#0A0A0B',
    '--bg-surface': '#111113',
    // …flip
  },
  shared: {
    '--sev-error': '#DC2626',
    '--sev-warning': '#B45309',
    '--sev-info': '#0284C7',
    '--sev-success': '#16A34A',
    '--space-2': '8px',
    '--radius-sm': '6px',
    '--fs-base': '13px',
    // …
  },
};
```

### 4.2. Inline style consumption (theo `feedback_ext_inline_styles`)

```tsx
const styles = {
  main: {
    width: 380,
    padding: 'var(--space-3)',
    fontFamily: '"Inter", system-ui, sans-serif',
    color: 'var(--text-primary)',
    background: 'var(--bg-surface)',
  },
  scoreValue: (score: number) => ({
    fontSize: 28,
    fontWeight: 700,
    color: score >= 80 ? 'var(--sev-success)'
         : score >= 60 ? 'var(--sev-warning)'
         : 'var(--sev-error)',
  }),
} satisfies Record<string, React.CSSProperties | ((s: number) => React.CSSProperties)>;
```

CSS variables get set on `<body>` qua effect detect `prefers-color-scheme` ban đầu, override bằng user toggle saved trong `chrome.storage.local`.

---

## 5. Interaction patterns

### 5.1. Severity → visual mapping

| State | Stripe (4px left bar) | Severity badge bg/fg | Suggestion icon |
|---|---|---|---|
| error | `$sev-error` `#DC2626` | `$sev-error-bg` / `$sev-error` | depends on suggestion type |
| warning | `$sev-warning` `#B45309` | `$sev-warning-bg` / `$sev-warning` | depends |
| info | `$sev-info` `#0284C7` | `$sev-info-bg` / `$sev-info` | depends |

### 5.2. Suggestion type → icon mapping (lucide)

| Type | Icon | Label |
|---|---|---|
| `rewrite` | `pencil-line` | Rewrite |
| `add` | `plus` | Add |
| `remove` | `minus` | Remove |
| `reorder` | `arrow-down-up` | Reorder |

### 5.3. Score → ring/breakdown color

```
score >= 80 → sev-success
score >= 60 → sev-warning
score <  60 → sev-error
```

ScoreRing sweep is fixed -280° currently (visual approximation). Trong code:
```ts
const sweepAngle = -(score / 100) * 360;
```
(donut innerRadius 0.78 = 78% inner cutout, ring thickness ~10px).

### 5.4. Cached / Degraded badges

- Render trong hero của Result + Side Panel khi `meta.cached || meta.degraded` true.
- Không ảnh hưởng ring color; chỉ là disclosure.

### 5.5. Loading state — step progression

```ts
type LoadStep = {
  id: 'probe' | 'analyze' | 'enrich';
  status: 'done' | 'active' | 'pending';
  label: string;
};
```

Mapping background event:
- AUDIT_PAGE message gửi → "probe" = pending
- EXTRACT_FOR_CHECK reply OK → "probe" = done, "analyze" = active
- Sau khi gateway response → "analyze" done, "enrich" active (chỉ khi `enrichMode=llm`)
- Response parsed → tất cả done → swap sang Result state

Hiện trong code không emit progress event — Phase 4 có thể thêm `chrome.runtime.sendMessage` từ background mỗi step để popup tick.

---

## 6. Accessibility checklist

| Item | Spec | Implementation note |
|---|---|---|
| Tab order | Header → keyword input → secondary chips → language toggle → primary button → footer manage key | Use semantic `<form>` + native focus |
| Focus ring | 1.5px `$accent-primary` (matches Input/Focused) | `:focus-visible` |
| Color contrast | All text ≥ 4.5:1 vs background (Linear-mono palette designed for this) | Verified manually từ tokens light + dark |
| Severity stripe | Visual only, NOT sole indicator — pair với badge label (text "ERROR"/"WARNING"/"INFO") | Already in design |
| Icons | All paired với text label (no icon-only buttons for actions) | Copy req_id has `aria-label="Copy request ID"` |
| Reduced motion | Loading spinner respects `prefers-reduced-motion: reduce` → static loader icon | Code: `@media (prefers-reduced-motion)` |
| Dark mode | Auto via `prefers-color-scheme`, user override via options toggle | Token `theme.mode` axis |

---

## 7. Status — Coverage map → code

| Spec section | Code đã ship? | File/line ref |
|---|---|---|
| Popup Empty | ✅ Phase 1 | `apps/extension/entrypoints/popup/App.tsx:46-56` |
| Popup Idle | ✅ Phase 1 | `apps/extension/entrypoints/popup/App.tsx:58-99` (form + button) |
| Popup Loading | ⚠️ Partial — chỉ "Auditing…" text, chưa step list | Phase 4 enhancement |
| Popup Result | ✅ Phase 2-3 | `apps/extension/entrypoints/popup/App.tsx:102-133` (ResultView) |
| Popup Error + countdown | ✅ Phase 3 | `apps/extension/entrypoints/popup/App.tsx:176-232` (ErrorView, RetryCountdown) |
| Options page | ✅ Phase 1 | `apps/extension/entrypoints/options/App.tsx:1-131` |
| Side panel | ❌ Phase 4 pending | New entrypoint `entrypoints/sidepanel/` |
| Issue card variants | ✅ Implicit (4 suggestion types render đúng theo gateway response) | `apps/extension/entrypoints/popup/App.tsx:148-156` |
| Linear-mono palette | ⚠️ Hiện code dùng slate corporate (`#0f172a`, `#64748b`, …) | **Cần refactor** Phase 4 cùng sidepanel |
| Dark mode | ❌ Chưa support | Phase 4 — wire `prefers-color-scheme` listener |
| Severity badge UPPERCASE | ✅ Pattern match | `popup/App.tsx:355` (`textTransform: 'uppercase'`) |
| Copy req_id button | ❌ Chưa có | Phase 3.5 ([02-design.md § 1.3](../../docs/extension/02-design.md)) |
| Env host footer | ❌ Chưa có | Phase 3.5 ([02-design.md § 1.4](../../docs/extension/02-design.md)) |
| Trust card options | ❌ Chưa có (chỉ inline text) | Phase 4 polish |

---

## 8. Hand-off — implementation checklist

### 8.1. Phase 3.5 — UX gap close (theo [02-design.md § 1](../../docs/extension/02-design.md))

- [ ] Auto-reduce payload retry: aggressive scraper mode + background flow
- [ ] Idempotency-Key header
- [ ] Copy req_id icon button trong popup Error + Result footer (design ref: `W6ppF`, `IAszL`)
- [ ] Env host footer ở popup Idle (design ref: `q2TT5u`)

### 8.2. Phase 4 — Side panel + refactor palette

- [ ] Refactor `apps/extension/entrypoints/popup/App.tsx` styles: slate corporate → CSS variables từ tokens.
- [ ] Thêm `lib/tokens.css.ts` + inject vào popup/options/sidepanel main.tsx (set CSSVariables on `:root`).
- [ ] Add `entrypoints/sidepanel/{index.html,main.tsx,App.tsx}` — copy popup state machine, add history + filter section.
- [ ] Add `lib/history.ts` (last 20 audit entries, 5MB quota guard).
- [ ] Wire `chrome.sidePanel.open({ tabId })` từ popup nút "Mở side panel".
- [ ] Update `wxt.config.ts` permissions: thêm `sidePanel`, `side_panel.default_path`.
- [ ] Wire dark mode toggle vào options page Language toggle area (re-purpose hoặc thêm theme toggle).

### 8.3. Phase 5 — Publish prep

- [ ] Export 16/48/128 PNG từ icon node (Pencil node TBD — design icon trong Pencil sau)
- [ ] Screenshot 5 cảnh prod build: Popup Empty → Idle → Loading → Result → Error (1280×800 mỗi cảnh)
- [ ] Promo tile 440×280 từ hero design

---

## 9. Open questions

1. **Loading step progression cần background event?** Spec § 5.5 đề xuất 3 step. Hiện code chỉ binary "running/idle". Implement step requires runtime message từ background mỗi stage — worth 30-40 LOC?
   → **Đề xuất:** Defer, hiện 1-2s tổng nên 1-step "Auditing…" đủ.

2. **History click → re-render result vs re-fetch?** Spec § 3.3 section 4 default: click history entry → load cached `PublicCheckResponse` (no network). Có nên hiện thêm "Re-audit" button trong mỗi history row?
   → **Đề xuất:** Có (small icon button bên phải score). Phase 4 implement.

3. **Side panel filter — client-side hay server-side?** Spec đề xuất client (§ [02-design.md § 2.5](../../docs/extension/02-design.md)). Pencil chỉ thể hiện UI, code chọn behavior.
   → **Confirmed:** client-side cho UX responsive.

4. **Dark mode trigger** — auto only (prefers-color-scheme) vs user override toggle?
   → **Đề xuất:** Both. Auto default, override trong options.

5. **Pencil .pen có cần backup git khi modify?** File 51KB, modify thường, encrypted (cannot diff).
   → **Đề xuất:** Commit cùng PR khi design thay đổi structural; skip cho cosmetic tweak.

---

## 10. Files

- Pencil source: [`apps/extension/ext.pen`](../../apps/extension/ext.pen) (51KB encrypted)
- Backup v1 (pre-redesign): `apps/extension/ext-v1.pen.bak`
- Spec doc (this file): `design/.planning/EXT-DESIGN-SPEC.md`
- Current state doc: [`docs/extension/01-current-state.md`](../../docs/extension/01-current-state.md)
- Next phases design: [`docs/extension/02-design.md`](../../docs/extension/02-design.md)

---

## 11. Changelog

- **2026-05-14** (this version): Initial Linear-mono redesign. 5 popup states, options, sidepanel, 6 issue variants, 18 reusable components, dual-theme variables.
