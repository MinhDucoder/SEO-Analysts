import { describe, expect, it } from 'vitest';
import { calculateDensity } from '../keyword/core/density-calculator';

describe('calculateDensity', () => {
  it('computes (frequency / totalWords) * 100', () => {
    expect(calculateDensity(5, 100)).toBe(5);
    expect(calculateDensity(1, 200)).toBe(0.5);
    expect(calculateDensity(3, 150)).toBe(2);
  });

  it('returns 0 when totalWords is 0 (guard against divide-by-zero)', () => {
    expect(calculateDensity(0, 0)).toBe(0);
    expect(calculateDensity(5, 0)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateDensity(1, 333)).toBe(0.3);
    expect(calculateDensity(7, 999)).toBe(0.7);
  });
});
