"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  Search,
  TrendingUp,
  Clock,
  Award,
  UserPlus,
  ListChecks,
  Globe,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AdminStats } from "@/lib/api/types";
import { formatDuration, formatScore } from "@/lib/utils/format";

interface AdminStatsCardsProps {
  stats: AdminStats;
}

const ICONS = {
  totalUsers: Users,
  totalAudits: Search,
  successRate: TrendingUp,
  avgCrawlTime: Clock,
  avgSeoScore: Award,
} as const;

type OverviewKey = keyof typeof ICONS;

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const t = useTranslations("admin.stats");

  const overview: Array<{ key: OverviewKey; value: string }> = [
    { key: "totalUsers", value: stats.overview.totalUsers.toLocaleString() },
    { key: "totalAudits", value: stats.overview.totalAudits.toLocaleString() },
    {
      key: "successRate",
      value: `${stats.overview.successRate.toFixed(2)}%`,
    },
    {
      key: "avgCrawlTime",
      value: formatDuration(stats.overview.avgCrawlTimeMs),
    },
    { key: "avgSeoScore", value: formatScore(stats.overview.avgSeoScore) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {overview.map(({ key, value }) => {
          const Icon = ICONS[key];
          return (
            <Card key={key} className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Icon className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t(`overview.${key}`)}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">
                {value}
              </span>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2 text-fg-muted">
            <UserPlus className="h-4 w-4" aria-hidden />
            <span className="font-ui text-xs">{t("newUsersToday")}</span>
          </div>
          <span className="font-ui text-2xl font-semibold text-fg">
            {stats.newUsersToday.toLocaleString()}
          </span>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2 text-fg-muted">
            <ListChecks className="h-4 w-4" aria-hidden />
            <span className="font-ui text-xs">{t("auditsToday")}</span>
          </div>
          <span className="font-ui text-2xl font-semibold text-fg">
            {stats.auditsToday.toLocaleString()}
          </span>
        </Card>
        <Card className="flex flex-col gap-2 p-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-fg-muted">
            <Globe className="h-4 w-4" aria-hidden />
            <span className="font-ui text-xs">{t("topDomains")}</span>
          </div>
          {stats.topDomains.length === 0 ? (
            <p className="font-ui text-sm text-fg-muted">
              {t("topDomainsEmpty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stats.topDomains.slice(0, 5).map((d) => (
                <li
                  key={d.domain}
                  className="flex items-center justify-between font-ui text-sm"
                >
                  <span className="truncate font-mono text-xs text-fg">
                    {d.domain}
                  </span>
                  <span className="text-fg-muted">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
