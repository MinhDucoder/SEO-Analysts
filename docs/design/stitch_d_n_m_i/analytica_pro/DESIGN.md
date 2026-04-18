# Design System Strategy: The Precision Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Curator."** 

In the high-stakes world of SEO, data is often overwhelming. Most tools fail by being "noisy." This system moves away from the "spreadsheet-in-a-browser" aesthetic toward a high-end, editorial experience. We achieve this by breaking the rigid, boxed-in grid typical of SaaS. Instead, we use **intentional asymmetry, overlapping surfaces, and extreme typographic contrast** to guide the eye. This is not just an interface; it is a sophisticated data-narrative engine that feels authoritative, premium, and calm.

---

## 2. Color & Tonal Depth
We do not use lines to separate ideas; we use light and depth.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. A `surface-container-low` (#eff4ff) section sitting on a `surface` (#f8f9ff) background creates a sophisticated transition that feels architectural rather than "coded."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of frosted glass.
- **Base Layer:** `surface` (#f8f9ff) for the main canvas.
- **Content Zones:** `surface-container-lowest` (#ffffff) for primary cards to ensure maximum "pop" and readability.
- **Embedded Tools:** Use `surface-container` (#e6eeff) or `surface-variant` (#d6e3fb) for nested utility areas (like filter bars) to create an inset, tactile feel.

### The "Glass & Gradient" Rule
To elevate the experience, floating elements (modals, dropdowns) must use **Glassmorphism**. Utilize `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur. 
For primary CTAs, do not use flat hex codes. Apply a subtle linear gradient from `primary` (#003ec7) to `primary_container` (#0052ff) at a 135-degree angle. This provides a "soul" and professional polish that flat colors lack.

---

## 3. Typography
The system uses a dual-font strategy to balance editorial authority with data density.

*   **Display & Headlines (Manrope):** We use Manrope for all `display-` and `headline-` tokens. Its geometric yet friendly curves break the "coldness" of SEO data, making the tool feel like a premium consultant.
*   **Body & Labels (Inter):** We use Inter for all `title-`, `body-`, and `label-` tokens. It is chosen for its exceptional legibility in dense data tables and technical SEO audits.

**Hierarchy Strategy:** 
Large `display-lg` (3.5rem) values are used for high-level "Health Scores," creating an immediate focal point. This contrasts sharply with `label-sm` (0.6875rem) used for technical metadata, establishing a clear hierarchy of "The Story" vs. "The Details."

---

## 4. Elevation & Depth
In this system, elevation is a product of light, not lines.

### The Layering Principle
Depth is achieved by "stacking" the surface-container tiers. Place a `surface-container-lowest` card on a `surface-container-low` section. The change in hex value creates a soft, natural lift that mimics fine paper stocks.

### Ambient Shadows
When a "floating" effect is required (e.g., a high-priority SEO alert), use **Ambient Shadows**:
- **Blur:** 24px - 40px
- **Opacity:** 4% - 6%
- **Color:** Use a tinted version of `on-surface` (#0f1c2d) rather than pure black to keep the shadow feeling integrated with the deep navy palette.

### The "Ghost Border" Fallback
If a border is absolutely necessary for accessibility, it must be a **Ghost Border**: Use the `outline-variant` (#c3c5d9) token at **15% opacity**. 100% opaque, high-contrast borders are strictly forbidden.

---

## 5. Components

### Navigation Sidebar
The "Anchor" of the tool. Use `inverse_surface` (#243143) for the background. Active states should not use "boxes," but rather a vertical pill of `surface_tint` (#004ced) at the leading edge and a subtle `on_surface_variant` (#434656) text shift.

### Data Tables & Cards
*   **No Dividers:** Forbid the use of divider lines between rows. Use the Spacing Scale `4` (0.9rem) to create clear vertical air. Alternate row colors using `surface` and `surface_container_low` for readability.
*   **SEO Progress Rings:** Use `tertiary` (#005a3c) for "Good" scores. The track of the ring should be `tertiary_container` at 20% opacity to maintain the "frosted" aesthetic.

### Buttons & Inputs
*   **Primary Button:** Gradient fill (`primary` to `primary_container`) with a `xl` (0.75rem) corner radius. 
*   **Input Fields:** Use `surface_container_low` with no border. On focus, transition to a `Ghost Border` using the `primary` color at 40% opacity.

### Signature SEO Tool Components
*   **Trend Sparklines:** Use a `2px` stroke width. For positive trends, use `tertiary` (#005a3c); for warnings, use `error` (#ba1a1a). Fill the area under the curve with a 5% opacity gradient of the stroke color.
*   **Keyword Difficulty Chips:** Use the `secondary_container` (#dbe2f9) background with `on_secondary_container` (#5c6477) text. Keep corners `full` (9999px) for a modern, pebble-like feel.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use "Breathing Room." When in doubt, increase the spacing to the next tier in the scale (e.g., move from `8` to `10`).
*   **Do** use high-contrast typography sizes to tell a story (e.g., a very large score next to very small, light metadata).
*   **Do** use `tertiary` emerald tones for "Success" states to reinforce the "Trustworthy" vibe.

### Don't
*   **Don't** use 1px black or grey borders. They "trap" the data and make the tool feel like legacy software.
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#0f1c2d) to maintain the deep navy editorial tone.
*   **Don't** crowd the dashboard. If a card has more than 5 data points, break it into nested sub-surfaces using the Tonal Layering principle.