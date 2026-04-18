import { describe, it, expect } from "vitest";
import { formatScore, formatDuration, formatRelativeDate, formatAbsoluteDate } from "@/lib/utils/format";

describe("formatScore()", () => {
  it("renders rounded integer for numeric score", () => {
    expect(formatScore(85)).toBe("85");
    expect(formatScore(72.4)).toBe("72");
    expect(formatScore(72.6)).toBe("73");
    expect(formatScore(0)).toBe("0");
    expect(formatScore(100)).toBe("100");
  });

  it('returns "—" for null/undefined/NaN', () => {
    expect(formatScore(null)).toBe("—");
    expect(formatScore(undefined)).toBe("—");
    expect(formatScore(Number.NaN)).toBe("—");
  });
});

describe("formatDuration()", () => {
  it("renders seconds under 60s", () => {
    expect(formatDuration(15_000)).toBe("15 giây");
    expect(formatDuration(59_000)).toBe("59 giây");
    expect(formatDuration(0)).toBe("0 giây");
  });

  it("renders minutes between 1m-59m", () => {
    expect(formatDuration(60_000)).toBe("1 phút");
    expect(formatDuration(150_000)).toBe("3 phút");
    expect(formatDuration(3_540_000)).toBe("59 phút");
  });

  it("renders hours between 1h-23h", () => {
    expect(formatDuration(3_600_000)).toBe("1 giờ");
    expect(formatDuration(7_200_000)).toBe("2 giờ");
  });

  it("renders days for ≥ 24h", () => {
    expect(formatDuration(86_400_000)).toBe("1 ngày");
    expect(formatDuration(172_800_000)).toBe("2 ngày");
  });

  it('returns "—" for null/undefined/NaN/negative', () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(-1)).toBe("—");
  });
});

describe("formatRelativeDate()", () => {
  it("renders Vietnamese relative phrase (contains 'trước')", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeDate(twoHoursAgo)).toMatch(/trước$/);
  });

  it("accepts ISO strings", () => {
    const iso = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    expect(formatRelativeDate(iso)).toMatch(/trước$/);
  });

  it('returns "—" for null/undefined/invalid', () => {
    expect(formatRelativeDate(null)).toBe("—");
    expect(formatRelativeDate(undefined)).toBe("—");
    expect(formatRelativeDate("not-a-date")).toBe("—");
  });
});

describe("formatAbsoluteDate()", () => {
  it("renders DD/MM/YYYY HH:mm", () => {
    const d = new Date("2026-04-18T15:30:00");
    expect(formatAbsoluteDate(d)).toBe("18/04/2026 15:30");
  });

  it('returns "—" for null/undefined/invalid', () => {
    expect(formatAbsoluteDate(null)).toBe("—");
    expect(formatAbsoluteDate("garbage")).toBe("—");
  });
});
