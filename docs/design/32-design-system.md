# 32 — Design System

> **Scope:** Design tokens (color, typography, spacing, shadow, border radius), component library customization, brand identity.
>
> **Source of truth:** File này + [apps/web/src/styles/tokens.css](../../apps/web/src/styles/tokens.css) (chưa tạo).

---

## 1. Brand identity

**Tên:** SEO Analyst (tiếng Anh) / **Phân tích SEO** (tiếng Việt).

**Tagline:**
- EN: `SEO Intelligence for Vietnamese Web`
- VI: `Phân tích SEO toàn diện cho website Việt — miễn phí`

**Logo:** (cần design, tạm thời dùng wordmark)
- Wordmark: `SEO Analyst` với chữ "SEO" accent màu primary.
- Icon: chữ "S" với đường hiển thị wave (analytics).

**Voice:**
- Tiếng Việt: tự nhiên, không quá trang trọng, không slang.
- Tránh jargon khi có thể (dùng `mật độ từ khoá` thay `keyword density`).

---

## 2. Color palette

Trích từ mockup (Material Design 3 tokens). Tailwind custom:

### 2.1 Primary (màu thương hiệu)

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#003ec7` | Primary text trên bg nhạt, link |
| `primary-container` | `#0052ff` | Primary button bg, active sidebar item |
| `on-primary` | `#ffffff` | Text trên primary bg |
| `primary-fixed` | `#dde1ff` | Primary tint nhẹ (bg card accent) |
| `primary-fixed-dim` | `#b7c4ff` | Primary tint deeper |

**Dùng ở:**
- Button primary: bg `primary-container`, hover darken 10%.
- Badge "completed": text `primary`, bg `primary-fixed`.
- Link: text `primary`, underline on hover.

### 2.2 Surface (nền + card)

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#f8f9ff` | App background |
| `surface-container-lowest` | `#ffffff` | Card bg |
| `surface-container-low` | `#eff4ff` | Subtle card bg |
| `surface-container` | `#e6eeff` | Hover state |
| `surface-container-high` | `#dce9ff` | Emphasis |
| `surface-container-highest` | `#d6e3fb` | Strong emphasis |
| `surface-variant` | `#d6e3fb` | Input bg |
| `surface-bright` | `#f8f9ff` | Bright surface (card) |
| `surface-dim` | `#cddbf2` | Dim surface |

### 2.3 Text

| Token | Hex | Usage |
|---|---|---|
| `on-surface` | `#0f1c2d` | Primary text |
| `on-surface-variant` | `#434656` | Secondary / muted text |
| `on-background` | `#0f1c2d` | Text trên body |

### 2.4 Status colors

| Token | Hex | Usage |
|---|---|---|
| `error` | `#ba1a1a` | Error text, destructive button |
| `error-container` | `#ffdad6` | Error bg nhạt |
| `on-error` | `#ffffff` | Text trên error bg |
| `tertiary` | `#005a3c` | Success text (dark green) |
| `tertiary-fixed` | `#6ffbbe` | Success bg nhạt |
| `on-tertiary` | `#ffffff` | Text trên success solid |

### 2.5 Warning (không có trong MD3 mockup — bổ sung)

| Token | Hex | Usage |
|---|---|---|
| `warning` | `#f59e0b` | Warning text |
| `warning-container` | `#fef3c7` | Warning bg |
| `on-warning` | `#78350f` | Text trên warning bg |

### 2.6 Outline / border

| Token | Hex | Usage |
|---|---|---|
| `outline` | `#737688` | Border default |
| `outline-variant` | `#c3c5d9` | Border subtle (divider) |

### 2.7 Sidebar (dark)

Sidebar dùng màu khác hoàn toàn với main content:

| Token | Hex | Usage |
|---|---|---|
| `sidebar-bg` | `slate-900` `#0f172a` | Sidebar background |
| `sidebar-bg-active` | `primary-container` `#0052ff` | Nav item active |
| `sidebar-text` | `slate-400` `#94a3b8` | Nav item default |
| `sidebar-text-hover` | `#ffffff` | Nav item hover |
| `sidebar-text-active` | `#ffffff` | Nav item active |

### 2.8 Score classification colors

Dùng cho `ScoreBadge`, `ScoreGauge`, stat cards:

