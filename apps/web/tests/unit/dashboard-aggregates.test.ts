import { describe, it, expect } from "vitest";
import { computeStats, computeHeroScore } from "@/lib/dashboard/aggregates";
import type { AuditListItem } from "@/lib/api/types";
import { AuditStatus } from "@repo/shared";

function audit(overrides: Partial<AuditListItem>): AuditListItem {
  return {
    id: "id-" + Math.random().toString(36).slice(2, 8),
    url: "https://example.com",
    domain: "example.com",
    status: AuditStatus.COMPLETED,
    seoScore: 75,
    targetKeyword: null,
    crawlerType: null,
    crawlDurationMs: null,
    createdAt: new Date("2026-04-10T10:00:00Z").toISOString(),
    completedAt: new Date("2026-04-10T10:05:00Z").toISOString(),
    ...overrides,
  };
}

describe("computeStats", () => {
  const now = new Date("2026-04-19T12:00:00Z");

  it("returns zeros + null deltas for empty input", () => {
    const stats = computeStats([], now);
    expect(stats.auditsThisMonth.value).toBe(0);
    expect(stats.auditsThisMonth.delta).toBeNull();
    expect(stats.avgScore.value).toBeNull();
    expect(stats.avgScore.delta).toBeNull();
  });

  it("counts this-month audits + null delta when no last-month baseline", () => {
    const audits = [
      audit({ createdAt: "2026-04-10T10:00:00Z" }),
      audit({ createdAt: "2026-04-15T10:00:00Z" }),
      audit({ createdAt: "2026-04-18T10:00:00Z" }),
    ];
    const stats = computeStats(audits, now);
    expect(stats.auditsThisMonth.value).toBe(3);
    expect(stats.auditsThisMonth.delta).toBe(3); // 3 − 0
  });

  it("computes delta vs last month when both windows have audits", () => {
    const audits = [
      audit({ createdAt: "2026-03-15T10:00:00Z", seoScore: 60 }),
      audit({ createdAt: "2026-03-25T10:00:00Z", seoScore: 70 }),
      audit({ createdAt: "2026-04-05T10:00:00Z", seoScore: 80 }),
      audit({ createdAt: "2026-04-18T10:00:00Z", seoScore: 90 }),
    ];
    const stats = computeStats(audits, now);
    expect(stats.auditsThisMonth.value).toBe(2);
    expect(stats.auditsThisMonth.delta).toBe(0); // 2 − 2
    expect(stats.avgScore.value).toBe(85); // (80+90)/2
    expect(stats.avgScore.delta).toBe(20); // 85 − 65
  });

  it("ignores non-completed audits when computing avg score", () => {
    const audits = [
      audit({ status: AuditStatus.CRAWLING, seoScore: null, createdAt: "2026-04-15T10:00:00Z" }),
      audit({ status: AuditStatus.COMPLETED, seoScore: 80, createdAt: "2026-04-16T10:00:00Z" }),
    ];
    const stats = computeStats(audits, now);
    expect(stats.auditsThisMonth.value).toBe(2);
    expect(stats.avgScore.value).toBe(80);
  });

  it("leaves criticalIssues + pdfsExported as null placeholders", () => {
    const stats = computeStats([audit({})], now);
    expect(stats.criticalIssues.value).toBeNull();
    expect(stats.pdfsExported.value).toBeNull();
  });
});

describe("computeHeroScore", () => {
  it("returns null when no completed audits", () => {
    const audits = [
      audit({ status: AuditStatus.CRAWLING, seoScore: null }),
    ];
    const { score, previousScore } = computeHeroScore(audits);
    expect(score).toBeNull();
    expect(previousScore).toBeNull();
  });

  it("picks the most recent completed audit and the one before", () => {
    const audits = [
      audit({ seoScore: 70, createdAt: "2026-04-10T10:00:00Z" }),
      audit({ seoScore: 85, createdAt: "2026-04-18T10:00:00Z" }),
      audit({ seoScore: 60, createdAt: "2026-03-01T10:00:00Z" }),
    ];
    const { score, previousScore } = computeHeroScore(audits);
    expect(score).toBe(85);
    expect(previousScore).toBe(70);
  });
});
