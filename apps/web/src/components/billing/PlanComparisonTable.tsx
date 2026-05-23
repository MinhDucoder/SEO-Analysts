"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { PLAN_FEATURE_ROWS } from "@/lib/billing/plan-features";
import type { PlanResponse } from "@/lib/api/billing";
import type { PlanCode } from "@repo/shared";

interface Props {
  plans: PlanResponse[];
  currentPlanCode: PlanCode | null;
}

export function PlanComparisonTable({ plans, currentPlanCode }: Props) {
  const t = useTranslations("pricing");
  return (
    <section className="overflow-x-auto">
      <h2 className="mb-4 text-xl font-semibold">{t("compareTitle")}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-3 text-left font-medium text-fg-muted"></th>
            {plans.map((p) => (
              <th
                key={p.code}
                scope="col"
                className={cn(
                  "p-3 text-center font-semibold",
                  p.code === "pro" && "text-primary",
                )}
              >
                <div>{p.displayName}</div>
                {currentPlanCode === p.code ? (
                  <div className="mt-1 text-xs font-normal text-info">{t("current")}</div>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURE_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <td className="p-3 text-left text-fg-muted">{t(`features.${row.key}`)}</td>
              {plans.map((p) => (
                <td
                  key={p.code}
                  className={cn("p-3 text-center", p.code === "pro" && "bg-primary/5 font-medium")}
                >
                  {row.value(p.features)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
