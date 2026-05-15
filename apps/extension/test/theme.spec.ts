import { describe, it, expect } from 'vitest';
import { classify } from '../lib/theme/classify';

describe('classify(score) → ScoreClass', () => {
  it.each([
    [100, 'excellent'],
    [80, 'excellent'],
    [79, 'good'],
    [60, 'good'],
    [59, 'fair'],
    [40, 'fair'],
    [39, 'poor'],
    [0, 'poor'],
  ])('score %i → %s', (score, expected) => {
    expect(classify(score)).toBe(expected);
  });

  it('clamps negative to poor', () => {
    expect(classify(-10)).toBe('poor');
  });

  it('clamps >100 to excellent', () => {
    expect(classify(150)).toBe('excellent');
  });
});
