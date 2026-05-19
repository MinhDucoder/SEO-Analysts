"use client";

import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScoreDelta } from "@/components/domain/score-delta";
import { protoCheckToRuleStatus } from "@/lib/audits/proto-map";
import type { CompareRuleDelta } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

const STATUS_VARIANT: Record<
  ReturnType<typeof protoCheckToRuleStatus>,
  "success" | "error" | "warn" | "muted"
> = {
  pass: "success",
  fail: "error",
  warn: "warn",
  skipped: "muted",
};

function statusKey(
  status: CompareRuleDelta["statusBefore"],
): ReturnType<typeof protoCheckToRuleStatus> {
  if (status === "UNSPECIFIED") return "skipped";
  return protoCheckToRuleStatus(status);
}

export interface CompareRuleDeltaRowProps {
  delta: CompareRuleDelta;
  className?: string;
}

export function CompareRuleDeltaRow({ delta, className }: CompareRuleDeltaRowProps) {
  const before = statusKey(delta.statusBefore);
  const after = statusKey(delta.statusAfter);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elevated px-4 py-3",
        className,
      )}
    >
      <span className="flex-1 truncate font-ui text-sm font-medium text-fg" title={delta.ruleName}>
        {delta.ruleName}
      </span>
      <div className="flex items-center gap-2 text-xs">
        <Badge variant={STATUS_VARIANT[before]}>{before}</Badge>
        <ArrowRight className="h-3.5 w-3.5 text-fg-muted" aria-hidden />
        <Badge variant={STATUS_VARIANT[after]}>{after}</Badge>
      </div>
      <ScoreDelta delta={delta.scoreDelta} precision={0} />
    </div>
  );
}
