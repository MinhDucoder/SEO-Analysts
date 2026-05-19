"use client";

import { useTranslations } from "next-intl";
import { AuditStatus } from "@repo/shared";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = "success" | "error" | "warn" | "info" | "muted";

const VARIANT_MAP: Record<AuditStatus, BadgeVariant> = {
  [AuditStatus.PENDING]: "muted",
  [AuditStatus.CRAWLING]: "info",
  [AuditStatus.ANALYZING]: "info",
  [AuditStatus.REPORTING]: "info",
  [AuditStatus.COMPLETED]: "success",
  [AuditStatus.FAILED]: "error",
};

const I18N_KEY: Record<AuditStatus, string> = {
  [AuditStatus.PENDING]: "pending",
  [AuditStatus.CRAWLING]: "crawling",
  [AuditStatus.ANALYZING]: "analyzing",
  [AuditStatus.REPORTING]: "reporting",
  [AuditStatus.COMPLETED]: "completed",
  [AuditStatus.FAILED]: "failed",
};

export interface AuditStatusBadgeProps {
  status: AuditStatus;
  className?: string;
}

/**
 * Localised pill for the audit lifecycle. Wraps the shared `Badge`
 * primitive — variant is fixed per status, label comes from the
 * `auditStatus.<status>` i18n namespace.
 */
export function AuditStatusBadge({ status, className }: AuditStatusBadgeProps) {
  const t = useTranslations("auditStatus");
  return (
    <Badge variant={VARIANT_MAP[status]} className={className}>
      {t(I18N_KEY[status])}
    </Badge>
  );
}
