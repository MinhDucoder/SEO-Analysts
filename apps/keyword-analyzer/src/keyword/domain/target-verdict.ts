export type Verdict = 'low' | 'optimal' | 'high' | 'stuffing';

/**
 * Maps a density percentage to a human-readable verdict following
 * the thresholds from `specs/microservices-architecture-design.md` §8.1:
 *
 *    density < 1.0%   → 'low'
 *    1.0% ≤ d < 3.0%  → 'optimal'
 *    3.0% ≤ d ≤ 5.0%  → 'high'
 *    density > 5.0%   → 'stuffing'
 */
export function getVerdict(densityPercent: number): Verdict {
  if (densityPercent < 1) return 'low';
  if (densityPercent < 3) return 'optimal';
  if (densityPercent <= 5) return 'high';
  return 'stuffing';
}

export function isStuffing(densityPercent: number): boolean {
  return getVerdict(densityPercent) === 'stuffing';
}
