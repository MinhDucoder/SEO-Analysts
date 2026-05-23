"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, RotateCw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AuditStatus } from "@repo/shared";
import { HTTPError } from "ky";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { AuditDetailSkeleton } from "@/components/audit-detail/audit-detail-skeleton";
import { CompletedReport } from "@/components/audit-detail/completed-report";
import { DeleteDialog } from "@/components/audit-detail/delete-dialog";
import { FailedState } from "@/components/audit-detail/failed-state";
import { InProgressState } from "@/components/audit-detail/in-progress-state";
import { NotFoundState } from "@/components/audit-detail/not-found-state";
import { ShareDialog } from "@/components/audit-detail/share-dialog";
import { useAudit, useAuditStatus, useCreateAudit } from "@/lib/queries/use-audits";
import { useAuditRealtime } from "@/lib/ws/use-audit-realtime";
import { downloadAuditPdf } from "@/lib/api/audits";
import { ROUTES } from "@/lib/constants";
import {
  formatAbsoluteDate,
  formatDuration,
  formatRelativeDate,
} from "@/lib/utils/format";
import { useRouter } from "@/i18n/navigation";

const NON_TERMINAL = new Set<AuditStatus>([
  AuditStatus.PENDING,
  AuditStatus.CRAWLING,
  AuditStatus.ANALYZING,
  AuditStatus.REPORTING,
]);

function isHttp404(error: unknown): boolean {
  return error instanceof HTTPError && error.response.status === 404;
}

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const t = useTranslations("auditDetail");
  const router = useRouter();

  const [shareOpen, setShareOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const auditQuery = useAudit(id);
  const audit = auditQuery.data?.audit;
  const report = auditQuery.data?.report ?? null;

  // WS subscription — gives us live progress updates while the audit is
  // running. Always subscribe; the hook self-noops on terminal status.
  const realtime = useAuditRealtime(id);

  // Poll /status as a fallback (cheap; auto-stops on terminal status).
  // Disabled once the WS hook has sent us a fresh snapshot.
  const auditStatusEnabled = audit ? NON_TERMINAL.has(audit.status) : true;
  useAuditStatus(id, { enabled: auditStatusEnabled && !realtime.subscribed });

  const createMutation = useCreateAudit();

  if (!id) return <NotFoundState />;

  if (auditQuery.isError) {
    if (isHttp404(auditQuery.error)) return <NotFoundState />;
    return (
      <div className="space-y-5 p-6">
        <Card className="p-6">
          <p className="font-ui text-sm text-class-poor">
            {auditQuery.error instanceof Error
              ? auditQuery.error.message
              : t("loading")}
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => auditQuery.refetch()}
          >
            {t("actions.rerun")}
          </Button>
        </Card>
      </div>
    );
  }

  if (auditQuery.isLoading || !audit) {
    return (
      <div className="space-y-5 p-6">
        <AuditDetailSkeleton />
      </div>
    );
  }

  // Pull the freshest progress: WS event → cache → audit row.
  const liveProgress = realtime.latest?.progress ?? 0;
  const liveStage = realtime.latest?.stage ?? null;
  const effectiveStatus = realtime.latest?.status ?? audit.status;
  const isInProgress = NON_TERMINAL.has(effectiveStatus);
  const isFailed = effectiveStatus === AuditStatus.FAILED;
  const isCompleted = effectiveStatus === AuditStatus.COMPLETED && report;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { blob, filename } = await downloadAuditPdf(audit.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Free the blob URL after the click is processed.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actions.export"));
    } finally {
      setExporting(false);
    }
  };

  const handleRerun = () => {
    createMutation.mutate(
      { url: audit.url, targetKeyword: audit.targetKeyword ?? undefined },
      {
        onSuccess: (res) => {
          toast.success(t("actions.rerun"));
          router.push(ROUTES.auditDetail(res.auditId));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("actions.rerun"));
        },
      },
    );
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header — title + meta + action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-ui text-2xl font-semibold text-fg">
            {audit.domain || audit.url}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <AuditStatusBadge status={effectiveStatus} />
            <span className="font-mono" title={formatAbsoluteDate(audit.createdAt)}>
              {formatRelativeDate(audit.createdAt)}
            </span>
            {audit.completedAt && (
              <>
                <span aria-hidden>•</span>
                <span title={formatAbsoluteDate(audit.completedAt)}>
                  {t("meta.completedAt")}: {formatRelativeDate(audit.completedAt)}
                </span>
              </>
            )}
            {audit.crawlDurationMs !== null && (
              <>
                <span aria-hidden>•</span>
                <span>
                  {t("meta.duration")}: {formatDuration(audit.crawlDurationMs)}
                </span>
              </>
            )}
            {audit.crawlerType && (
              <>
                <span aria-hidden>•</span>
                <span className="font-mono">{audit.crawlerType}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCompleted && (
            <>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {t("actions.export")}
              </Button>
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
                {t("actions.share")}
              </Button>
            </>
          )}
          {(isCompleted || isFailed) && (
            <Button
              variant="ghost"
              onClick={handleRerun}
              disabled={createMutation.isPending}
            >
              <RotateCw className="h-4 w-4" />
              {t("actions.rerun")}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            className="text-class-poor hover:bg-class-poor/10 hover:text-class-poor"
          >
            <Trash2 className="h-4 w-4" />
            {t("actions.delete")}
          </Button>
        </div>
      </div>

      {/* Body — branches by status */}
      {isInProgress && (
        <InProgressState
          status={effectiveStatus}
          progress={liveProgress}
          stage={liveStage}
          url={audit.url}
        />
      )}

      {isFailed && (
        <FailedState
          auditId={audit.id}
          url={audit.url}
          errorMessage={audit.errorMessage}
          onRerun={handleRerun}
        />
      )}

      {isCompleted && report && (
        <CompletedReport audit={audit} report={report} />
      )}

      <ShareDialog auditId={audit.id} open={shareOpen} onOpenChange={setShareOpen} />
      <DeleteDialog auditId={audit.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
