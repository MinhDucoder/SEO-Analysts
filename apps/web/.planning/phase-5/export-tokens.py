#!/usr/bin/env python3
"""Export Pencil design tokens → tokens.css + tailwind config snippet.

Reads `design/system-tokens.pen` and emits:
  - `apps/web/.planning/phase-5/tokens.css`         — CSS variables with dark/light theme
  - `apps/web/.planning/phase-5/tailwind.tokens.ts` — Tailwind config snippet (semantic theme keys)

Run from repo root:  python3 apps/web/.planning/phase-5/export-tokens.py
"""
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
PEN_FILE = REPO_ROOT / 'design' / 'system-tokens.pen'
OUT_DIR = Path(__file__).resolve().parent

if not PEN_FILE.exists():
    print(f"FATAL: {PEN_FILE} not found", file=sys.stderr)
    sys.exit(1)


def hex_to_rgb_triplet(hex_str: str) -> str:
    """`#0A0A0B` → `10 10 11` (space-separated for Tailwind alpha)."""
    s = hex_str.lstrip('#')
    if len(s) == 3:
        s = ''.join(c * 2 for c in s)
    r, g, b = int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)
    return f"{r} {g} {b}"


def resolve_alias(value: str, vars_dict: dict, depth=0) -> str:
    """Resolve `$color-foo` chain into concrete hex."""
    if depth > 8:
        raise ValueError(f"Alias depth too deep starting at {value}")
    if not isinstance(value, str) or not value.startswith('$'):
        return value
    ref = value[1:]
    if ref not in vars_dict:
        raise KeyError(f"Unknown var alias: ${ref}")
    spec = vars_dict[ref]
    v = spec.get('value')
    if isinstance(v, str):
        return resolve_alias(v, vars_dict, depth + 1)
    return value  # themed alias — caller handles


with open(PEN_FILE) as f:
    doc = json.load(f)

variables = doc['variables']

# ----- Categorize -----
color_themed = {}      # name -> {'dark': hex, 'light': hex}
color_single = {}      # name -> hex
radius = {}            # name -> int
space = {}             # name -> int
text_size = {}         # name -> int
weight = {}            # name -> str
font = {}              # name -> str

for name, spec in variables.items():
    t = spec.get('type')
    v = spec.get('value')
    if t == 'color':
        if isinstance(v, list):
            themed = {x['theme']['theme']: x['value'] for x in v}
            # Resolve alias inside themed values
            for theme in ('dark', 'light'):
                if themed.get(theme, '').startswith('$'):
                    resolved = resolve_alias(themed[theme], variables)
                    # If still themed alias, look up that var's theme
                    if resolved.startswith('$'):
                        ref_name = resolved[1:]
                        ref_v = variables[ref_name].get('value')
                        if isinstance(ref_v, list):
                            ref_themed = {x['theme']['theme']: x['value'] for x in ref_v}
                            themed[theme] = ref_themed.get(theme, ref_v[0]['value'])
                    else:
                        themed[theme] = resolved
            color_themed[name] = themed
        elif isinstance(v, str):
            resolved = resolve_alias(v, variables)
            color_single[name] = resolved
    elif t == 'number':
        if name.startswith('radius-'):
            radius[name] = v
        elif name.startswith('space-'):
            space[name] = v
        elif name.startswith('text-'):
            text_size[name] = v
    elif t == 'string':
        if name.startswith('weight-'):
            weight[name] = v
        elif name.startswith('font-'):
            font[name] = v


# ===== Build tokens.css =====
def css_var_name(token: str) -> str:
    return f"--{token}"


css_lines = [
    "/* GENERATED — do not edit by hand. Run apps/web/.planning/phase-5/export-tokens.py */",
    "/* Source: design/system-tokens.pen variables ($color-*, $radius-*, $space-*, $text-*) */",
    "",
    ":root {",
    "    color-scheme: light dark;",
    "",
    "    /* === Non-themed semantic colors (RGB triplets) === */",
]
for name in sorted(color_single):
    triplet = hex_to_rgb_triplet(color_single[name])
    css_lines.append(f"    {css_var_name(name)}: {triplet};")

css_lines += [
    "",
    "    /* === Radius (px) === */",
]
for name in sorted(radius):
    val = radius[name]
    unit = "px" if val < 999 else "px"
    css_lines.append(f"    {css_var_name(name)}: {val}{unit};")

css_lines += [
    "",
    "    /* === Spacing (px) === */",
]
for name in sorted(space, key=lambda x: int(x.split('-')[1])):
    css_lines.append(f"    {css_var_name(name)}: {space[name]}px;")

css_lines += [
    "",
    "    /* === Type scale (rem-based, 1rem = 16px) === */",
]
TS_ORDER = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']
for size_key in TS_ORDER:
    name = f"text-{size_key}"
    if name in text_size:
        rem = text_size[name] / 16
        css_lines.append(f"    {css_var_name(name)}: {rem}rem; /* {text_size[name]}px */")

css_lines += [
    "",
    "    /* === Font weight === */",
]
for name in sorted(weight):
    css_lines.append(f"    {css_var_name(name)}: {weight[name]};")

css_lines += [
    "",
    "    /* === Font families === */",
]
for name in sorted(font):
    css_lines.append(f"    {css_var_name(name)}: {font[name]!r};")

