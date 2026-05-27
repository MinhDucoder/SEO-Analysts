import { describe, it, expect } from "vitest";
import {
  defaultPeriod,
  shiftPeriod,
  periodToQuery,
  formatPeriodLabel,
  type RevenuePeriodState,
} from "@/lib/utils/revenue-period";

const may2026: RevenuePeriodState = { type: "month", year: 2026, month: 5, quarter: 2 };

describe("defaultPeriod", () => {
  it("returns the current month/quarter for a given now", () => {
    const p = defaultPeriod(new Date(2026, 4, 15)); // May 2026
    expect(p).toEqual({ type: "month", year: 2026, month: 5, quarter: 2 });
  });
});

describe("shiftPeriod", () => {
  it("steps month back across a year boundary", () => {
    const jan: RevenuePeriodState = { type: "month", year: 2026, month: 1, quarter: 1 };
    expect(shiftPeriod(jan, -1)).toMatchObject({ year: 2025, month: 12 });
  });
  it("steps month forward across a year boundary", () => {
    const dec: RevenuePeriodState = { type: "month", year: 2026, month: 12, quarter: 4 };
    expect(shiftPeriod(dec, 1)).toMatchObject({ year: 2027, month: 1 });
  });
  it("steps quarter back across a year boundary", () => {
    const q1: RevenuePeriodState = { type: "quarter", year: 2026, month: 1, quarter: 1 };
    expect(shiftPeriod(q1, -1)).toMatchObject({ year: 2025, quarter: 4 });
  });
  it("steps year", () => {
    const y: RevenuePeriodState = { type: "year", year: 2026, month: 5, quarter: 2 };
    expect(shiftPeriod(y, 1)).toMatchObject({ year: 2027 });
  });
});

describe("periodToQuery", () => {
  it("emits only the relevant keys per type", () => {
    expect(periodToQuery(may2026)).toEqual({ type: "month", year: "2026", month: "5" });
    expect(periodToQuery({ ...may2026, type: "quarter" })).toEqual({ type: "quarter", year: "2026", quarter: "2" });
    expect(periodToQuery({ ...may2026, type: "year" })).toEqual({ type: "year", year: "2026" });
  });
});

describe("formatPeriodLabel", () => {
  it("formats per type in Vietnamese", () => {
    expect(formatPeriodLabel(may2026)).toBe("Tháng 5/2026");
    expect(formatPeriodLabel({ ...may2026, type: "quarter" })).toBe("Quý 2/2026");
    expect(formatPeriodLabel({ ...may2026, type: "year" })).toBe("Năm 2026");
  });
});