| Classification | Score | Color | Hex |
|---|---|---|---|
| Excellent | ≥ 80 | Green | `#10b981` (emerald-500) |
| Good | 60-79 | Blue | `#3b82f6` (blue-500) |
| Fair | 40-59 | Yellow | `#f59e0b` (amber-500) |
| Poor | < 40 | Red | `#ef4444` (red-500) |

### 2.9 Dark mode (future)

Chưa implement nhưng tokens đã chuẩn bị qua CSS variables:

```css
:root {
  --color-surface: #f8f9ff;
  --color-on-surface: #0f1c2d;
}

[data-theme="dark"] {
  --color-surface: #0f172a;
  --color-on-surface: #f1f5f9;
}
```

---

## 3. Typography

### 3.1 Font family

| Role | Font | Weights dùng |
|---|---|---|
| Headline (h1-h3, landing hero) | `Manrope` | 600, 700, 800 |
| Body (paragraph, UI) | `Inter` | 400, 500, 600 |
| Label (button, badge, tag) | `Inter` | 500, 600 |
| Code / mono (metadata JSON) | `JetBrains Mono` | 400 |

**Load:**

```tsx
// app/layout.tsx
import { Manrope, Inter } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-manrope',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

<html className={`${manrope.variable} ${inter.variable}`}>
```

```css
/* globals.css */
body {
  font-family: var(--font-inter), -apple-system, sans-serif;
}

h1, h2, h3, .font-headline {
  font-family: var(--font-manrope), var(--font-inter), sans-serif;
}
```

### 3.2 Scale

| Token | Size | Line height | Usage |
|---|---|---|---|
| `display-xl` | 60px | 1.1 | Landing hero |
| `display-lg` | 48px | 1.1 | Page title |
| `display-md` | 36px | 1.2 | Section title |
| `h1` | 30px | 1.25 | Page h1 |
| `h2` | 24px | 1.3 | Section h2 |
| `h3` | 20px | 1.4 | Card title |
| `h4` | 18px | 1.4 | Subsection |
| `body-lg` | 18px | 1.6 | Lead paragraph |
| `body` | 16px | 1.6 | Paragraph (default) |
| `body-sm` | 14px | 1.5 | Secondary text |
| `caption` | 12px | 1.4 | Metadata, timestamp |
| `micro` | 10px | 1.3 | Tag, badge |

**Tailwind:**
```js
// tailwind.config.ts
fontSize: {
  'display-xl': ['60px', { lineHeight: '1.1', fontWeight: '800' }],
  'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
  // ...
}
```

---

## 4. Spacing

Thang dựa trên 4px base unit.

| Token | Value | Usage |
|---|---|---|
| `space-0` | 0 | — |
| `space-1` | 4px | Icon padding |
| `space-2` | 8px | Gap nhỏ |
| `space-3` | 12px | Button padding Y |
| `space-4` | 16px | Card padding default |
| `space-6` | 24px | Section gap |
| `space-8` | 32px | Card padding lớn |
| `space-12` | 48px | Page gap |
| `space-16` | 64px | Hero padding |
| `space-24` | 96px | Landing section gap |

Dùng Tailwind arbitrary: `p-4`, `gap-6`, `space-y-8`.

---

## 5. Border radius

| Token | Value | Usage |
|---|---|---|
| `rounded-none` | 0 | — |
| `rounded-sm` | 2px | Default (theo mockup) |
| `rounded` | 4px | Badge |
| `rounded-lg` | 8px | Button, input |
| `rounded-xl` | 12px | Card default |
| `rounded-2xl` | 16px | Large card, sidebar |
| `rounded-full` | 9999px | Pill, avatar, chip |

Mockup webaudit dùng `rounded-2xl` cho sidebar (`rounded-r-2xl`) — giữ nguyên pattern.

---

## 6. Shadow

