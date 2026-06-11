"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GeoRuleResult } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown } from "lucide-react";

const StatusIcon = ({ status }: { status: GeoRuleResult["status"] }) => {
  if (status === "pass")
    return <CheckCircle2 aria-label="pass" className="h-5 w-5 text-green-600 shrink-0" />;
  if (status === "warn")
    return <AlertTriangle aria-label="warn" className="h-5 w-5 text-amber-500 shrink-0" />;
  return <XCircle aria-label="fail" className="h-5 w-5 text-red-600 shrink-0" />;
};

export function GeoRuleCard({ rule }: { rule: GeoRuleResult }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("auditDetail.geo.rules");

  // Fallback to id when no i18n key defined yet (graceful degradation)
  let ruleName: string;
  try {
    ruleName = t(`${rule.id}.name`);
  } catch {
    ruleName = rule.id;
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <StatusIcon status={rule.status} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-fg">{ruleName}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{rule.message}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="expand details"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </Button>
      </div>
      {expanded && Object.keys(rule.evidence).length > 0 && (
        <pre className="mt-3 text-xs bg-muted p-2 rounded overflow-auto max-h-48">
          {JSON.stringify(rule.evidence, null, 2)}
        </pre>
      )}
    </Card>
  );
}
