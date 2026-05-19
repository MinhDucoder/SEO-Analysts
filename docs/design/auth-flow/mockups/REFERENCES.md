---
type: mockups-reference
feature_slug: auth-flow
date: 2026-04-18
---

# Auth Flow — Visual References

`auth-flow` doesn't have dedicated mockups in the repo. The sidebar-less
centered-card pattern is universal enough that no additional mockup is needed;
design is derivable from:

1. **Logo wordmark** already shipped in web-bootstrap ([apps/web/public/logo.svg](../../../apps/web/public/logo.svg)).
2. **Design tokens** from [32-design-system.md](../../32-design-system.md) —
   Card variant `outline`, spacing `p-6` / `p-8`, button sizes, Inter body font.
3. **Field + error pattern** from
   [32-design-system.md §7.2](../../32-design-system.md) (Input component) and
   §11 (accessibility).

## Layout spec (centered card, no mockup)

```
┌────────────────────────────────────────────────┐
│  bg-surface                                    │
│                                                │
│            ┌──────────────────────┐            │
│            │  [logo.svg]          │            │
│            │                      │            │
│            │  Title                │            │
│            │  Description         │            │
│            │                      │            │
│            │  <form>              │            │
│            │   Email              │            │
│            │   [_____________]    │            │
│            │   Password           │            │
│            │   [_____________]    │            │
│            │   [  Primary btn  ]  │            │
│            │                      │            │
│            │   — hoặc —           │            │
│            │   [ Google oauth ]   │            │
│            │                      │            │
│            │  footer links        │            │
│            └──────────────────────┘            │
│            max-width: 28rem (max-w-md)         │
│                                                │
└────────────────────────────────────────────────┘
```

- Card: `variant="outline" padding="lg"` from web-bootstrap primitives.
- Max width: ~448px (`max-w-md`).
- Vertical centering: `min-h-screen flex items-center justify-center`.
- All copy: Vietnamese.

## No mockup image needed

Auth forms follow a well-established web pattern; generating a mockup would add
churn without new design signal. Slug 3 (dashboard-shell) introduces the first
real visual surface that warrants a mockup (`stitch_d_n_m_i/dashboard/`).
