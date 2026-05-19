"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { RecentAuditsCard } from "@/components/dashboard/recent-audits-card";
import { ScoreGaugeHero } from "@/components/dashboard/score-gauge-hero";
import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { computeHeroScore, computeStats } from "@/lib/dashboard/aggregates";
import { useRecentAudits } from "@/lib/queries/use-audits";
import { ROUTES } from "@/lib/constants";
import { AuditStatus } from "@repo/shared";

/**
 * Phase 6a — Dashboard landing. Single `useRecentAudits(30)` query powers
 * every widget. Rendering branches (in order):
 *   1. isLoading + no cached data → DashboardSkeleton
 *   2. isError → DashboardError banner with retry
 *   3. audits.length === 0 → DashboardEmpty CTA
 *   4. default → bento grid (hero + 4 stat cards + trend + recent)
 */
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { data, isLoading, isError, refetch, error } = useRecentAudits({
    limit: 30,
  });

  if (isLoading && !data) {
    return (
      <div className="p-6">
        <DashboardHeader title={t("title")} subtitle={t("subtitle")} ctaLabel={t("newAudit")} />
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <DashboardHeader title={t("title")} subtitle={t("subtitle")} ctaLabel={t("newAudit")} />
        <DashboardError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const audits = data?.data ?? [];

  if (audits.length === 0) {
    return (
      <div className="p-6">
        <DashboardHeader title={t("title")} subtitle={t("subtitle")} ctaLabel={t("newAudit")} />
        <DashboardEmpty />
      </div>
    );
  }

  const now = new Date();
  const stats = computeStats(audits, now);
  const { score, previousScore } = computeHeroScore(audits);
  const latestCompleted = audits.find(
    (a) => a.status === AuditStatus.COMPLETED && a.seoScore !== null,
  );

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} ctaLabel={t("newAudit")} />

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <ScoreGaugeHero
          score={score}
          previousScore={previousScore}
          contextUrl={latestCompleted?.url ?? null}
          className="col-span-12 lg:col-span-5"
        />
        <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:gap-6">
          <StatCard
            title={t("stats.auditsThisMonth")}
            description={t("stats.auditsThisMonthDesc")}
            value={stats.auditsThisMonth.value}
            delta={stats.auditsThisMonth.delta}
            deltaLabel={t("stats.vsLastMonth")}
          />
          <StatCard
            title={t("stats.avgScore")}
            description={t("stats.avgScoreDesc")}
            value={stats.avgScore.value}
            delta={stats.avgScore.delta}
            suffix="/100"
            deltaLabel={t("stats.vsLastMonth")}
          />
          <StatCard
            title={t("stats.criticalIssues")}
            description={t("stats.comingSoon")}
            value={stats.criticalIssues.value}
            delta={stats.criticalIssues.delta}
          />
          <StatCard
            title={t("stats.pdfsExported")}
            description={t("stats.comingSoon")}
            value={stats.pdfsExported.value}
            delta={stats.pdfsExported.delta}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <ScoreTrendChart audits={audits} className="col-span-12 lg:col-span-7" />
        <RecentAuditsCard audits={audits} className="col-span-12 lg:col-span-5" />
      </div>
    </div>
  );
}

function DashboardHeader({
  title,
  subtitle,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-ui text-2xl font-semibold text-fg">{title}</h1>
        <p className="font-ui text-sm text-fg-muted">{subtitle}</p>
      </div>
      <Button asChild>
        <Link href={ROUTES.auditsNew}>
          <Plus className="h-4 w-4" />
          {ctaLabel.replace(/^\+\s?/, "")}
        </Link>
      </Button>
    </div>
  );
}
