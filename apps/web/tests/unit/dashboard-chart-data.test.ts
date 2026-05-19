import { describe, it, expect } from "vitest";
import { buildTrendSeries } from "@/lib/dashboard/chart-data";
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

describe("buildTrendSeries", () => {
  it("returns empty series when fewer than 2 completed audits", () => {
    expect(buildTrendSeries([])).toEqual([]);
    expect(
      buildTrendSeries([
        audit({ createdAt: "2026-04-01T10:00:00Z" }),
      ]),
    ).toEqual([]);
  });

  it("sorts points chronologically by isoDate", () => {
    const series = buildTrendSeries([
      audit({ seoScore: 60, createdAt: "2026-04-05T10:00:00Z" }),
      audit({ seoScore: 80, createdAt: "2026-04-10T10:00:00Z" }),
      audit({ seoScore: 70, createdAt: "2026-04-07T10:00:00Z" }),
    ]);
    expect(series.map((p) => p.isoDate)).toEqual([
      "2026-04-05",
      "2026-04-07",
      "2026-04-10",
    ]);
    expect(series.map((p) => p.score)).toEqual([60, 70, 80]);
  });

  it("dedupes same-day audits keeping the latest", () => {
    // Use explicit +07:00 offsets so the test is timezone-independent.
    // Both audits fall on 2026-04-05 in Vietnam time (+07:00).
    const series = buildTrendSeries([
      audit({ seoScore: 60, createdAt: "2026-04-05T03:00:00+07:00" }),
      audit({ seoScore: 75, createdAt: "2026-04-05T18:00:00+07:00" }),
      audit({ seoScore: 80, createdAt: "2026-04-10T10:00:00+07:00" }),
    ]);
    expect(series).toHaveLength(2);
    const latest = series.find((p) => p.score === 75);
    expect(latest).toBeDefined();
    expect(latest?.score).toBe(75);
  });

  it("ignores non-completed audits", () => {
    const series = buildTrendSeries([
      audit({ status: AuditStatus.CRAWLING, seoScore: null, createdAt: "2026-04-06T10:00:00Z" }),
      audit({ status: AuditStatus.COMPLETED, seoScore: 70, createdAt: "2026-04-07T10:00:00Z" }),
      audit({ status: AuditStatus.COMPLETED, seoScore: 80, createdAt: "2026-04-08T10:00:00Z" }),
    ]);
    expect(series).toHaveLength(2);
    expect(series.every((p) => p.score >= 70)).toBe(true);
  });
});
