---
type: mockups-reference
feature_slug: dashboard-shell
date: 2026-04-19
---

# Dashboard Shell — Visual References

## Primary mockup

- **`docs/design/stitch_d_n_m_i/dashboard/code.html`** — bento-grid
  dashboard reference; source of:
  - Dark sidebar (`bg-slate-900 w-64 rounded-r-2xl shadow-xl`) với
    wordmark + nav items + user card footer.
  - Sticky top header với title block + search placeholder + notification
    bell + primary CTA.
  - Bento layout `grid-cols-12 gap-6`: hero (col-4) + stats (col-8
    với 2×2 grid) + middle (col-8 chart + col-4 issues) + bottom table.
  - Stat card visual pattern: icon chip + delta badge + label uppercase
    + value 3xl + optional sparkline/progress.
  - SVG score gauge: 192×192, stroke 12, dash length 552.92, classification
    color + center text 6xl.
- **`docs/design/stitch_d_n_m_i/dashboard/screen.png`** — PNG render của
  mockup để có thể reference pixel-perfect khi cần.

## Mapping mockup → slug 3 scope

| Mockup element | Slug 3 decision | Rationale |
|---|---|---|
| Sidebar dark w-64 | ✅ **Adopt** | Exact per [32-design-system.md §7.8](../../32-design-system.md) |
| Sidebar 8+ nav items | ⚠️ **Trim to 5** | Our routes: Dashboard, Audit, So sánh, Quản trị (admin), Cài đặt. Dropped: Keyword/Backlink/Rank/On-page/Competitors/Academy (not in project scope). |
| Wordmark "Analytica Pro" | 🔁 **Rename "SEO Analyst"** | Match web-bootstrap `APP_NAME` |
| Material Symbols icons | 🔁 **Replace with lucide-react** | Already shipped slug 2 |
| Header search input | ⚠️ **Keep as disabled stub** | No search backend yet; visual placeholder only |
| Notification bell | ⚠️ **Keep as disabled stub** | No notification backend; visual placeholder |
| Bento grid-cols-12 | ✅ **Adopt exact** | Responsive breakdown already mapped (lg+ = 12-col, md = 8-col, sm = stacked) |
| Hero Score Gauge (col-4) | ✅ **Adopt** | Major visual anchor |
| 4 Stat Cards (col-8, 2×2) | ✅ **Adopt** layout | Metrics remap: Organic Traffic → Audit tháng này, Keywords Ranked → Điểm SEO TB, Backlinks → Issue quan trọng, DA → PDF đã xuất |
| Sparkline in stat cards | ❌ **Drop** | Not in 31 §8 spec; adds complexity without data source |
| Organic Sessions LineChart | ✅ **Adopt as ScoreTrendChart** | 30d line with same "7D/30D/90D" toggle cluster — BUT slug 3 ships only 30D default (toggle deferred to slug 4 list-filter pattern) |
| Priority Issues (col-4) | ❌ **Defer to slug 5** | Needs ruleFails digest from audit detail; not available on list endpoint |
| Top Keywords Table | ❌ **Out of scope** | Keyword analysis is audit-detail data (slug 5) |
| FAB `+` button | ❌ **Drop** | Header `+ New Audit` button already covers quick-action; FAB redundant |

## Layout spec (abbreviated)

```
Desktop ≥ 1024px:
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar]                                                   │
│   w-64         ┌───────────────────────────────────────┐   │
│   fixed left   │ Header                                │   │
│   slate-900    │ Title · Search · Bell · [+ Audit mới] │   │
│                ├───────────────────────────────────────┤   │
│                │ <main grid grid-cols-12 gap-6>        │   │
│                │ ┌──── hero ─────┬─── stats 2×2 ────┐  │   │
│                │ │ ScoreGauge    │ StatCard × 4    │  │   │
│                │ │  col-span-4   │  col-span-8      │  │   │
│                │ ├───────────────┴─────────────────┤  │   │
│                │ │ ScoreTrendChart   │ RecentAudits│  │   │
│                │ │  col-span-8       │  col-span-4 │  │   │
│                │ └─────────────────────────────────┘  │   │
│                └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Tablet 768-1023:
┌───────────────────────────────┐
│ [Hamburger] Header            │
│ ─────────────────────────────  │
│ ScoreGauge (full)             │
│ StatCard × 4 (2×2 grid)       │
│ ScoreTrendChart (full)        │
│ RecentAuditsCard (full)       │
└───────────────────────────────┘

Mobile < 768:
Sidebar → drawer. Cards stacked single column.
```

## Empty state (no mockup yet)

```
┌───────────────────────────────────────────┐
│                                           │
│         [illustration circle]             │
│                                           │
│         Chưa có audit nào                 │
│                                           │
│    Tạo audit đầu tiên để bắt đầu         │
│    phân tích SEO cho website của bạn.    │
│                                           │
│         [+ Tạo audit đầu tiên]           │
│                                           │
└───────────────────────────────────────────┘
```

- Card full-width (col-span-12), p-16, text-center.
- Illustration: inline SVG, 80×80, circular border với icon `Search` ở
  giữa, outline-variant color.
- Button: primary size-lg, href `/audits/new`.

## Color + typography tokens used

Tất cả từ [32-design-system.md](../../32-design-system.md):

- Sidebar: `bg-slate-900`, `sidebar-bg-active` = primary-container.
- Main bg: `bg-background` (`surface` = `#f8f9ff`).
- Card: `bg-white` (ngoại lệ mockup — thực tế nên dùng
  `surface-container-lowest` = `#ffffff`). Đồng nghĩa.
- Text: `text-on-surface` (headings) + `text-on-surface-variant` (body /
  labels).
- Delta colors: `text-tertiary` (up / green) + `text-error` (down / red)
  + `text-on-surface-variant` (flat).
- Score gauge stroke: classification-colored per `classify()` from
  `@repo/shared`:
  - ≥ 80 → `text-tertiary` (`#10b981` emerald-500 — matches excellent)
  - 60-79 → `text-primary` (`#003ec7` — good)
  - 40-59 → `text-amber-500`
  - < 40 → `text-error`
- Headlines: `font-headline` (Manrope 700/800).
- Body: `font-body` (Inter 400/500/600).

## What we're NOT using from mockup

- Tailwind CDN runtime (mockup prototype-only) — we use compiled Tailwind
  via PostCSS (web-bootstrap setup).
- Material Symbols font — skip per decision log (use lucide-react).
- Hardcoded hex colors in inline styles — all tokens go through Tailwind
  utilities pointing to CSS variables.
- Top Keywords table rows — slug 5 (audit detail) territory.
- FAB button bottom-right — header CTA sufficient.
