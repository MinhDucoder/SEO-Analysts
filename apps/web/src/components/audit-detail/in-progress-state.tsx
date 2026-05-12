"use client";

import { useTranslations } from "next-intl";
import { AuditStatus } from "@repo/shared";
import { Card } from "@/components/ui/card";
import {
  StatusPipeline,
  type PipelineStep,
  type PipelineStepStatus,
} from "@/components/domain/status-pipeline";

const STAGE_ORDER: AuditStatus[] = [
  AuditStatus.PENDING,
  AuditStatus.CRAWLING,
  AuditStatus.ANALYZING,
  AuditStatus.REPORTING,
  AuditStatus.COMPLETED,
];

const STAGE_KEY: Record<AuditStatus, string> = {
  [AuditStatus.PENDING]: "pending",
  [AuditStatus.CRAWLING]: "crawling",
  [AuditStatus.ANALYZING]: "analyzing",
  [AuditStatus.REPORTING]: "reporting",
  [AuditStatus.COMPLETED]: "completed",
  [AuditStatus.FAILED]: "completed",
};

function deriveStepStatus(
  step: AuditStatus,
  current: AuditStatus,
  failed: boolean,
): PipelineStepStatus {
  const currentIdx = STAGE_ORDER.indexOf(current);
  const stepIdx = STAGE_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return failed ? "failed" : "active";
  return "pending";
}

export interface InProgressStateProps {
  status: AuditStatus;
  /** 0–100 from the latest progress event. */
  progress: number;
  stage?: string | null;
  url: string;
}

export function InProgressState({ status, progress, stage, url }: InProgressStateProps) {
  const t = useTranslations("auditDetail.inProgress");

  const steps: PipelineStep[] = STAGE_ORDER.map((s) => ({
    key: STAGE_KEY[s],
    label: t(`stage.${STAGE_KEY[s]}`),
    status: deriveStepStatus(s, status, false),
  }));

  const messageKey =
    status === AuditStatus.CRAWLING
      ? "crawling"
      : status === AuditStatus.ANALYZING
        ? "analyzing"
        : status === AuditStatus.REPORTING
          ? "reporting"
          : "pending";

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-ui text-xl font-semibold text-fg">{t("title")}</h2>
        <p className="font-mono text-xs text-fg-subtle" title={url}>
          {url}
        </p>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      <StatusPipeline steps={steps} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-ui text-sm text-fg-muted">
            {stage ?? t(`stage.${STAGE_KEY[status]}`)}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-fg">
            {clampedProgress}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-overlay">
          <div
            className="h-2 rounded-full bg-status-active transition-[width] duration-500 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <p className="font-ui text-sm text-fg-muted">{t(`messages.${messageKey}`)}</p>
      </div>
    </Card>
  );
}
