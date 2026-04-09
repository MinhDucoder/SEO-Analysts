import { describe, expect, it } from 'vitest';
import { getVerdict } from '../keyword/core/target-verdict';

describe('getVerdict', () => {
  it('returns "low" when density < 1%', () => {
    expect(getVerdict(0)).toBe('low');
    expect(getVerdict(0.5)).toBe('low');
    expect(getVerdict(0.99)).toBe('low');
  });

  it('returns "optimal" when density in [1%, 3%)', () => {
    expect(getVerdict(1)).toBe('optimal');
    expect(getVerdict(2)).toBe('optimal');
    expect(getVerdict(2.99)).toBe('optimal');
  });

  it('returns "high" when density in [3%, 5%]', () => {
    expect(getVerdict(3)).toBe('high');
    expect(getVerdict(4.5)).toBe('high');
    expect(getVerdict(5)).toBe('high');
  });

  it('returns "stuffing" when density > 5%', () => {
    expect(getVerdict(5.01)).toBe('stuffing');
    expect(getVerdict(10)).toBe('stuffing');
  });

  it('isStuffing flag is true iff verdict is "stuffing"', () => {
    const { isStuffing: low } = { isStuffing: getVerdict(0.5) === 'stuffing' };
    expect(low).toBe(false);
    const { isStuffing: stuff } = { isStuffing: getVerdict(6) === 'stuffing' };
    expect(stuff).toBe(true);
  });
});
