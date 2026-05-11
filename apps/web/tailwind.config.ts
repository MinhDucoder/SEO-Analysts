import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tailwind theme is keyed off CSS variables defined in `src/styles/tokens.css`.
 * Source of truth: `design/system-tokens.pen` (58 vars). Regenerate with
 * `python3 apps/web/.planning/phase-5/export-tokens.py` whenever Pencil changes.
 *
 * `rgb(var(--foo) / <alpha-value>)` lets Tailwind compose alpha utilities
 * (e.g. `bg-bg/80`) from raw RGB triplets.
 */

const rgbVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "./tests/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        // shadcn-compat aliases (map back to Pencil tokens via globals.css)
        background: rgbVar("--background"),
        foreground: rgbVar("--foreground"),
        card: {
          DEFAULT: rgbVar("--card"),
          foreground: rgbVar("--card-foreground"),
        },
        popover: {
          DEFAULT: rgbVar("--popover"),
          foreground: rgbVar("--popover-foreground"),
        },
        primary: {
          DEFAULT: rgbVar("--primary"),
          foreground: rgbVar("--primary-foreground"),
          fg: rgbVar("--color-primary-fg"),
        },
        secondary: {
          DEFAULT: rgbVar("--secondary"),
          foreground: rgbVar("--secondary-foreground"),
        },
        muted: {
          DEFAULT: rgbVar("--muted"),
          foreground: rgbVar("--muted-foreground"),
        },
        accent: {
          DEFAULT: rgbVar("--accent"),
          foreground: rgbVar("--accent-foreground"),
        },
        destructive: {
          DEFAULT: rgbVar("--destructive"),
          foreground: rgbVar("--destructive-foreground"),
        },
        border: rgbVar("--border"),
        input: rgbVar("--input"),
        ring: rgbVar("--ring"),

        // Pencil semantic groups (use these in domain components)
        bg: {
          DEFAULT: rgbVar("--color-bg"),
          elevated: rgbVar("--color-bg-elevated"),
          overlay: rgbVar("--color-bg-overlay"),
        },
        fg: {
          DEFAULT: rgbVar("--color-fg"),
          muted: rgbVar("--color-fg-muted"),
          subtle: rgbVar("--color-fg-subtle"),
          disabled: rgbVar("--color-fg-disabled"),
        },
        "border-strong": rgbVar("--color-border-strong"),
        class: {
          excellent: rgbVar("--color-class-excellent"),
          good: rgbVar("--color-class-good"),
          fair: rgbVar("--color-class-fair"),
          poor: rgbVar("--color-class-poor"),
        },
        cwv: {
          good: rgbVar("--color-cwv-good"),
          "needs-improvement": rgbVar("--color-cwv-needs-improvement"),
          poor: rgbVar("--color-cwv-poor"),
        },
        status: {
          active: rgbVar("--color-status-active"),
          pending: rgbVar("--color-status-pending"),
          completed: rgbVar("--color-status-completed"),
          failed: rgbVar("--color-status-failed"),
        },
        warning: rgbVar("--color-warning"),
        success: rgbVar("--color-success"),
        info: rgbVar("--color-info"),
        error: rgbVar("--color-error"),
      },
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-pill)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        md: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
        "5xl": "var(--text-5xl)",
      },
      fontWeight: {
        regular: "var(--weight-regular)",
        medium: "var(--weight-medium)",
        semibold: "var(--weight-semibold)",
        bold: "var(--weight-bold)",
      },
      fontFamily: {
        ui: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
