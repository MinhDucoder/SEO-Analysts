"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { useAdminStats } from "@/lib/queries/use-admin";

const SELECT_CLS =
  "h-10 rounded-md border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50";

const PERIOD_OPTIONS = [7, 30, 90] as const;

export default function AdminStatsPage() {
  const t = useTranslations("admin.stats");
  const [period, setPeriod] = React.useState<number>(30);
  const query = useAdminStats(period);

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-ui text-2xl font-semibold text-fg">
            {t("title")}
          </h1>
          <p className="font-ui text-sm text-fg-muted">
            {t("subtitle", { period })}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <span className="font-ui">{t("period")}</span>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className={SELECT_CLS}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {t(`period${p}` as "period7" | "period30" | "period90")}
              </option>
            ))}
          </select>
        </label>
      </header>

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="flex flex-col gap-3 p-6">
          <p className="font-ui text-sm text-class-poor">{t("error")}</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            {t("error")}
          </Button>
        </Card>
      )}

      {query.data && <AdminStatsCards stats={query.data} />}
    </div>
  );
}