# Light theme defaults
css_lines += [
    "",
    "    /* === Themed colors — light is default === */",
]
for name in sorted(color_themed):
    light = color_themed[name].get('light', '#000000')
    triplet = hex_to_rgb_triplet(light)
    css_lines.append(f"    {css_var_name(name)}: {triplet};")

css_lines += [
    "}",
    "",
    ":root[data-theme='dark'] {",
]
for name in sorted(color_themed):
    dark = color_themed[name].get('dark', '#FFFFFF')
    triplet = hex_to_rgb_triplet(dark)
    css_lines.append(f"    {css_var_name(name)}: {triplet};")

css_lines += [
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    "    :root:not([data-theme='light']) {",
]
for name in sorted(color_themed):
    dark = color_themed[name].get('dark', '#FFFFFF')
    triplet = hex_to_rgb_triplet(dark)
    css_lines.append(f"      {css_var_name(name)}: {triplet};")

css_lines += [
    "    }",
    "}",
    "",
]

(OUT_DIR / 'tokens.css').write_text('\n'.join(css_lines), encoding='utf-8')
print(f"[OK] Wrote {OUT_DIR / 'tokens.css'} ({len(css_lines)} lines)")


# ===== Build tailwind.tokens.ts =====
tw_lines = [
    "// GENERATED — do not edit by hand. Run apps/web/.planning/phase-5/export-tokens.py",
    "// Source: design/system-tokens.pen variables.",
    "//",
    "// Import into tailwind.config.ts:",
    "//   import { tokens } from './src/styles/tailwind.tokens';",
    "//   ... theme: { extend: tokens }",
    "",
    "const rgb = (cssVar: string) => `rgb(var(${cssVar}) / <alpha-value>)`;",
    "",
    "export const tokens = {",
]

# Color tree: bg/fg/border/primary/class/cwv/status + warning/error/success/info
COLOR_GROUPS = {
    'bg': ['color-bg', 'color-bg-elevated', 'color-bg-overlay'],
    'fg': ['color-fg', 'color-fg-muted', 'color-fg-subtle', 'color-fg-disabled'],
    'border': ['color-border', 'color-border-strong'],
    'primary': ['color-primary', 'color-primary-fg'],
    'class': ['color-class-excellent', 'color-class-good', 'color-class-fair', 'color-class-poor'],
    'cwv': ['color-cwv-good', 'color-cwv-needs-improvement', 'color-cwv-poor'],
    'status': ['color-status-active', 'color-status-pending', 'color-status-completed', 'color-status-failed'],
    'semantic': ['color-warning', 'color-error', 'color-success', 'color-info'],
}

tw_lines.append("  colors: {")
for group, names in COLOR_GROUPS.items():
    tw_lines.append(f"    {group}: {{")
    for n in names:
        if n not in color_themed and n not in color_single:
            continue
        sub = n.replace(f'color-{group}-', '').replace('color-', '')
        if sub == group:
            sub = 'DEFAULT'
        tw_lines.append(f"      {sub!r}: rgb({css_var_name(n)!r}),")
    tw_lines.append("    },")
tw_lines.append("  },")

# Border radius
tw_lines.append("  borderRadius: {")
for name in sorted(radius):
    key = name.replace('radius-', '')
    tw_lines.append(f"    {key!r}: 'var({css_var_name(name)})',")
tw_lines.append("  },")

# Spacing
tw_lines.append("  spacing: {")
for name in sorted(space, key=lambda x: int(x.split('-')[1])):
    key = name.replace('space-', '')
    tw_lines.append(f"    {key!r}: 'var({css_var_name(name)})',")
tw_lines.append("  },")

# Font size
tw_lines.append("  fontSize: {")
for size_key in TS_ORDER:
    name = f"text-{size_key}"
    if name in text_size:
        tw_lines.append(f"    {size_key!r}: 'var({css_var_name(name)})',")
tw_lines.append("  },")

# Font family
tw_lines.append("  fontFamily: {")
tw_lines.append(f"    ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],")
tw_lines.append(f"    mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],")
tw_lines.append("  },")

# Font weight (string values, not CSS vars to keep Tailwind happy)
tw_lines.append("  fontWeight: {")
for name in sorted(weight):
    key = name.replace('weight-', '')
    tw_lines.append(f"    {key!r}: '{weight[name]}',")
tw_lines.append("  },")

tw_lines += [
    "} as const;",
    "",
]

(OUT_DIR / 'tailwind.tokens.ts').write_text('\n'.join(tw_lines), encoding='utf-8')
print(f"[OK] Wrote {OUT_DIR / 'tailwind.tokens.ts'} ({len(tw_lines)} lines)")


# Summary
print(f"\n=== Token export summary ===")
print(f"  Themed colors:    {len(color_themed)} (dark/light)")
print(f"  Single colors:    {len(color_single)}")
print(f"  Radius tokens:    {len(radius)}")
print(f"  Spacing tokens:   {len(space)}")
print(f"  Text-size tokens: {len(text_size)}")
print(f"  Weight tokens:    {len(weight)}")
print(f"  Font families:    {len(font)}")
total = sum([len(color_themed), len(color_single), len(radius), len(space), len(text_size), len(weight), len(font)])
print(f"  TOTAL:            {total}")
