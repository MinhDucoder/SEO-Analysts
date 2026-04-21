import type { AuditListItem } from "@/lib/api/types";
import { AuditStatus } from "@repo/shared";

/**
 * Dashboard stat aggregates computed client-side from the recent-audits
 * list. Gateway does not ship a `/stats/my` endpoint yet, so the dashboard
 * derives its 4 stat cards here. Each metric carries:
 *   - value: current display number (or null when no data)
 *   - delta: absolute difference vs previous window (null when baseline missing)
 */

export interface StatValue<T = number> {
  value: T | null;
  delta: number | null;
}

export interface DashboardStats {
  auditsThisMonth: StatValue<number>;
  avgScore: StatValue<number>;
  criticalIssues: StatValue<number>;
  pdfsExported: StatValue<number>;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function subMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() - n, 1);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}

function parseDate(iso: string): Date {
  return new Date(iso);
}

export function computeStats(
  audits: AuditListItem[],
  now: Date,
): DashboardStats {
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = subMonths(now, 1);

  const thisMonth = audits.filter((a) => parseDate(a.createdAt) >= thisMonthStart);
  const lastMonth = audits.filter((a) => {
    const d = parseDate(a.createdAt);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const thisMonthScored = thisMonth
    .filter((a) => a.status === AuditStatus.COMPLETED && a.seoScore !== null)
    .map((a) => a.seoScore as number);
  const lastMonthScored = lastMonth
    .filter((a) => a.status === AuditStatus.COMPLETED && a.seoScore !== null)
    .map((a) => a.seoScore as number);

  const thisMonthAvg = mean(thisMonthScored);
  const lastMonthAvg = mean(lastMonthScored);

  return {
    auditsThisMonth: {
      value: thisMonth.length,
      delta: lastMonth.length === 0 && thisMonth.length === 0
        ? null
        : thisMonth.length - lastMonth.length,
    },
    avgScore: {
      value: thisMonthAvg,
      delta:
        thisMonthAvg !== null && lastMonthAvg !== null
          ? thisMonthAvg - lastMonthAvg
          : null,
    },
    // Gateway list endpoint doesn't return rule-fail digests on the list
    // shape. Placeholder until a `/stats/my` endpoint (or list-aggregate
    // counts) lands in a backend slug. Documented in
    // docs/design/dashboard-shell/DESIGN.md Decisions log.
    criticalIssues: { value: null, delta: null },
    pdfsExported: { value: null, delta: null },
  };
}

/**
 * Extract the current overall-health score for the hero gauge. Uses the
 * most recent COMPLETED audit's seoScore (not the mean, because the hero
 * communicates "right now" rather than "30-day average").
 */
export function computeHeroScore(audits: AuditListItem[]): {
  score: number | null;
  previousScore: number | null;
} {
  const completed = audits
    .filter((a) => a.status === AuditStatus.COMPLETED && a.seoScore !== null)
    .sort(
      (a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime(),
    );
  return {
    score: completed[0]?.seoScore ?? null,
    previousScore: completed[1]?.seoScore ?? null,
  };
}
