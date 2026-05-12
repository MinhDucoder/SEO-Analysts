"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { scoreTextClass } from "@/lib/utils/classify";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/format";
import type { ScheduledAudit } from "@/lib/api/scheduled";

export interface ScheduledTableProps {
  rows: ScheduledAudit[];
  onTogglePause: (row: ScheduledAudit) => void;
  onDelete: (id: string) => void;
  /** id currently mid-pause/resume — disables that row's toggle button. */
  togglingId?: string | null;
  /** id currently mid-delete — dims that row. */
  deletingId?: string | null;
  className?: string;
}

export function ScheduledTable({
  rows,
  onTogglePause,
  onDelete,
  togglingId,
  deletingId,
  className,
}: ScheduledTableProps) {
  const t = useTranslations("scheduled.table");
  const tActive = useTranslations("scheduled.active");
  const tActions = useTranslations("scheduled.actions");
  const tMode = useTranslations("audits.create");

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-bg-elevated", className)}>
      <table className="w-full min-w-[820px] text-left font-ui text-sm">
        <thead className="border-b border-border bg-bg-overlay/40 text-xs uppercase tracking-wider text-fg-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{t("url")}</th>
            <th className="px-4 py-3 font-medium">{t("cron")}</th>
            <th className="px-4 py-3 font-medium">{t("mode")}</th>
            <th className="px-4 py-3 font-medium">{t("lastRun")}</th>
            <th className="px-4 py-3 font-medium">{t("lastScore")}</th>
            <th className="px-4 py-3 font-medium">{t("active")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const isDeleting = deletingId === row.id;
            const isToggling = togglingId === row.id;
            return (
              <tr
                key={row.id}
                className={cn(
                  "group transition-colors hover:bg-bg-overlay/60",
                  isDeleting && "opacity-50",
                )}
              >
                <td className="max-w-[280px] truncate px-4 py-3 text-fg" title={row.url}>
                  {row.url}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-fg-muted" title={row.cron}>
                  {row.cron}
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {row.mode === "site" ? tMode("modeSite") : tMode("modeSingle")}
                </td>
                <td
                  className="px-4 py-3 text-fg-muted"
                  title={row.lastRunAt ? formatAbsoluteDate(row.lastRunAt) : undefined}
                >
                  {row.lastRunAt ? formatRelativeDate(row.lastRunAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      scoreTextClass(row.lastScore),
                    )}
                  >
                    {row.lastScore !== null ? Math.round(row.lastScore) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={row.isActive ? "success" : "muted"}>
                    {row.isActive ? tActive("on") : tActive("off")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTogglePause(row)}
                      disabled={isToggling || isDeleting}
                      aria-label={row.isActive ? tActions("pause") : tActions("resume")}
                    >
                      {row.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
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
