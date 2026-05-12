"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { ScoreDelta } from "@/components/domain/score-delta";
import { ScoreRing } from "@/components/domain/score-ring";
import { cn } from "@/lib/utils/cn";
import type { AuditListItem } from "@/lib/api/types";

export interface CompareSummaryProps {
  scoreDelta: number;
  before: AuditListItem | null;
  after: AuditListItem | null;
}

/**
 * Two ScoreRings side-by-side with the delta pill between them. Shown
 * at the top of /audits/compare once both audits are picked.
 */
export function CompareSummary({ scoreDelta, before, after }: CompareSummaryProps) {
  const t = useTranslations("auditCompare");
  return (
    <Card className="grid grid-cols-1 items-center gap-6 p-6 sm:grid-cols-[1fr_auto_1fr]">
      <SidePanel audit={before} title={t("pickerA")} />

      <div className="flex flex-col items-center gap-2">
        <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">
          {t("scoreDeltaLabel")}
        </span>
        <ScoreDelta delta={scoreDelta} precision={1} />
      </div>

      <SidePanel audit={after} title={t("pickerB")} />
    </Card>
  );
}

function SidePanel({ audit, title }: { audit: AuditListItem | null; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">
        {title}
      </span>
      <ScoreRing score={audit?.seoScore ?? null} size={120} />
      {audit && (
        <>
          <span
            className={cn(
              "max-w-full truncate font-ui text-sm font-semibold text-fg",
              audit.url ? "" : "text-fg-muted",
            )}
            title={audit.url}
          >
            {audit.domain || audit.url}
          </span>
        </>
      )}
    </div>
  );
}
