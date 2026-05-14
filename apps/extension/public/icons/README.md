# Icons — export from `ext.pen`

> **Source:** `apps/extension/ext.pen` → frame **"Icons (16/48/128)"** (`y1zXT`).
> 3 monochrome icons: magnifier ring + check inside + handle, on a rounded-square accent background. Auto-flips light↔dark with the design system theme.

## Required outputs

Chrome Web Store + Manifest V3 expect these exact filenames in this folder:

```
icon-16.png    16 × 16
icon-48.png    48 × 48
icon-128.png   128 × 128
```

After export, reference them from `wxt.config.ts`:

```ts
manifest: ({ mode }) => ({
  // …
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
})
```

WXT auto-copies anything in `public/` into the build output.

## Export from Pencil (manual, 1 minute)

Pencil's MCP `export_nodes` tool persists PNG/SVG to disk. The 3 node IDs to export:

| Size | Node ID | Output path |
|---|---|---|
| 16  | `sHmVa` | `apps/extension/public/icons/icon-16.png` |
| 48  | `aX8YV` | `apps/extension/public/icons/icon-48.png` |
| 128 | `TVW8S` | `apps/extension/public/icons/icon-128.png` |

In Claude (or any client connected to the Pencil MCP server), run:

```
mcp__pencil__export_nodes({
  filePath: "apps/extension/ext.pen",
  nodes: [
    { id: "sHmVa", path: "apps/extension/public/icons/icon-16.png",  format: "png", scale: 1 },
    { id: "aX8YV", path: "apps/extension/public/icons/icon-48.png",  format: "png", scale: 1 },
    { id: "TVW8S", path: "apps/extension/public/icons/icon-128.png", format: "png", scale: 1 }
  ]
})
```

If `export_nodes` requires a different parameter shape on your Pencil
version, first run `mcp__pencil__get_guidelines({ category: "guide", name: "Code" })`
to see the canonical signature, or use the right-click → Export PNG
menu inside VSCode's Pencil editor.

## Theme-aware variants (optional, V2)

Chrome MV3 supports `theme_icons` so the icon flips with the OS theme.
When we ship that, design a `_light` and `_dark` variant in Pencil
and wire them via:

```ts
manifest: {
  icons: { /* dark, default */ },
  // theme_icons is only honored on macOS + GTK Linux + Win11 by Chrome.
  // See: https://developer.chrome.com/docs/extensions/reference/manifest/icons#theme_icons
}
```

For 0.1.0 we ship one dark-on-light set — readable on the default
Chrome toolbar in both themes.

## Aesthetic spec

- **Background:** `var(--accent-primary)` ≈ `#0A0A0B` (light theme) — solid rounded-square
- **Foreground stroke:** `var(--accent-on-primary)` ≈ `#FAFAFA`
- **Corner radius:** 24 / 9 / 3 (≈ 18.75 % of size)
- **Magnifier ring:** 50 % of icon width, stroke ≈ 7 % of size, hollow circle
- **Checkmark inside ring:** rounded join + cap, occupies ~37 % of icon width
- **Handle:** diagonal line from ring's 4 o'clock outward, stroke ≈ 8.5 % of size

Matches the Linear-mono palette in `design/.planning/EXT-DESIGN-SPEC.md` § 1.1.
