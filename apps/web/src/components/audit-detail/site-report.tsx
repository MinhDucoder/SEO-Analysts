"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/domain/score-ring";
import { AuditsPagination } from "@/components/audits/audits-pagination";
import { useAuditPages } from "@/lib/queries/use-audits";
import type { AuditDetail, SiteAuditSummary } from "@/lib/api/types";
import { scoreBgClass, scoreTextClass } from "@/lib/utils/classify";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 20;

export interface SiteReportProps {
  audit: AuditDetail;
  summary: SiteAuditSummary;
}

/**
 * Detail view for a completed SITE-mode audit. Single-page audits render
 * `CompletedReport`; site audits have no per-page report — instead the gateway
 * returns an aggregate (avg/median + worst pages) plus a paginated per-URL
 * table fetched on demand.
 */
export function SiteReport({ audit, summary }: SiteReportProps) {
  const t = useTranslations("auditDetail.site");
  const [page, setPage] = React.useState(1);
  const pagesQuery = useAuditPages(audit.id, page, PAGE_SIZE);
  const rows = pagesQuery.data?.data ?? [];
  const total = pagesQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero — avg score ring + URL + counts */}
      <Card className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:gap-8">
        <ScoreRing score={summary.avgScore} size={160} className="mx-auto lg:mx-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-mono text-xs text-fg-subtle" title={audit.url}>
              {audit.url}
            </p>
            <h2 className="font-ui text-2xl font-semibold text-fg">
              {audit.domain || audit.url}
            </h2>
            <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("stats.avg")} value={Math.round(summary.avgScore)} />
            <Stat label={t("stats.median")} value={summary.medianScore} />
            <Stat label={t("stats.audited")} value={summary.auditedUrls} />
            <Stat
              label={t("stats.failed")}
              value={summary.failedUrls}
              tone={summary.failedUrls > 0 ? "poor" : "muted"}
            />
          </div>
        </div>
      </Card>

      {/* Worst pages — top 10 lowest scoring URLs */}
      {summary.worstPages.length > 0 && (
        <Card className="flex flex-col gap-4 p-6">
          <h3 className="font-ui text-lg font-semibold text-fg">
            {t("worstPages.title")}
          </h3>
          <div className="flex flex-col divide-y divide-border">
            {summary.worstPages.map((p) => (
              <PageRow
                key={p.url}
                url={p.url}
                score={p.score}
                issueCount={p.issueCount}
                issuesLabel={t("table.issues", { count: p.issueCount })}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Full paginated page table */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-ui text-lg font-semibold text-fg">
            {t("table.title")}
          </h3>
          <span className="font-mono text-xs text-fg-muted">
            {t("table.totalPages", { count: total })}
          </span>
        </div>

        {pagesQuery.isLoading ? (
          <p className="font-ui text-sm text-fg-muted">{t("table.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="font-ui text-sm text-fg-muted">{t("table.empty")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {rows.map((p) => (
              <PageRow
                key={p.url}
                url={p.url}
                score={p.score}
                issueCount={p.issueCount}
                issuesLabel={t("table.issues", { count: p.issueCount })}
              />
            ))}
          </div>
        )}

        <AuditsPagination
          page={page}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "poor" | "muted";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          tone === "poor"
            ? "text-class-poor"
            : tone === "muted"
              ? "text-fg-muted"
              : "text-fg",
        )}
      >
        {value}
      </span>
      <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">
        {label}
      </span>
    </div>
  );
}

function PageRow({
  url,
  score,
  issueCount,
  issuesLabel,
}: {
  url: string;
  score: number;
  issueCount: number;
  issuesLabel: string;
}) {
  let path = url;
  try {
    const u = new URL(url);
    path = u.pathname + u.search || "/";
  } catch {
    // leave the raw URL if it doesn't parse
  }
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-mono text-sm font-semibold tabular-nums",
          scoreBgClass(score),
          scoreTextClass(score),
        )}
      >
        {score}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-w-0 flex-1 items-center gap-1.5"
        title={url}
      >
        <span className="truncate font-mono text-sm text-fg group-hover:underline">
          {path}
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
      <Badge variant={issueCount > 0 ? "warn" : "success"}>{issuesLabel}</Badge>
    </div>
  );
}
