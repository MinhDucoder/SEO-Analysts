"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { RecentAuditsCard } from "@/components/dashboard/recent-audits-card";
import { ScoreGaugeHero } from "@/components/dashboard/score-gauge-hero";
import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { computeHeroScore, computeStats } from "@/lib/dashboard/aggregates";
import { useRecentAudits } from "@/lib/queries/use-audits";

/**
 * Dashboard landing page. Single `useRecentAudits(30)` query powers
 * every widget — no fan-out to avoid triggering N parallel requests.
 * Rendering cases (in order):
 *   1. isLoading → skeleton (page-level `loading.tsx` handles initial
 *      navigation; this branch covers refetch / stale-then-refresh).
 *   2. isError → top error banner with retry button.
 *   3. audits.length === 0 → <DashboardEmpty /> full-card.
 *   4. default → bento grid of widgets.
 */
export default function DashboardPage() {
  const { data, isLoading, isError, refetch, error } = useRecentAudits({
    limit: 30,
  });

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <Card
        padding="md"
        variant="outline"
        className="border-error/40 bg-error-container/20"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-error mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-on-surface">Không tải được dashboard</p>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {error instanceof Error ? error.message : "Lỗi kết nối tới máy chủ."}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  const audits = data?.data ?? [];

  if (audits.length === 0) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <DashboardEmpty />
      </div>
    );
  }

  const now = new Date();
  const stats = computeStats(audits, now);
  const { score, previousScore } = computeHeroScore(audits);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <ScoreGaugeHero
          score={score}
          previousScore={previousScore}
          className="col-span-12 lg:col-span-4"
        />
        <div className="col-span-12 lg:col-span-8">
          <StatsGrid stats={stats} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <ScoreTrendChart
          audits={audits}
          className="col-span-12 lg:col-span-8"
        />
        <RecentAuditsCard
          audits={audits}
          className="col-span-12 lg:col-span-4"
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 lg:col-span-4 h-80 bg-surface-container-low rounded-xl animate-pulse" />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 bg-surface-container-low rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 lg:col-span-8 h-80 bg-surface-container-low rounded-xl animate-pulse" />
        <div className="col-span-12 lg:col-span-4 h-80 bg-surface-container-low rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
