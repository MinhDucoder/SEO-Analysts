"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Wallet, Banknote, Receipt, ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRevenue } from "@/lib/queries/use-admin";
import { exportAdminRevenueCsv } from "@/lib/api/admin";
import { formatVnd } from "@/lib/utils/format";
import {
  defaultPeriod,
  shiftPeriod,
  periodToQuery,
  formatPeriodLabel,
  type RevenuePeriodState,
  type RevenuePeriodType,
} from "@/lib/utils/revenue-period";

const TYPES: RevenuePeriodType[] = ["month", "quarter", "year"];

export function AdminRevenueSection() {
  const t = useTranslations("admin.revenue");
  const [period, setPeriod] = React.useState<RevenuePeriodState>(() => defaultPeriod());
  const query = useAdminRevenue(periodToQuery(period));
  const data = query.data;

  const typeLabel: Record<RevenuePeriodType, string> = {
    month: t("typeMonth"),
    quarter: t("typeQuarter"),
    year: t("typeYear"),
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-ui text-lg font-semibold text-fg">{t("title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {TYPES.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setPeriod((p) => ({ ...p, type: tp }))}
                className={`rounded px-3 py-1 font-ui text-sm ${
                  period.type === tp ? "bg-fg text-bg" : "text-fg-muted"
                }`}
              >
                {typeLabel[tp]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon" aria-label={t("prev")} onClick={() => setPeriod((p) => shiftPeriod(p, -1))}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-28 text-center font-ui text-sm text-fg">{formatPeriodLabel(period)}</span>
            <Button variant="secondary" size="icon" aria-label={t("next")} onClick={() => setPeriod((p) => shiftPeriod(p, 1))}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <Button variant="secondary" onClick={() => exportAdminRevenueCsv(periodToQuery(period))}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {t("export")}
          </Button>
        </div>
      </header>

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}

      {query.isError && <Card className="p-5 font-ui text-sm text-class-poor">{t("error")}</Card>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Wallet className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t("gross")}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">{formatVnd(data.grossVnd)}</span>
              <div className="flex items-center gap-2">
                <span className="font-ui text-xs text-fg-muted">
                  {t("transactions", { count: data.paidCount })}
                </span>
                {data.deltaPercent !== null && (
                  <span
                    className={`flex items-center gap-0.5 font-ui text-xs ${
                      data.deltaPercent >= 0 ? "text-class-good" : "text-class-poor"
                    }`}
                  >
                    {data.deltaPercent >= 0 ? (
                      <TrendingUp className="h-3 w-3" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3 w-3" aria-hidden />
                    )}
                    {data.deltaPercent > 0 ? "+" : ""}
                    {data.deltaPercent}% {t("deltaVsPrev")}
                  </span>
                )}
              </div>
            </Card>
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Banknote className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t("net")}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">{formatVnd(data.netVnd)}</span>
            </Card>
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Receipt className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t("vat")}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">{formatVnd(data.vatVnd)}</span>
              <span className="font-ui text-xs text-fg-muted">{t("vatLabel", { percent: data.vatPercent })}</span>
            </Card>
          </div>

          <Card className="flex flex-col gap-2 p-5">
            <span className="font-ui text-xs text-fg-muted">{t("byPlanTitle")}</span>
            {data.byPlan.length === 0 ? (
              <p className="font-ui text-sm text-fg-muted">{t("byPlanEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.byPlan.map((p) => (
                  <li key={p.planCode} className="flex items-center justify-between font-ui text-sm">
                    <span className="text-fg">{p.displayName}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-fg-muted">{t("transactions", { count: p.count })}</span>
                      <span className="font-semibold text-fg">{formatVnd(p.grossVnd)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
