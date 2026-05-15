# Chrome Extension UI Redesign — Design

> **Ngày:** 2026-05-15
> **Branch baseline:** `feat/chrome-ext-v2` (Phase 3 done — cache + URL→HTML fallback)
> **Quan hệ:** Bổ sung cho `docs/superpowers/specs/2026-04-29-chrome-ext-design.md` (v2). Spec này KHÔNG thay v2 — chỉ định nghĩa **medium-scope visual redesign** cho 2 surface (popup + options) sau khi Phase 3 ship.
> **Tier:** MEDIUM (1 service, ≤ 7 file thay đổi, 1-2 ngày code, không proto-breaking, không Prisma)

---

## 0. TL;DR

Extension hiện tại chạy đúng nhưng **UI inline-styled, rời design system**, và có **bug button "Set up API key" không click được** (service worker sleep → message lost). Spec này:

1. Tích hợp `design/system-tokens.pen` (Pencil) → CSS tokens → tách 5 mini component (Button, Input, Badge, ScoreRing, IssueCard)
2. Áp dụng **Score hero ring (donut 96px)** làm focal point cho result section (option B trong brainstorm)
3. **Match web app palette** (neutral mono, Linear-like — option A) để consistency brand
4. Fix 3 bug đã định danh (1 critical + 2 polish)
5. Tạo 2 Pencil mockup `.pen` covering 4 state mỗi surface

**KHÔNG nằm trong scope**: Phase 4 features (side panel, i18n, history, audience filter), multi-provider LLM, dark-mode UI toggle (dark theme đi qua `prefers-color-scheme` tự động).

---

## 1. Quyết định từ brainstorming

| Câu hỏi | Lựa chọn |
|---|---|
| Mức độ redesign | **Medium** — tokens + components + bug fix, không touch Phase 4 |
| Visual direction | **A. Match web app** — neutral mono palette từ `system-tokens.pen` |
| Layout result section | **B. Score hero ring** — donut 96px, score là focal point |
| Pencil artifacts | **Popup + Options × 4 states** mỗi cái = 8 frames |
| Pencil workflow | Extend pattern hiện tại: `design/page/extension-{popup,options}.pen` |
| AI suggestion treatment | **Banner response-level** khi `meta.suggestionSource: 'llm' \| 'mixed'`, không per-issue tone |
| LLM provider | **Anthropic only** (current). OpenAI/Gemini support → backlog Phase 4+ |

---

## 2. Mục tiêu

1. **Design tokens** thay inline styles — popup + options match visual language của `apps/web`
2. **Score hero ring** trong result state — focal point, dùng `--color-class-{excellent,good,fair,poor}` từ tokens
3. **Mini component library** trong `apps/extension/components/` — Button, Input, Badge, ScoreRing, IssueCard
4. **Fix 3 bugs**:
   - **Critical**: `Set up API key` button không click được vì SW inactive
   - **Polish**: `API_KEY_SAVED` message có thể fail silent
   - **Polish**: Boot flash "Loading…" → skeleton
5. **2 Pencil mockup** committed làm visual reference + future regression check
6. **Backward compat tuyệt đối**: 74 existing unit tests phải pass, API contract không đổi

### 2.1 Non-goals

- Side panel, i18n vi/en, history, audience filter (Phase 4)
- Animation, micro-interactions polish (chỉ dùng transition `transform 0.15s ease`)
- Multi-provider LLM (Anthropic-only, OpenAI/Gemini → backlog Phase 4+)
- Dark-mode toggle UI (auto qua `prefers-color-scheme`)
- Logo/icon redesign (giữ icon mặc định WXT, Phase 5 publish prep mới làm)
- ⚠️ KHÔNG thay đổi API contract `PublicCheckResponse` (per-issue `source` không thêm — out of scope)

---

## 3. Architecture

