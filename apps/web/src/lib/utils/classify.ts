import { Classification, classify } from "@repo/shared";

/**
 * Map a numeric SEO score (0-100, or null for pre-completed audits) to the
 * Tailwind color class name that matches the Pencil design token. The shared
 * `classify()` determines the threshold; this module is the single place
 * widgets consult for classification → class-name.
 *
 * Returns "muted" for null/undefined so gauges and badges can render a
 * neutral placeholder without branching on missing values.
 */
export type ScoreVariant = "excellent" | "good" | "fair" | "poor" | "muted";

export function scoreVariant(score: number | null | undefined): ScoreVariant {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return "muted";
  }
  switch (classify(score)) {
    case Classification.EXCELLENT:
      return "excellent";
    case Classification.GOOD:
      return "good";
    case Classification.FAIR:
      return "fair";
    case Classification.POOR:
      return "poor";
  }
}

const TEXT_CLASS: Record<ScoreVariant, string> = {
  excellent: "text-class-excellent",
  good: "text-class-good",
  fair: "text-class-fair",
  poor: "text-class-poor",
  muted: "text-fg-muted",
};

const BG_CLASS: Record<ScoreVariant, string> = {
  excellent: "bg-class-excellent/15",
  good: "bg-class-good/15",
  fair: "bg-class-fair/15",
  poor: "bg-class-poor/15",
  muted: "bg-bg-overlay",
};

const FILL_CSS_VAR: Record<ScoreVariant, string> = {
  excellent: "var(--color-class-excellent)",
  good: "var(--color-class-good)",
  fair: "var(--color-class-fair)",
  poor: "var(--color-class-poor)",
  muted: "var(--color-fg-muted)",
};

export function scoreTextClass(score: number | null | undefined): string {
  return TEXT_CLASS[scoreVariant(score)];
}

export function scoreBgClass(score: number | null | undefined): string {
  return BG_CLASS[scoreVariant(score)];
}

/**
 * Raw CSS var reference (for inline `style` props on SVG `fill` / `stroke`
 * which can't take Tailwind classes).
 */
export function scoreFillVar(score: number | null | undefined): string {
  return FILL_CSS_VAR[scoreVariant(score)];
}
