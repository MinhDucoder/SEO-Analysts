"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/domain/score-ring";
import { ScoreDelta } from "@/components/domain/score-delta";
import { cn } from "@/lib/utils/cn";

export interface ScoreGaugeHeroProps {
  /** Current SEO score (0-100) or null when no completed audit exists. */
  score: number | null;
  /** Score of the previous completed audit, used to compute the delta. */
  previousScore?: number | null;
  /** Optional URL of the audit that produced this score, for context. */
  contextUrl?: string | null;
  className?: string;
}

/**
 * Pencil dashboard hero — large ScoreRing on the left, delta + meta on
 * the right. When no completed audit exists, renders a muted placeholder.
 */
export function ScoreGaugeHero({
  score,
  previousScore = null,
  contextUrl = null,
  className,
}: ScoreGaugeHeroProps) {
  const t = useTranslations("dashboard");
  const delta =
    score !== null && previousScore !== null ? score - previousScore : null;

  return (
    <Card className={cn("flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8", className)}>
      <ScoreRing score={score} size={160} className="mx-auto sm:mx-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-ui text-xs font-medium uppercase tracking-wider text-fg-muted">
          {t("heroTitle")}
        </p>
        {score === null ? (
          <p className="font-ui text-lg text-fg-muted">{t("heroNoData")}</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <ScoreDelta delta={delta} />
              <span className="font-ui text-xs text-fg-muted">
                {t("heroVsLast")}
              </span>
            </div>
            {contextUrl && (
              <p className="truncate font-mono text-xs text-fg-subtle" title={contextUrl}>
                {contextUrl}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
