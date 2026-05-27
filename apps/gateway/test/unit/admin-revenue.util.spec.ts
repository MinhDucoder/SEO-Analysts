import { describe, it, expect } from 'vitest';
import { resolvePeriod, previousPeriod, splitVat, VAT_PERCENT } from '../../src/admin/services/admin-revenue.util';

const NOW = new Date(2026, 4, 15); // 2026-05-15 (month index 4 = May)

describe('resolvePeriod', () => {
  it('defaults to the current month when nothing is provided', () => {
    const p = resolvePeriod({}, NOW);
    expect(p).toMatchObject({ type: 'month', year: 2026, month: 5, label: 'Tháng 5/2026' });
    expect(p.start.getTime()).toBe(new Date(2026, 4, 1).getTime());
    expect(p.end.getTime()).toBe(new Date(2026, 5, 1).getTime());
  });

  it('resolves an explicit month', () => {
    const p = resolvePeriod({ type: 'month', year: 2026, month: 2 }, NOW);
    expect(p.label).toBe('Tháng 2/2026');
    expect(p.start.getTime()).toBe(new Date(2026, 1, 1).getTime());
    expect(p.end.getTime()).toBe(new Date(2026, 2, 1).getTime());
  });

  it('resolves a quarter to its 3 months', () => {
    const p = resolvePeriod({ type: 'quarter', year: 2026, quarter: 2 }, NOW);
    expect(p).toMatchObject({ type: 'quarter', quarter: 2, label: 'Quý 2/2026' });
    expect(p.start.getTime()).toBe(new Date(2026, 3, 1).getTime()); // Apr 1
    expect(p.end.getTime()).toBe(new Date(2026, 6, 1).getTime());   // Jul 1
  });

  it('resolves a full year', () => {
    const p = resolvePeriod({ type: 'year', year: 2025 }, NOW);
    expect(p.label).toBe('Năm 2025');
    expect(p.start.getTime()).toBe(new Date(2025, 0, 1).getTime());
    expect(p.end.getTime()).toBe(new Date(2026, 0, 1).getTime());
  });
});

describe('previousPeriod', () => {
  it('steps month back across a year boundary', () => {
    const jan = resolvePeriod({ type: 'month', year: 2026, month: 1 }, NOW);
    const prev = previousPeriod(jan);
    expect(prev).toMatchObject({ year: 2025, month: 12 });
  });

  it('steps quarter back across a year boundary', () => {
    const q1 = resolvePeriod({ type: 'quarter', year: 2026, quarter: 1 }, NOW);
    expect(previousPeriod(q1)).toMatchObject({ year: 2025, quarter: 4 });
  });

  it('steps a year back', () => {
    const y = resolvePeriod({ type: 'year', year: 2026 }, NOW);
    expect(previousPeriod(y)).toMatchObject({ year: 2025 });
  });
});

describe('splitVat', () => {
  it('splits VAT out of a VAT-inclusive gross (net + vat === gross)', () => {
    expect(splitVat(497000)).toEqual({ grossVnd: 497000, vatVnd: 45182, netVnd: 451818 });
    expect(VAT_PERCENT).toBe(10);
  });

  it('returns zeros for a zero gross', () => {
    expect(splitVat(0)).toEqual({ grossVnd: 0, vatVnd: 0, netVnd: 0 });
  });
});
