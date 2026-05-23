"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { PLAN_FEATURE_ROWS } from "@/lib/billing/plan-features";
import type { PlanResponse } from "@/lib/api/billing";
import type { PlanCode } from "@repo/shared";

interface Props {
  plan: PlanResponse;
  current?: boolean;
  highlighted?: boolean;
  onSelect?: (code: PlanCode) => void;
  busy?: boolean;
}

export function PlanCard({ plan, current, highlighted, onSelect, busy }: Props) {
  const t = useTranslations("pricing");
  const tf = useTranslations("pricing.features");
  const isPaid = plan.code !== "free";

  return (
    <Card className={cn("relative", highlighted && "border-primary shadow-lg")}>
      {highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
          {t("popular")}
        </span>
      ) : null}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.displayName}</CardTitle>
          {current ? <Badge variant="info">{t("current")}</Badge> : null}
        </div>
        <div className="text-3xl font-bold">
          {plan.priceVnd === 0 ? t("free") : `${plan.priceVnd.toLocaleString("vi-VN")}đ`}
          {isPaid ? (
            <span className="text-base font-normal text-muted-foreground"> {t("perMonth")}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm">
          {PLAN_FEATURE_ROWS.map((row) => (
            <li key={row.key} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                {tf(row.key)}: {row.value(plan.features)}
              </span>
            </li>
          ))}
        </ul>
        {!current && isPaid && onSelect ? (
          <Button className="w-full" disabled={busy} onClick={() => onSelect(plan.code)}>
            {busy ? t("processing") : t("upgrade")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
