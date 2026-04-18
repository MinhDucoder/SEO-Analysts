import { Classification, classify } from "@repo/shared";

/**
 * Map a numeric SEO score (0-100, or null for pre-completed audits) to the
 * Tailwind color class name that matches the design token. The shared
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
  excellent: "text-score-excellent",
  good: "text-score-good",
  fair: "text-score-fair",
  poor: "text-score-poor",
  muted: "text-on-surface-variant",
};

const BG_CLASS: Record<ScoreVariant, string> = {
  excellent: "bg-score-excellent/10",
  good: "bg-score-good/10",
  fair: "bg-score-fair/10",
  poor: "bg-score-poor/10",
  muted: "bg-surface-container-high",
};

export function scoreTextClass(score: number | null | undefined): string {
  return TEXT_CLASS[scoreVariant(score)];
}

export function scoreBgClass(score: number | null | undefined): string {
  return BG_CLASS[scoreVariant(score)];
}
