"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CreateScheduleDialog } from "@/components/scheduled/create-schedule-dialog";
import { ScheduledEmpty } from "@/components/scheduled/scheduled-empty";
import { ScheduledError } from "@/components/scheduled/scheduled-error";
import { ScheduledTable } from "@/components/scheduled/scheduled-table";
import { ScheduledTableSkeleton } from "@/components/scheduled/scheduled-table-skeleton";
import {
  useDeleteScheduledAudit,
  usePauseScheduledAudit,
  useResumeScheduledAudit,
  useScheduledAudits,
} from "@/lib/queries/use-scheduled";
import type { ScheduledAudit } from "@/lib/api/scheduled";

export default function ScheduledPage() {
  const t = useTranslations("scheduled");
  const tDelete = useTranslations("scheduled.delete");
  const tToggle = useTranslations("scheduled.toggle");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data, isLoading, isError, error, refetch } = useScheduledAudits();
  const pauseMutation = usePauseScheduledAudit();
  const resumeMutation = useResumeScheduledAudit();
  const deleteMutation = useDeleteScheduledAudit();

  const handleToggle = (row: ScheduledAudit) => {
    const mutation = row.isActive ? pauseMutation : resumeMutation;
    const successKey = row.isActive ? "pauseSuccess" : "resumeSuccess";
    mutation.mutate(row.id, {
      onSuccess: () => toast.success(tToggle(successKey)),
      onError: () => toast.error(tToggle("fail")),
    });
  };

  const handleDelete = (id: string) => {
    if (typeof window !== "undefined" && !window.confirm(tDelete("confirm"))) {
      return;
    }
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(tDelete("success")),
      onError: () => toast.error(tDelete("fail")),
    });
  };

  const rows = data ?? [];
  const togglingId = pauseMutation.isPending
    ? pauseMutation.variables ?? null
    : resumeMutation.isPending
      ? resumeMutation.variables ?? null
      : null;
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h1>
          <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("new").replace(/^\+\s?/, "")}
        </Button>
      </div>

      {isError ? (
        <ScheduledError
          message={error instanceof Error ? error.message : null}
          onRetry={() => refetch()}
        />
      ) : isLoading && !data ? (
        <ScheduledTableSkeleton />
      ) : rows.length === 0 ? (
        <ScheduledEmpty onCreate={() => setDialogOpen(true)} />
      ) : (
        <ScheduledTable
          rows={rows}
          onTogglePause={handleToggle}
          onDelete={handleDelete}
          togglingId={togglingId}
          deletingId={deletingId}
        />
      )}

      <CreateScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