```
apps/extension/
├── lib/
│   ├── theme/                    [NEW — 3 files]
│   │   ├── tokens.css            ← copy từ apps/web/src/styles/tokens.css (origin/main)
│   │   ├── tokens.ts             ← TypeScript const re-export (cho SVG/inline cases)
│   │   └── classify.ts           ← score: number → 'excellent' | 'good' | 'fair' | 'poor'
│   ├── api-base.ts               (unchanged)
│   ├── api-types.ts              (unchanged)
│   ├── cache.ts                  (unchanged)
│   ├── client.ts                 (unchanged)
│   ├── errors.ts                 (unchanged)
│   ├── scraper.ts                (unchanged)
│   ├── storage.ts                (unchanged)
│   └── types.ts                  (unchanged)
│
├── components/                   [NEW — 5 files + 1 index]
│   ├── index.ts                  ← re-export tất cả
│   ├── Button.tsx                ← primary | secondary | ghost; sm | md; loading state
│   ├── Input.tsx                 ← label + input + optional error
│   ├── Badge.tsx                 ← env | cached | severity tone
│   ├── ScoreRing.tsx             ← SVG donut, size lg (96px) | sm (42px)
│   └── IssueCard.tsx             ← severity border + title + desc + suggestion box + docRef
│
├── entrypoints/
│   ├── popup/
│   │   ├── App.tsx               ← REWRITE — dùng components, score hero, AI banner
│   │   ├── index.html            ← link tokens.css
│   │   └── main.tsx              (unchanged)
│   ├── options/
│   │   ├── App.tsx               ← REWRITE — dùng components
│   │   ├── index.html            ← link tokens.css
│   │   └── main.tsx              (unchanged)
│   ├── background.ts             ← KEEP audit logic. Remove OPEN_OPTIONS handler (popup gọi trực tiếp).
│   └── content.ts                (unchanged)
│
├── test/
│   ├── (5 existing files unchanged)
│   └── components/                [NEW — 3 files]
│       ├── ScoreRing.spec.ts     ← classify map, SVG arc math, size variants
│       ├── Button.spec.ts        ← variants, disabled, loading
│       └── Badge.spec.ts         ← env tone test/live, severity tone
│
└── (manifest, wxt.config, vitest.config — unchanged)

design/page/                       [NEW — 2 .pen files]
├── extension-popup.pen            ← 4 frames: Empty | Idle | Loading | Result
└── extension-options.pen          ← 4 frames: Empty | Typing | Saved | Error
```

### 3.1 Tokens flow

```
design/system-tokens.pen (source of truth, on main)
        ↓ (export-tokens.py)
apps/web/src/styles/tokens.css (on main)
        ↓ (manual copy — same file content)
apps/extension/lib/theme/tokens.css
        ↓ (import in popup/options index.html)
extension UI uses var(--color-fg), var(--space-3), etc.
```

**Sync policy**: Khi `apps/web/src/styles/tokens.css` đổi (do `system-tokens.pen` đổi), extension cần re-copy file. Sẽ document trong `apps/extension/CLAUDE.md` + có thể thêm script `scripts/sync-extension-tokens.sh` (P2).

---

## 4. Components — API specs

