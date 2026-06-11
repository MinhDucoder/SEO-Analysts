import { describe, it, expect } from "vitest";
import { formatVnd } from "@/lib/utils/format";

describe("formatVnd", () => {
  it("formats a VND amount with vi-VN grouping and đ suffix", () => {
    expect(formatVnd(497000)).toBe("497.000đ");
    expect(formatVnd(451818)).toBe("451.818đ");
  });

  it("formats zero as 0đ", () => {
    expect(formatVnd(0)).toBe("0đ");
  });

  it("returns — for null, undefined, or NaN", () => {
    expect(formatVnd(null)).toBe("—");
    expect(formatVnd(undefined)).toBe("—");
    expect(formatVnd(Number.NaN)).toBe("—");
  });
});
