/**
 * Keyword density expressed as a percentage, rounded to 2 decimal places.
 * Protected against divide-by-zero (returns 0 if totalWords <= 0).
 */
export function calculateDensity(frequency: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  const raw = (frequency / totalWords) * 100;
  return Math.round(raw * 100) / 100;
}