### 4.1 `<Button>`

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost';  // default 'primary'
  size?: 'sm' | 'md';                            // default 'md'
  loading?: boolean;                             // shows spinner, disables click
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};
```

**Token mapping**:
- `primary`: `bg-color-primary` + `color-color-primary-fg`
- `secondary`: `bg-color-bg-overlay` + `color-color-fg` + `border-color-border`
- `ghost`: `color-color-fg-muted` + transparent bg (hover: `bg-color-bg-overlay`)
- All: `radius-md`, `text-sm`, `weight-medium`, `padding 6px 12px` (md) / `4px 10px` (sm)

### 4.2 `<Input>`

```tsx
type InputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  type?: 'text' | 'password';
};
```

Wrap `<label>` (text `--text-xs` uppercase `--color-fg-subtle`) + `<input>` (`--radius-md`, `--color-border` → `--color-border-strong` on focus) + error span (`--color-error`).

### 4.3 `<Badge>`

```tsx
type BadgeProps = {
  variant: 'env' | 'cached' | 'severity' | 'meta';
  tone?: 'live' | 'test' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
};
```

- `radius-pill`, `text-xs`, `weight-semibold`, padding `2px 8px`
- `env` + `test` → `--color-info` bg + fg
- `env` + `live` → `--color-success` bg + fg
- `cached` → `--color-warning` muted (yellow tint)
- `severity` + `error|warning|info` → matching tokens

### 4.4 `<ScoreRing>`

```tsx
type ScoreRingProps = {
  score: number;             // 0-100
  size?: 'lg' | 'sm';        // 'lg' = 96px (popup), 'sm' = 42px (Phase 4 sticky)
  label?: string;            // shown below score in 'lg', hidden in 'sm'
};
```

**Implementation**: pure SVG circle với `stroke-dasharray` math.

```
circumference = 2 * PI * r          (r = 40 for lg, 18 for sm)
strokeDashoffset = circumference * (1 - score/100)
strokeColor = classify(score) → var(--color-class-{excellent|good|fair|poor})
```

`classify(score)`:
- `>= 80` → excellent (green)
- `>= 60` → good (blue)
- `>= 40` → fair (amber)
- else → poor (red)

Trung tâm hiển thị score (text 24px lg, 13px sm), bên dưới label nếu `lg`.

### 4.5 `<IssueCard>`

```tsx
type IssueCardProps = {
  issue: PublicCheckIssue;   // existing type, no changes
};
```

Structure:
```
┌──────────────────────────────────────┐  ← border-left 3px solid severity color
│ Title                       SEVERITY │  ← title weight-semibold + severity badge top-right
│ Short description text...            │  ← --color-fg-muted, text-sm
│ ┌──────────────────────────────────┐ │
│ │ ✏️ Rewrite                       │ │  ← suggestion box (existing render kept)
│ │ "Use 'SEO Analysis 2026' as ..."│ │
│ │ Rationale: more descriptive, ... │ │
│ └──────────────────────────────────┘ │
│ Learn more →                         │  ← docRef link, --color-info
└──────────────────────────────────────┘
```

Bg `--color-bg-elevated`, border `--color-border`, padding `--space-3`, gap `--space-2`.

---

## 5. Popup states (4 frames trong Pencil + Component render mapping)

### 5.1 Empty (no API key)

```
┌──────────────────────────────┐
│  SEO Analyst                 │  ← header
├──────────────────────────────┤
│                              │
│         🔑                   │  ← icon 32px (--color-fg-muted)
│   Connect your API key       │  ← text-lg weight-semibold
│   to start auditing pages    │  ← text-sm --color-fg-subtle
│                              │
│   ┌──────────────────────┐   │
│   │   Open settings      │   │  ← Button primary, onClick=chrome.runtime.openOptionsPage() ★ BUG FIX
│   └──────────────────────┘   │
└──────────────────────────────┘
```

★ **Bug 1 fix**: button gọi `chrome.runtime.openOptionsPage()` **trực tiếp** (không qua message).

### 5.2 Idle (key saved, chưa audit)

```
┌──────────────────────────────┐
│ SEO Analyst        [TEST]    │  ← env badge
├──────────────────────────────┤
│ Target keyword               │  ← Input label
│ ┌──────────────────────────┐ │
│ │ e.g. seo 2026            │ │  ← Input
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │     Audit page           │ │  ← Button primary, disabled khi empty
│ └──────────────────────────┘ │
│                              │
│            Manage key        │  ← Button ghost, footer right
└──────────────────────────────┘
```

### 5.3 Loading

```
┌──────────────────────────────┐
│ SEO Analyst        [TEST]    │
├──────────────────────────────┤
│ Target keyword               │
│ ┌──────────────────────────┐ │  ← disabled
│ │ seo 2026                 │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ⟳ Auditing…              │ │  ← Button loading
│ └──────────────────────────┘ │
│ ┌────────────────────────┐   │
│ │  ╭──╮                  │   │
│ │  │  │ Skeleton ring    │   │  ← shimmer 96px circle
│ │  ╰──╯                  │   │
│ └────────────────────────┘   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │  ← 2 skeleton issue rows
│ ▓▓▓▓▓▓▓▓▓▓▓▓                 │
└──────────────────────────────┘
```

### 5.4 Result (full state)

```
┌──────────────────────────────┐
│ SEO Analyst        [TEST]    │
├──────────────────────────────┤
│ Target keyword               │
│ ┌──────────────────────────┐ │
│ │ seo 2026                 │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │     Audit page           │ │
│ └──────────────────────────┘ │
│ ─────────────────────────── │
│        ╭───╮                 │
│        │ 68│  SEO Score      │  ← ScoreRing lg (color: fair amber)
│        ╰───╯                 │
│  5 issues · 19 words · cached│  ← stats row
│ ─────────────────────────── │
│ ✨ AI suggestions enabled    │  ← Banner if meta.suggestionSource=='llm'
│                              │       (yellow tint nếu degraded)
│ ┌──────────────────────────┐ │
│ │ ❗ Title tag too short    │ │  ← IssueCard error severity
│ │ Current 12 chars, aim... │ │
│ │ ┌─────────────────────┐  │ │
│ │ │ ✏️ Rewrite          │  │ │
│ │ │ "SEO Trends 2026..."│  │ │
│ │ └─────────────────────┘  │ │
│ │ Learn more →             │ │
│ └──────────────────────────┘ │
│ (more issue cards...)        │
│ ─────────────────────────── │
│ 19 reqs left / min           │  ← usage stats
└──────────────────────────────┘
```

**AI banner logic**:
```ts
if (meta.suggestionSource === 'llm') → "✨ AI suggestions"
if (meta.suggestionSource === 'mixed') → "✨ AI + template suggestions"
if (meta.suggestionSource === 'template' && meta.enrichMode === 'llm') → "⚠️ Template fallback (AI unavailable)"
if (meta.suggestionSource === 'template' && meta.enrichMode === 'template') → no banner
if (meta.suggestionSource === 'none') → no banner
```

---

## 6. Options states (4 frames)

### 6.1 Empty (chưa có key)

```
┌──────────────────────────────────────┐
│ SEO Analyst — Settings               │  ← header
├──────────────────────────────────────┤
│ API key                              │
│ ┌──────────────────────────────────┐ │
│ │ Paste your sk_(live|test)_...    │ │  ← Input
│ └──────────────────────────────────┘ │
│ Get one at seoanalyst.app/settings/  │  ← --color-fg-subtle text
│ api-keys                             │
│ ┌──────────────────────────────────┐ │
│ │    Save                          │ │  ← Button primary disabled (empty)
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 6.2 Typing (valid format)

