import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
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
        // Primary (brand)
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          container: "rgb(var(--color-primary-container) / <alpha-value>)",
          fixed: "rgb(var(--color-primary-fixed) / <alpha-value>)",
          "fixed-dim": "rgb(var(--color-primary-fixed-dim) / <alpha-value>)",
          foreground: "rgb(var(--color-on-primary) / <alpha-value>)",
        },
        // Surfaces
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          "container-lowest": "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
          "container-low": "rgb(var(--color-surface-container-low) / <alpha-value>)",
          container: "rgb(var(--color-surface-container) / <alpha-value>)",
          "container-high": "rgb(var(--color-surface-container-high) / <alpha-value>)",
          "container-highest": "rgb(var(--color-surface-container-highest) / <alpha-value>)",
          variant: "rgb(var(--color-surface-variant) / <alpha-value>)",
          bright: "rgb(var(--color-surface-bright) / <alpha-value>)",
          dim: "rgb(var(--color-surface-dim) / <alpha-value>)",
          inverse: "rgb(var(--color-inverse-surface) / <alpha-value>)",
        },
        // Text
        "on-surface": {
          DEFAULT: "rgb(var(--color-on-surface) / <alpha-value>)",
          variant: "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        },
        // Status
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          container: "rgb(var(--color-error-container) / <alpha-value>)",
          foreground: "rgb(var(--color-on-error) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          container: "rgb(var(--color-warning-container) / <alpha-value>)",
          foreground: "rgb(var(--color-on-warning) / <alpha-value>)",
        },
        tertiary: {
          DEFAULT: "rgb(var(--color-tertiary) / <alpha-value>)",
          fixed: "rgb(var(--color-tertiary-fixed) / <alpha-value>)",
          foreground: "rgb(var(--color-on-tertiary) / <alpha-value>)",
        },
        // Outlines
        outline: {
          DEFAULT: "rgb(var(--color-outline) / <alpha-value>)",
          variant: "rgb(var(--color-outline-variant) / <alpha-value>)",
        },
        // Sidebar (dark nav)
        sidebar: {
          DEFAULT: "rgb(var(--color-sidebar-bg) / <alpha-value>)",
          active: "rgb(var(--color-sidebar-bg-active) / <alpha-value>)",
          text: "rgb(var(--color-sidebar-text) / <alpha-value>)",
          "text-hover": "rgb(var(--color-sidebar-text-hover) / <alpha-value>)",
          "text-active": "rgb(var(--color-sidebar-text-active) / <alpha-value>)",
        },
        // Score classification
        score: {
          excellent: "rgb(var(--color-score-excellent) / <alpha-value>)",
          good: "rgb(var(--color-score-good) / <alpha-value>)",
          fair: "rgb(var(--color-score-fair) / <alpha-value>)",
          poor: "rgb(var(--color-score-poor) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "system-ui", "sans-serif"],
        headline: ["var(--font-manrope)", "var(--font-inter)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["60px", { lineHeight: "1.1", fontWeight: "800" }],
        "display-lg": ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        "display-md": ["36px", { lineHeight: "1.2", fontWeight: "700" }],
        h1: ["30px", { lineHeight: "1.25", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        h4: ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6" }],
        body: ["16px", { lineHeight: "1.6" }],
        "body-sm": ["14px", { lineHeight: "1.5" }],
        caption: ["12px", { lineHeight: "1.4" }],
        micro: ["10px", { lineHeight: "1.3" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        primary: "var(--shadow-primary)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