| Token | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Input focus |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` | Card subtle |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Card hover |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Elevated card |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Modal, sidebar |
| `shadow-primary` | `0 10px 15px rgba(0,82,255,0.2)` | Primary button (theo mockup) |

---

## 7. Component library

Sử dụng **shadcn/ui** (copy vào `apps/web/src/components/ui/`). Sau đây là customization map.

### 7.1 Button

Variants:
- `primary` — bg `primary-container`, text white, shadow-primary.
- `secondary` — bg `secondary-container`, text `on-secondary-container`.
- `ghost` — transparent, text `on-surface-variant`.
- `destructive` — bg `error`, text `on-error`.
- `outline` — border `outline`, text `on-surface`.

Sizes:
- `sm` (32px height)
- `md` (40px height — default)
- `lg` (48px height)
- `icon` (40x40 square)

States:
- default, hover (darken 10%), active (scale 95%), focus (ring primary-fixed), disabled (opacity 50%).

### 7.2 Input

- Default: bg `surface-container-lowest`, border `outline-variant`, radius `rounded-lg`.
- Focus: border `primary`, ring 2px `primary-fixed`.
- Error: border `error`, error text bên dưới.
- Height 40px.
- Left icon slot + right icon slot.

### 7.3 Card

- Bg `surface-container-lowest`.
- Border `outline-variant` hoặc shadow-sm.
- Radius `rounded-xl`.
- Padding default `p-6` (24px).
- Variants:
  - `default` — như trên.
  - `elevated` — shadow-md, no border.
  - `outline` — chỉ border, không shadow.
  - `dark` — bg `inverse-surface` (`#243143`), text white. Dùng cho hero section trong audit detail.
  - `hero` — bg gradient navy với decorative pattern.

### 7.4 Badge

Shapes: `rounded-full` (pill) hoặc `rounded` (square).

Color variants:
- `primary` — bg `primary-fixed`, text `primary`.
- `success` — bg `tertiary-fixed`, text `tertiary`.
- `warning` — bg `warning-container`, text `on-warning`.
- `error` — bg `error-container`, text `error`.
- `neutral` — bg `surface-container`, text `on-surface-variant`.

Sizes: `sm` (20px height) | `md` (24px) | `lg` (28px).

### 7.5 Table

- Header: bg `surface-container-low`, text `on-surface-variant`, semibold, uppercase micro.
- Row: bg `surface-container-lowest`, hover bg `surface-container-low`.
- Border row: `outline-variant` 1px.
- Padding cell: `px-4 py-3`.
- Sortable header: icon caret + underline dashed.

### 7.6 Dialog / Modal

- Overlay: bg `rgba(0,0,0,0.5)` + backdrop-blur.
- Panel: bg `surface-container-lowest`, max-width 500px (sm) / 700px (md) / 900px (lg), radius `rounded-xl`.
- Header: title `h3`, close `X` icon top-right.
- Footer: actions right-aligned.

### 7.7 Toast

Library: `sonner` hoặc `react-hot-toast`.

Variants:
- `success` — icon check, bg `tertiary-fixed`.
- `error` — icon X, bg `error-container`.
- `info` — icon info, bg `primary-fixed`.
- `warning` — icon warning, bg `warning-container`.

Position: top-right (desktop), top-center (mobile).
Duration: 4s default, 0 (manual close) cho error.

### 7.8 Sidebar (custom)

```tsx
<aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 rounded-r-2xl shadow-xl z-50 flex flex-col py-6">
  <div className="px-6 mb-8">
    <h1 className="text-xl font-bold text-white tracking-tight">SEO Analyst</h1>
    <p className="text-xs text-slate-400">Phân tích SEO Việt</p>
  </div>

  <nav className="flex-1 flex flex-col">
    <SidebarLink href="/dashboard" icon="dashboard">Dashboard</SidebarLink>
    <SidebarLink href="/audits" icon="security" active>Audit</SidebarLink>
    ...
  </nav>

  <div className="px-4 mt-auto">
    <UserMenuCard />
  </div>
</aside>
```

`<SidebarLink>`:
- Default: text slate-400, hover text white + bg slate-800.
- Active: bg `primary-container`, text white, `shadow-primary`, `active:scale-95` feedback.

### 7.9 ProgressBar

- Linear: height 8px, bg `surface-container-high`, fill `primary-container` rounded-full, animate stripes khi in-progress.
- Steps variant: horizontal dots connected by line; current step filled primary, done steps green, pending muted.

### 7.10 ScoreGauge (circular)

Sử dụng SVG:

```tsx
<svg viewBox="0 0 120 120" width={size}>
  <circle cx="60" cy="60" r="52" stroke={bgColor} strokeWidth="10" fill="none" />
  <circle
    cx="60" cy="60" r="52"
    stroke={classifiedColor(score)}
    strokeWidth="10"
    fill="none"
    strokeDasharray={`${(score/100) * 326.72} 326.72`}
    strokeLinecap="round"
    transform="rotate(-90 60 60)"
  />
  <text x="60" y="70" textAnchor="middle" className="text-3xl font-bold">
    {score}
  </text>
</svg>
```