```
┌──────────────────────────────────────┐
│ API key                              │
│ ┌──────────────────────────────────┐ │  ← Input border --color-success
│ │ sk_test_6oxNiL0fw_...            │ │
│ └──────────────────────────────────┘ │
│ ✓ Valid test environment             │  ← --color-success text
│ ┌──────────────────────────────────┐ │
│ │    Save                          │ │  ← Button primary enabled
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 6.3 Saved

```
┌──────────────────────────────────────┐
│ API key             [TEST]           │  ← Badge tone test
│ ┌──────────────────────────────────┐ │
│ │ sk_test_•••••••6oxN              │ │  ← masked, readonly
│ └──────────────────────────────────┘ │
│ Saved 5 min ago                      │  ← --color-fg-subtle (optional)
│ ┌──────────────────────────────────┐ │
│ │    Remove                        │ │  ← Button secondary, --color-error text
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 6.4 Error (invalid format)

```
┌──────────────────────────────────────┐
│ API key                              │
│ ┌──────────────────────────────────┐ │  ← Input border --color-error
│ │ sk_test_bad                      │ │
│ └──────────────────────────────────┘ │
│ ⚠️ Key must match sk_(live|test)_... │  ← --color-error text
│ followed by 43 chars                 │
│ ┌──────────────────────────────────┐ │
│ │    Save                          │ │  ← disabled
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 7. Bug fixes (detail)

### 7.1 BUG-1: "Set up API key" button không click được (CRITICAL)

**Root cause**: Popup `App.tsx:42` gọi `chrome.runtime.sendMessage({type:'OPEN_OPTIONS'})`. Background handler nhận message → `chrome.runtime.openOptionsPage()`. Nhưng MV3 service worker shut down sau 30s idle → khi user reopen popup sau lâu, click button → message lost.

**Fix** (5 lines change):
```ts
function openOptions() {
  // Gọi trực tiếp — không cần qua service worker.
  // chrome.runtime.openOptionsPage() chỉ available trong extension contexts;
  // popup IS such a context → safe.
  chrome.runtime.openOptionsPage();
}
```

Background `handleMessage` giữ case `OPEN_OPTIONS` làm fallback (cho content script hoặc external nếu cần) — không xoá.

### 7.2 BUG-2: `API_KEY_SAVED` message fail silent (POLISH)

Same root cause. Currently `await chrome.runtime.sendMessage(...)` throws nếu SW không reply trong timeout → unhandled rejection trong React.

**Fix**:
```ts
try {
  await chrome.runtime.sendMessage({ type: 'API_KEY_SAVED', environment: env });
} catch {
  // Best-effort notification. SW may be inactive; storage is already saved
  // so popup will pick up the new key on next open.
}
```

### 7.3 BUG-3: Boot flash "Loading…" (POLISH)

`useEffect(() => loadApiKey())` runs after first paint → 1 frame "Loading…" text.

**Fix**: Replace text with **skeleton** matching Empty state structure (icon placeholder + title placeholder + button placeholder, all `--color-bg-overlay` shimmer). User cảm thấy "đã render" thay vì "đang chờ".

---

## 8. Pencil mockup spec

### 8.1 `design/page/extension-popup.pen`

Canvas 1600x900. 4 frames bố trí 2×2:

| | Left | Right |
|---|---|---|
| **Top** | Frame "Empty" (300x460) | Frame "Idle" (300x460) |
| **Bottom** | Frame "Loading" (300x460) | Frame "Result" (300x720) |

Mỗi frame có title text trên (vd "1. Empty — no API key"). Sử dụng `mcp__pencil__batch_design` 1 call per frame. Variables reference tokens từ `system-tokens.pen` (color, radius, space, text).

### 8.2 `design/page/extension-options.pen`

Canvas 1600x900. 4 frames bố trí 2×2:

| | Left | Right |
|---|---|---|
| **Top** | "Empty" | "Typing (valid)" |
| **Bottom** | "Saved" | "Error" |

Mỗi frame ~400x300 (options page rộng hơn popup khi mở trong tab).

### 8.3 Pencil workflow

1. `mcp__pencil__open_document` để load `design/system-tokens.pen` → biết variables hiện có
2. `mcp__pencil__get_variables` → dump tokens
3. `mcp__pencil__batch_design` lần 1: tạo `extension-popup.pen` + frame Empty
4. `mcp__pencil__batch_design` lần 2-4: 3 frame còn lại của popup
5. Repeat cho `extension-options.pen`
6. `mcp__pencil__export_nodes` → PNG snapshot để review visual (lưu vào `.planning/redesign-screenshots/` tạm thời, không commit)

---

## 9. Testing

### 9.1 Unit (Vitest)

| File | Tests | Coverage |
|---|---|---|
| **existing 5** | 74 tests | giữ pass — không touch cache, client, errors, scraper, storage |
| `components/Button.spec.ts` [NEW] | 4 tests | variants render đúng class, disabled blocks click, loading shows spinner |
| `components/Badge.spec.ts` [NEW] | 3 tests | env tone test/live mapping, severity tone, custom tone |
| `components/ScoreRing.spec.ts` [NEW] | 5 tests | classify(0/40/60/80/100), SVG arc math, size sm/lg, color theming |

Total: 74 + 12 = **86 tests** target.

### 9.2 Type check + Build

- `npm run check-types -w @seo/extension` → 0 errors
- `npx wxt build` → bundle < 250 KB (target từ 218 KB hiện tại + ~30 KB tokens.css)

### 9.3 Manual (Chrome dev mode)

Re-run Phase 3 checklist 5 tests + thêm:

| Test | Pass criteria |
|---|---|
| **Empty state click** | Click "Open settings" button → options page mở (★ bug 1 fix) |
| **Visual match Pencil** | Popup Idle, Result, Empty match mockup (mình screenshot compare) |
| **Score ring color** | Score 47 (poor) → ring đỏ; 68 (good) → xanh; 85 (excellent) → xanh lá |
| **AI banner** | Set `ANTHROPIC_API_KEY` → audit → banner "AI suggestions" hiện. Unset → banner "Template fallback" |
| **Dark mode** | OS dark mode → popup tự switch dark colors (or fail gracefully nếu Chrome không respect) |

### 9.4 Visual regression (optional, P2)

Snapshot Pencil exported PNG vs Chrome popup screenshot — pixel-diff threshold 5%. Nếu drift quá, alert.

---

## 10. Risks + mitigation

| Risk | Mitigation |
|---|---|
| Tokens trên main không có ở branch hiện tại → file path `apps/web/src/styles/tokens.css` không tồn tại trên `feat/chrome-ext-v2` | Copy tokens.css content từ `git show origin/main:apps/web/src/styles/tokens.css` thẳng → paste vào `apps/extension/lib/theme/tokens.css`. Sync policy document hóa cho khi rebase. |
| Chrome popup có thể không respect `color-scheme: light dark` hoàn toàn | Test cả 2 mode. Fallback: chỉ light cho popup (`color-scheme: light only`). Document quirk trong CLAUDE.md. |
| SVG ScoreRing có aliasing edge trên Retina | Set `vector-effect="non-scaling-stroke"`, test 1x + 2x retina, viewBox không scale. |
| Bundle size tăng quá target (250KB) | Tokens.css strip unused tokens (extension chỉ cần ~30% tokens). Components no external deps. |
| Phase 3 cache stale sau redesign code đổi shape | Cache shape unchanged (`{ savedAt, result }`) — chỉ touch render layer. Existing cache entries vẫn deserialize OK. |
| User tạo API key qua web app (chưa có trên branch) → không có UI lấy key | Document trong Empty state: "Get one at seoanalyst.app/settings/api-keys" + alternative: curl 2-step (như đã làm hôm nay). |

---

## 11. Definition of Done

- ✅ 5 components mới (Button, Input, Badge, ScoreRing, IssueCard) + index.ts
- ✅ `lib/theme/{tokens.css,tokens.ts,classify.ts}` created
- ✅ Popup App.tsx rewrite — 4 states render đúng
- ✅ Options App.tsx rewrite — 4 states render đúng
- ✅ 3 bugs fixed (1 critical + 2 polish)
- ✅ 12 new unit tests pass, 74 existing tests still pass
- ✅ `npx wxt build` clean, bundle < 250 KB
- ✅ Manual checklist 5+5 tests PASS — đặc biệt **TEST 1 baseline phải work without re-installing extension** (Phase 3 test bị block hôm nay)
- ✅ `design/page/extension-popup.pen` + `extension-options.pen` committed
- ✅ Spec này + commit log đầy đủ context
- ✅ `apps/extension/CLAUDE.md` updated với tokens sync policy + components dir structure

---

## 12. Rollout

Single commit-series (không feature flag) vì:
- Extension là dev-only artifact (chưa publish web store)
- Không có production users
- Sub 1-2 days delivery — không cần staged rollout

Commit plan:
```
1. chore(ext): import design tokens from apps/web (apps/extension/lib/theme/)
2. feat(ext): mini component library (Button, Input, Badge, ScoreRing, IssueCard)
3. fix(ext): SW-inactive bug — popup calls openOptionsPage() directly
4. feat(ext): popup redesign — 4 states with score hero
5. feat(ext): options redesign — 4 states
6. test(ext): component unit tests (Button, Badge, ScoreRing)
7. design(ext): Pencil mockup popup + options (2 .pen files)
8. docs(ext): update CLAUDE.md — components dir, tokens sync policy
```

Each commit atomically valid (tests pass at every step). Tổng ~8 commits.

---

## 13. Out of scope — backlog cho Phase 4+

- **Multi-provider LLM**: OpenAI + Gemini adapters cho `@repo/seo-ai-core` (T4 factory). Cho phép user dùng key tự có.
- **Side panel UI**: Phase 4 chính — extension chạy persistent ở side panel thay vì popup ephemeral
- **i18n vi/en**: dùng next-intl pattern từ apps/web Phase 5a
- **History**: chrome.storage local list of past audits + filter UI
- **Audience filter**: writer / dev / both — filter issues bằng `issue.audience`
- **Per-issue suggestion source**: cần API contract change (`PublicCheckSuggestion.source: 'llm' | 'template'`) — gateway public-api thay đổi
- **Animation polish**: skeleton shimmer, score ring fill-up animation, issue card slide-in
- **Web store publish**: icons, screenshots, privacy policy, store listing (Phase 5)

---

## 14. References

- Spec gốc extension: `docs/superpowers/specs/2026-04-29-chrome-ext-design.md`
- Design system source: `design/system-tokens.pen` (on `main`)
- Tokens compiled: `apps/web/src/styles/tokens.css` (on `main`)
- Web app shadcn primitives (visual reference): `apps/web/src/components/ui/` (on `main`)
- Extension CLAUDE: `apps/extension/CLAUDE.md`
- Bug 1 reproduction: hôm nay 2026-05-15 — user click "Set up API key" trong popup khi SW marked "Inactive" trong chrome://extensions/details
