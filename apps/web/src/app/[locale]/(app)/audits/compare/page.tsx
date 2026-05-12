"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GitCompare, TriangleAlert } from "lucide-react";
import { AuditStatus } from "@repo/shared";
import { AuditPicker } from "@/components/audit-compare/audit-picker";
import { CompareIssues } from "@/components/audit-compare/compare-issues";
import { CompareRuleDeltaRow } from "@/components/audit-compare/compare-rule-delta-row";
import { CompareSummary } from "@/components/audit-compare/compare-summary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditsList, useCompareAudits } from "@/lib/queries/use-audits";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AuditListItem, CompareRuleDelta } from "@/lib/api/types";

function buildQuery(audit1: string | null, audit2: string | null): string {
  const params = new URLSearchParams();
  if (audit1) params.set("audit1", audit1);
  if (audit2) params.set("audit2", audit2);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function AuditComparePage() {
  return (
    <React.Suspense fallback={<CompareLoading />}>
      <AuditCompareInner />
    </React.Suspense>
  );
}

function CompareLoading() {
  return (
    <div className="space-y-5 p-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-lg" />
        <Skeleton className="h-60 rounded-lg" />
      </div>
    </div>
  );
}

function AuditCompareInner() {
  const t = useTranslations("auditCompare");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const audit1 = searchParams.get("audit1");
  const audit2 = searchParams.get("audit2");

  const setIds = React.useCallback(
    (next1: string | null, next2: string | null) => {
      const target = `${pathname}${buildQuery(next1, next2)}`;
      router.replace(target);
    },
    [pathname, router],
  );

  const compareQuery = useCompareAudits(audit1, audit2);

  // Pull each audit's row out of the COMPLETED list so we can render
  // the URL/score in the summary panel. Cheap and shared with the
  // pickers' search cache.
  const listQuery = useAuditsList({
    page: 1,
    limit: 50,
    status: AuditStatus.COMPLETED,
  });
  const allRows = listQuery.data?.data ?? [];
  const beforeAudit = audit1 ? allRows.find((a) => a.id === audit1) ?? null : null;
  const afterAudit = audit2 ? allRows.find((a) => a.id === audit2) ?? null : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-ui text-2xl font-semibold text-fg">
          <GitCompare className="h-6 w-6" aria-hidden />
          {t("title")}
        </h1>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AuditPicker
          label={t("pickerA")}
          selectedId={audit1}
          excludeId={audit2}
          onSelect={(id) => setIds(id, audit2)}
        />
        <AuditPicker
          label={t("pickerB")}
          selectedId={audit2}
          excludeId={audit1}
          onSelect={(id) => setIds(audit1, id)}
        />
      </div>

      {!audit1 || !audit2 ? (
        <Card className="p-12 text-center font-ui text-sm text-fg-muted">
          {t("instructions")}
        </Card>
      ) : compareQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : compareQuery.isError ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <TriangleAlert className="h-16 w-16 text-class-poor" aria-hidden />
          <h2 className="font-ui text-xl font-semibold text-fg">{t("errorTitle")}</h2>
          <p className="max-w-md font-ui text-sm text-fg-muted">{t("errorBody")}</p>
          <Button variant="secondary" onClick={() => compareQuery.refetch()}>
            {t("retry")}
          </Button>
        </Card>
      ) : compareQuery.data ? (
        <CompareBody
          before={beforeAudit}
          after={afterAudit}
          scoreDelta={compareQuery.data.scoreDelta}
          ruleDeltas={compareQuery.data.ruleDeltas}
          fixed={compareQuery.data.issuesFixed}
          added={compareQuery.data.issuesNew}
        />
      ) : null}
    </div>
  );
}

function CompareBody({
  before,
  after,
  scoreDelta,
  ruleDeltas,
  fixed,
  added,
}: {
  before: AuditListItem | null;
  after: AuditListItem | null;
  scoreDelta: number;
  ruleDeltas: CompareRuleDelta[];
  fixed: string[];
  added: string[];
}) {
  const t = useTranslations("auditCompare");
  return (
    <div className="space-y-5">
      <CompareSummary scoreDelta={scoreDelta} before={before} after={after} />

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-ui text-lg font-semibold text-fg">{t("rulesTitle")}</h2>
        {ruleDeltas.length === 0 ? (
          <p className="font-ui text-sm text-fg-muted">{t("rulesEmpty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ruleDeltas.map((delta) => (
              <CompareRuleDeltaRow key={delta.ruleId || delta.ruleName} delta={delta} />
            ))}
          </div>
        )}
      </Card>

      <CompareIssues fixed={fixed} added={added} />
    </div>
  );
}
