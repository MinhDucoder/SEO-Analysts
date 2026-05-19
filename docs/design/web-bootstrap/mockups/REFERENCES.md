---
type: mockups-reference
feature_slug: web-bootstrap
date: 2026-04-18
---

# Web Bootstrap — Visual References

`web-bootstrap` is an **infrastructure slug** with no end-user feature UI beyond a
placeholder landing page. Its visual scope is limited to:

1. **Design token preview** — verify font + color + spacing render correctly.
2. **Primitive smoke** — verify shadcn `<Button>`, `<Card>`, `<Badge>`, `<Input>` render.
3. **Layout wrapper** — verify `<html lang="vi">`, fonts loaded, providers wrapped.

Since there is no per-feature mockup, this folder catalogs **upstream design
references** that drive the token + primitive setup. Subsequent slugs (dashboard,
audits, admin) will introduce their own mockups under their own slug folders.

## 1. Design language references

These root-level mockups establish the project's visual vocabulary. The
`web-bootstrap` slug must produce tokens + primitives that can faithfully render
each one downstream.

| File | Role | Used by future slug |
|---|---|---|
| [../../webaudit.html](../../webaudit.html) + [../../webaudit.png](../../webaudit.png) | Primary mockup — sidebar, hero card, score gauge, issues table | slug 5 audits-detail |
| [../../aigenerate.html](../../aigenerate.html) + [../../aigenerate.png](../../aigenerate.png) | 3-column inspector layout inspiration | slug 5 audits-detail right rail |
| [../../learning.html](../../learning.html) + [../../learning.png](../../learning.png) | Hero card + course grid pattern (used as landing inspiration) | slug 9 public-pages |

## 2. Stitch sub-page references

Each subfolder under [../../stitch_d_n_m_i/](../../stitch_d_n_m_i/) contains
`code.html` + `screen.png` for a sub-page. Mapping per [34-ui-mockup-mapping.md](../../34-ui-mockup-mapping.md):

| Folder | Used by future slug |
|---|---|
| `dashboard/` | slug 3 dashboard-shell |
| `website_audit_light/` | slug 5 audits-detail (light theme variant) |
| `on_page_seo_detail/` | slug 5 audits-detail (tab "21 Rule") |
| `performance_detail/` | slug 5 audits-detail (tab "CWV") |
| `technical_seo_detail/` | slug 5 audits-detail (tab "21 Rule" technical filter) |
| `seo_academy*`, `seo_article*`, `keyword_research`, `backlink_checker`, `rank_tracker` | OUT OF SCOPE per [34 §5](../../34-ui-mockup-mapping.md) |
| `analytica_pro/` | DESIGN.md only — defunct branding |

These are NOT consumed by `web-bootstrap` directly but inform the token defaults
extracted from [32-design-system.md](../../32-design-system.md).

## 3. Token preview

`web-bootstrap` ships a placeholder landing at `/` rendering:

- Manrope wordmark "SEO Analyst" — verifies headline font load.
- Inter body subtitle "Phân tích SEO Việt — đang xây dựng" — verifies body font.
- One `<Button variant="primary">` placeholder — verifies primary color + shadow tokens.

This is sufficient visual surface for `/design-review` (Phase 5 gate 7) to verify
token wiring without requiring a dedicated mockup PNG.

## 4. Out-of-scope mockups for this slug

Anything from [31-page-specs.md](../../31-page-specs.md) — those belong to their
respective feature slug folders (auth-flow, dashboard-shell, audits-list-create,
audits-detail-realtime, audits-compare, admin-panel, settings-pages, public-pages).
