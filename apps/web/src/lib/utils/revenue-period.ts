/**
 * Client-side calendar-period state + math for the admin revenue section.
 * Pure functions — the component holds a RevenuePeriodState and derives the
 * API query + label from it. `month`/`quarter` are always kept in sync so
 * switching `type` never loses the user's position in the year.
 */
export type RevenuePeriodType = "month" | "quarter" | "year";

export interface RevenuePeriodState {
  type: RevenuePeriodType;
  year: number;
  month: number; // 1-12
  quarter: number; // 1-4
}

export function defaultPeriod(now: Date = new Date()): RevenuePeriodState {
  return {
    type: "month",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

export function shiftPeriod(p: RevenuePeriodState, dir: -1 | 1): RevenuePeriodState {
  if (p.type === "year") return { ...p, year: p.year + dir };
  if (p.type === "quarter") {
    let quarter = p.quarter + dir;
    let year = p.year;
    if (quarter < 1) { quarter = 4; year -= 1; }
    if (quarter > 4) { quarter = 1; year += 1; }
    return { ...p, year, quarter };
  }
  let month = p.month + dir;
  let year = p.year;
  if (month < 1) { month = 12; year -= 1; }
  if (month > 12) { month = 1; year += 1; }
  return { ...p, year, month };
}

export function periodToQuery(p: RevenuePeriodState): Record<string, string> {
  if (p.type === "year") return { type: "year", year: String(p.year) };
  if (p.type === "quarter") return { type: "quarter", year: String(p.year), quarter: String(p.quarter) };
  return { type: "month", year: String(p.year), month: String(p.month) };
}

export function formatPeriodLabel(p: RevenuePeriodState): string {
  if (p.type === "year") return `Năm ${p.year}`;
  if (p.type === "quarter") return `Quý ${p.quarter}/${p.year}`;
  return `Tháng ${p.month}/${p.year}`;
}
