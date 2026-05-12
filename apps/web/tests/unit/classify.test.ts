import { describe, it, expect } from "vitest";
import {
  scoreVariant,
  scoreTextClass,
  scoreBgClass,
  scoreFillVar,
} from "@/lib/utils/classify";

describe("scoreVariant", () => {
  it("returns 'excellent' for scores >= 80", () => {
    expect(scoreVariant(80)).toBe("excellent");
    expect(scoreVariant(100)).toBe("excellent");
  });

  it("returns 'good' for scores 60-79", () => {
    expect(scoreVariant(60)).toBe("good");
    expect(scoreVariant(79)).toBe("good");
  });

  it("returns 'fair' for scores 40-59", () => {
    expect(scoreVariant(40)).toBe("fair");
    expect(scoreVariant(59)).toBe("fair");
  });

  it("returns 'poor' for scores < 40", () => {
    expect(scoreVariant(0)).toBe("poor");
    expect(scoreVariant(39)).toBe("poor");
  });

  it("returns 'muted' for null/undefined/NaN", () => {
    expect(scoreVariant(null)).toBe("muted");
    expect(scoreVariant(undefined)).toBe("muted");
    expect(scoreVariant(Number.NaN)).toBe("muted");
  });
});

describe("scoreTextClass + scoreBgClass", () => {
  it("maps excellent score to Pencil class-excellent tokens", () => {
    expect(scoreTextClass(85)).toBe("text-class-excellent");
    expect(scoreBgClass(85)).toBe("bg-class-excellent/15");
  });

  it("maps good score to Pencil class-good tokens", () => {
    expect(scoreTextClass(70)).toBe("text-class-good");
    expect(scoreBgClass(70)).toBe("bg-class-good/15");
  });

  it("maps fair score to Pencil class-fair tokens", () => {
    expect(scoreTextClass(50)).toBe("text-class-fair");
    expect(scoreBgClass(50)).toBe("bg-class-fair/15");
  });

  it("maps poor score to Pencil class-poor tokens", () => {
    expect(scoreTextClass(20)).toBe("text-class-poor");
    expect(scoreBgClass(20)).toBe("bg-class-poor/15");
  });

  it("maps null to muted neutral tokens", () => {
    expect(scoreTextClass(null)).toBe("text-fg-muted");
    expect(scoreBgClass(null)).toBe("bg-bg-overlay");
  });
});

describe("scoreFillVar", () => {
  it("returns CSS var references for inline SVG style props", () => {
    expect(scoreFillVar(85)).toBe("var(--color-class-excellent)");
    expect(scoreFillVar(70)).toBe("var(--color-class-good)");
    expect(scoreFillVar(50)).toBe("var(--color-class-fair)");
    expect(scoreFillVar(20)).toBe("var(--color-class-poor)");
    expect(scoreFillVar(null)).toBe("var(--color-fg-muted)");
  });
});
