import type { ScoreClass } from './tokens';

/**
 * Map a numeric SEO score (0-100) to a class bucket that picks the
 * matching --color-class-* token. Boundaries match the design spec
 * (>=80 excellent, >=60 good, >=40 fair, else poor). Out-of-range
 * inputs clamp to the nearest bucket — defensive, since the API
 * contract doesn't strictly guarantee 0-100.
 */
export function classify(score: number): ScoreClass {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}
