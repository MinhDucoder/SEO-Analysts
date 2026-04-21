import dayjs from "dayjs";
import type { AuditListItem } from "@/lib/api/types";
import { AuditStatus } from "@repo/shared";

/**
 * Series point consumed by the score trend chart (Recharts). Kept flat
 * (label + numeric `score` + optional `url`) so Recharts' `<Line
 * dataKey="score">` works without transforms.
 */
export interface TrendPoint {
  /** Short Vietnamese label, e.g. "18/04". */
  label: string;
  /** ISO day bucket for tooltip date rendering. */
  isoDate: string;
  /** Score (0-100) for that day. */
  score: number;
  /** URL of the audit that produced this point (tooltip). */
  url: string;
}

/**
 * Build a chronologically-sorted series of `(day, score)` points from
 * completed audits. Only the latest completed audit per day wins (most
 * recent wins ties). Series is empty when fewer than 2 completed audits
 * exist so the caller can render a "cần ≥ 2 audit để vẽ xu hướng"
 * placeholder instead of a degenerate single-point line.
 */
export function buildTrendSeries(audits: AuditListItem[]): TrendPoint[] {
  const completed = audits.filter(
    (a) => a.status === AuditStatus.COMPLETED && a.seoScore !== null,
  );

  const byDay = new Map<string, TrendPoint>();
  for (const a of completed) {
    const d = dayjs(a.createdAt);
    if (!d.isValid()) continue;
    const isoDate = d.format("YYYY-MM-DD");
    const existing = byDay.get(isoDate);
    const incoming: TrendPoint = {
      label: d.format("DD/MM"),
      isoDate,
      score: a.seoScore as number,
      url: a.url,
    };
    if (!existing) {
      byDay.set(isoDate, incoming);
    } else {
      // Later createdAt wins (tie-break by seoScore higher).
      const existingAudit = completed.find(
        (x) => dayjs(x.createdAt).format("YYYY-MM-DD") === isoDate,
      );
      if (
        existingAudit &&
        dayjs(a.createdAt).isAfter(dayjs(existingAudit.createdAt))
      ) {
        byDay.set(isoDate, incoming);
      }
    }
  }

  if (byDay.size < 2) return [];

  return [...byDay.values()].sort((a, b) =>
    a.isoDate < b.isoDate ? -1 : a.isoDate > b.isoDate ? 1 : 0,
  );
}
