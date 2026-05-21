"use client";

import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/lib/queries/use-billing";
import { PLAN_DISPLAY_NAMES_VI } from "@repo/shared";

export function PlanStatusBadge() {
  const { data } = useSubscription();
  if (!data) return null;
  const variant =
    data.planCode === "business"
      ? "success"
      : data.planCode === "pro"
        ? "info"
        : "muted";
  return <Badge variant={variant}>{PLAN_DISPLAY_NAMES_VI[data.planCode]}</Badge>;
}
