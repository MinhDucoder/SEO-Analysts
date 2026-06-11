/**
 * Calendar-period math + VAT split for admin revenue reporting. Pure functions
 * (no Prisma / no Date.now side effects beyond the injectable `now`) so they
 * are deterministically testable. All bounds are [start, end) in server-local
 * time, matching how `AdminService.getStats` constructs dates.
 */

/** VAT rate (%) — prices are VAT-inclusive, so VAT is split out of the gross. */
export const VAT_PERCENT = 10;

export type RevenuePeriodType = 'month' | 'quarter' | 'year';

export interface ResolvedPeriod {
  type: RevenuePeriodType;
  year: number;
  month?: number; // 1-12, only for type='month'
  quarter?: number; // 1-4, only for type='quarter'
  start: Date; // inclusive
  end: Date; // exclusive
  label: string; // "Tháng 5/2026" | "Quý 2/2026" | "Năm 2026"
}

export interface RevenuePeriodInput {
  type?: string;
  year?: number;
  month?: number;
  quarter?: number;
}

export function resolvePeriod(input: RevenuePeriodInput, now: Date = new Date()): ResolvedPeriod {
  const type: RevenuePeriodType =
    input.type === 'quarter' || input.type === 'year' ? input.type : 'month';
  const year = input.year ?? now.getFullYear();

  if (type === 'year') {
    return {
      type,
      year,
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
      label: `Năm ${year}`,
    };
  }

  if (type === 'quarter') {
    const quarter = input.quarter ?? Math.floor(now.getMonth() / 3) + 1;
    const firstMonthIdx = (quarter - 1) * 3; // 0-based
    return {
      type,
      year,
      quarter,
      start: new Date(year, firstMonthIdx, 1),
      end: new Date(year, firstMonthIdx + 3, 1),
      label: `Quý ${quarter}/${year}`,
    };
  }

  const month = input.month ?? now.getMonth() + 1; // 1-12
  return {
    type,
    year,
    month,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
    label: `Tháng ${month}/${year}`,
  };
}

export function previousPeriod(p: ResolvedPeriod): ResolvedPeriod {
  if (p.type === 'year') {
    return resolvePeriod({ type: 'year', year: p.year - 1 });
  }
  if (p.type === 'quarter') {
    const q = p.quarter ?? 1;
    return q === 1
      ? resolvePeriod({ type: 'quarter', year: p.year - 1, quarter: 4 })
      : resolvePeriod({ type: 'quarter', year: p.year, quarter: q - 1 });
  }
  const m = p.month ?? 1;
  return m === 1
    ? resolvePeriod({ type: 'month', year: p.year - 1, month: 12 })
    : resolvePeriod({ type: 'month', year: p.year, month: m - 1 });
}

export function splitVat(gross: number): { grossVnd: number; vatVnd: number; netVnd: number } {
  const vatVnd = Math.round((gross * VAT_PERCENT) / (100 + VAT_PERCENT));
  return { grossVnd: gross, vatVnd, netVnd: gross - vatVnd };
}
