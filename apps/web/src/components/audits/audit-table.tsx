"use client";

import { Eye, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuditStatusBadge } from "./audit-status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { scoreTextClass } from "@/lib/utils/classify";
import { formatDuration, formatRelativeDate } from "@/lib/utils/format";
import type { AuditListItem } from "@/lib/api/types";

export interface AuditTableProps {
  rows: AuditListItem[];
  onDelete: (id: string) => void;
  /** True when a row's delete mutation is in flight. */
  deletingId?: string | null;
  className?: string;
}

/**
 * `/audits` data table. Columns: URL · Score · Status · Keyword ·
 * Created · Duration · Actions. Rows are wrapped in a Link to the detail
 * page; the delete button uses `stopPropagation` so it doesn't trigger
 * the row click.
 */
export function AuditTable({
  rows,
  onDelete,
  deletingId,
  className,
}: AuditTableProps) {
  const t = useTranslations("audits.table");
  const tActions = useTranslations("audits.actions");

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-bg-elevated", className)}>
      <table className="w-full min-w-[820px] text-left font-ui text-sm">
        <thead className="border-b border-border bg-bg-overlay/40 text-xs uppercase tracking-wider text-fg-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{t("url")}</th>
            <th className="px-4 py-3 font-medium">{t("score")}</th>
            <th className="px-4 py-3 font-medium">{t("status")}</th>
            <th className="px-4 py-3 font-medium">{t("keyword")}</th>
            <th className="px-4 py-3 font-medium">{t("createdAt")}</th>
            <th className="px-4 py-3 font-medium">{t("duration")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const isDeleting = deletingId === row.id;
            return (
              <tr
                key={row.id}
                className={cn(
                  "group transition-colors hover:bg-bg-overlay/60",
                  isDeleting && "opacity-50",
                )}
              >
                <td className="max-w-[280px] truncate px-4 py-3 text-fg">
                  <Link
                    href={ROUTES.auditDetail(row.id)}
                    className="hover:underline"
                    title={row.url}
                  >
                    {row.domain || row.url}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      scoreTextClass(row.seoScore),
                    )}
                  >
                    {row.seoScore !== null ? Math.round(row.seoScore) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <AuditStatusBadge status={row.status} />
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 text-fg-muted">
                  {row.targetKeyword ?? "—"}
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {formatRelativeDate(row.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-fg-muted">
                  {formatDuration(row.crawlDurationMs)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="sm" aria-label={tActions("view")}>
                      <Link href={ROUTES.auditDetail(row.id)}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(row.id)}
                      disabled={isDeleting}
                      aria-label={tActions("delete")}
                      className="text-class-poor hover:bg-class-poor/10 hover:text-class-poor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