---

## 8. Icons

**Family:** [Material Symbols Outlined](https://fonts.google.com/icons).

**Usage:** web font → không bundle SVG riêng.

```tsx
<span className="material-symbols-outlined">dashboard</span>
```

**Common icons (map keyword → semantics):**

| Icon | Keyword | Dùng ở |
|---|---|---|
| `dashboard` | dashboard | Sidebar Dashboard |
| `security` | audit | Sidebar Audit |
| `person` | profile | Settings Profile |
| `shield` | security | Settings Security |
| `admin_panel_settings` | admin | Admin area |
| `trending_up` | score trend up | Dashboard stats |
| `bolt` | performance | Core Web Vitals |
| `link` | link | External link icon |
| `download` | export | PDF export button |
| `share` | share | Share button |
| `delete` | delete | Delete action |
| `check_circle` | pass | Rule PASS |
| `warning` | warn | Rule WARN |
| `error` | fail | Rule FAIL |
| `notifications` | notification | Header |
| `settings` | settings | Header/footer |

---

## 9. Motion

**Duration:**
- Micro: 100ms (button press, icon rotation)
- Short: 200ms (hover state, toggle)
- Medium: 300ms (modal open, page transition)
- Long: 500ms (stat number count-up)

**Easing:**
- Default: `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)
- Entrance: `cubic-bezier(0.0, 0.0, 0.2, 1)` (decelerate)
- Exit: `cubic-bezier(0.4, 0.0, 1, 1)` (accelerate)

**Hover scale (mockup pattern):**
```css
.clickable {
  transition: transform 200ms;
}
.clickable:active {
  transform: scale(0.95);
}
```

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

---

## 10. Responsive breakpoints

Tailwind default:

| Breakpoint | Width | Target |
|---|---|---|
| `sm` | 640px | Large phone |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small laptop |
| `xl` | 1280px | Laptop |
| `2xl` | 1536px | Large monitor |

**Mobile strategy:**
- Sidebar hidden → hamburger top-left → slide-over drawer.
- Stat cards stack (1 col on sm, 2 on md, 4 on lg).
- Audit detail tabs scroll horizontally trên mobile.
- Table → Card list on mobile (hide cols thứ cấp).

---

## 11. Accessibility

- **WCAG 2.1 AA** target.
- Contrast ratio tối thiểu 4.5:1 cho body text (color pair của surface + on-surface đã đạt).
- Focus visible: `focus:ring-2 focus:ring-primary focus:ring-offset-2` mặc định qua Tailwind.
- ARIA labels cho icon-only buttons.
- Keyboard navigation: Tab, Shift+Tab, Enter, Escape (dialog close).
- Screen reader: semantic HTML (`<nav>`, `<main>`, `<article>`), `aria-live` cho progress updates.
- Form errors: `aria-describedby` liên kết input với error message.

---

## 12. Design tokens file

File dự kiến: `apps/web/src/styles/tokens.css`

```css
:root {
  /* Colors - Primary */
  --color-primary: 0 62 199;            /* #003ec7 as RGB triplet for alpha */
  --color-primary-container: 0 82 255;
  --color-on-primary: 255 255 255;

  /* Colors - Surface */
  --color-surface: 248 249 255;
  --color-surface-container-lowest: 255 255 255;
  --color-surface-container: 230 238 255;

  /* Colors - Text */
  --color-on-surface: 15 28 45;
  --color-on-surface-variant: 67 70 86;

  /* Status */
  --color-error: 186 26 26;
  --color-warning: 245 158 11;
  --color-success: 0 90 60;

  /* Radius */
  --radius-sm: 2px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadow */
  --shadow-primary: 0 10px 15px rgba(0, 82, 255, 0.2);
}
```

Tailwind config reference:
```ts
colors: {
  primary: 'rgb(var(--color-primary) / <alpha-value>)',
  'primary-container': 'rgb(var(--color-primary-container) / <alpha-value>)',
  // ...
}
```

---

## 13. Đi tiếp

- Áp dụng tokens vào real components → [31-page-specs.md](31-page-specs.md)
- Realtime UX patterns → [33-realtime-ux.md](33-realtime-ux.md)
- Đối chiếu mockup → spec → [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md)
