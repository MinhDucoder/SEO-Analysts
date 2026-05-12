"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { ROUTES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { scoreTextClass } from "@/lib/utils/classify";
import type { AuditListItem } from "@/lib/api/types";

export interface RecentAuditsCardProps {
  audits: AuditListItem[];
  /** Number of rows to render. Defaults to 5. */
  limit?: number;
  className?: string;
}

/**
 * Dashboard widget — top N recent audits. Each row is a clickable link to
 * the audit detail page. Empty state renders the muted placeholder.
 */
export function RecentAuditsCard({
  audits,
  limit = 5,
  className,
}: RecentAuditsCardProps) {
  const t = useTranslations("dashboard.recent");
  const rows = audits.slice(0, limit);

  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between">
        <h2 className="font-ui text-base font-semibold text-fg">{t("title")}</h2>
        <Link
          href={ROUTES.audits}
          className="font-ui text-xs text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center font-ui text-sm text-fg-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((audit) => (
            <li key={audit.id}>
              <Link
                href={ROUTES.auditDetail(audit.id)}
                className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-bg-overlay"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-ui text-sm font-medium text-fg" title={audit.url}>
                    {audit.domain || audit.url}
                  </span>
                  <span className="font-mono text-xs text-fg-muted">
                    {formatRelativeDate(audit.createdAt)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <AuditStatusBadge status={audit.status} />
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      scoreTextClass(audit.seoScore),
                    )}
                  >
                    {audit.seoScore !== null ? Math.round(audit.seoScore) : "—"}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 text-fg-subtle group-hover:text-fg-muted"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
