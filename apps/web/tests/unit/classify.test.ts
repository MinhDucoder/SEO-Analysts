import { describe, it, expect } from "vitest";
import {
  scoreVariant,
  scoreTextClass,
  scoreBgClass,
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
  it("map excellent to score-excellent token", () => {
    expect(scoreTextClass(85)).toBe("text-score-excellent");
    expect(scoreBgClass(85)).toBe("bg-score-excellent/10");
  });

  it("maps null to muted neutral tokens", () => {
    expect(scoreTextClass(null)).toBe("text-on-surface-variant");
    expect(scoreBgClass(null)).toBe("bg-surface-container-high");
  });
});
