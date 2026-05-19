"use client";

import * as React from "react";
import { Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBars, type CategoryBarRow } from "@/components/domain/category-bars";
import { CategoryRadar, type CategoryRadarPoint } from "@/components/domain/category-radar";
import { CwvCard } from "@/components/domain/cwv-card";
import { KeywordTable, type KeywordRow } from "@/components/domain/keyword-table";
import { ScoreRing } from "@/components/domain/score-ring";
import {
  RuleResultRow,
  type RuleStatus,
} from "@/components/domain/rule-result-row";
import {
  protoCategoryToKey,
  protoCheckToRuleStatus,
  type IssueCategoryKey,
} from "@/lib/audits/proto-map";
import type {
  AuditDetail,
  ReportCategoryScore,
  ReportDetail,
  ReportRuleResult,
} from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

const CATEGORY_ORDER: IssueCategoryKey[] = [
  "meta",
  "headings",
  "images",
  "links",
  "performance",
  "technical",
  "other",
];

function categoryRows(
  scores: ReportCategoryScore[],
  labelFor: (key: IssueCategoryKey) => string,
): CategoryBarRow[] {
  return scores
    .map((s) => ({ key: protoCategoryToKey(s.category), score: s.score }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.key) - CATEGORY_ORDER.indexOf(b.key))
    .map((s) => ({ label: labelFor(s.key), score: s.score }));
}

function radarPoints(
  scores: ReportCategoryScore[],
  labelFor: (key: IssueCategoryKey) => string,
): CategoryRadarPoint[] {
  return categoryRows(scores, labelFor).map((r) => ({
    label: r.label,
    score: r.score,
  }));
}

function groupRulesByCategory(rules: ReportRuleResult[]) {
  const groups = new Map<IssueCategoryKey, ReportRuleResult[]>();
  for (const r of rules) {
    const key = protoCategoryToKey(r.category);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return CATEGORY_ORDER
    .filter((k) => groups.has(k))
    .map((k) => ({ key: k, rules: groups.get(k)! }));
}

const RULE_STATUS_VARIANT: Record<RuleStatus, "success" | "error" | "warn" | "muted"> = {
  pass: "success",
  fail: "error",
  warn: "warn",
  skipped: "muted",
};

export interface CompletedReportProps {
  audit: AuditDetail;
  report: ReportDetail;
}

export function CompletedReport({ audit, report }: CompletedReportProps) {
  const t = useTranslations("auditDetail");
  const tCategories = useTranslations("auditDetail.rules.categories");
  const labelFor = React.useCallback(
    (key: IssueCategoryKey) => tCategories(key),
    [tCategories],
  );
  const [view, setView] = React.useState<"bars" | "radar">("bars");

  const bars = React.useMemo(
    () => categoryRows(report.categoryScores, labelFor),
    [report.categoryScores, labelFor],
  );
  const radar = React.useMemo(
    () => radarPoints(report.categoryScores, labelFor),
    [report.categoryScores, labelFor],
  );
  const ruleGroups = React.useMemo(
    () => groupRulesByCategory(report.ruleResults),
    [report.ruleResults],
  );

  const keywordRows: KeywordRow[] = report.keywords.map((k) => ({
    keyword: k.keyword,
    inTitle: k.inTitle,
    inH1: k.inH1,
    inMeta: k.inMetaDescription,
    inFirstParagraph: k.inFirstParagraph,
  }));

  return (
    <div className="space-y-6">
      {/* Hero — score + URL + meta */}
      <Card className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:gap-8">
        <ScoreRing score={report.finalScore} size={160} className="mx-auto lg:mx-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-mono text-xs text-fg-subtle" title={audit.url}>
            {audit.url}
          </p>
          <h2 className="font-ui text-2xl font-semibold text-fg">
            {audit.domain || audit.url}
          </h2>
          <p className="font-ui text-sm text-fg-muted">
            {report.classification}
          </p>
        </div>
      </Card>

      {/* Category breakdown with bars/radar toggle */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-ui text-lg font-semibold text-fg">
            {t("sections.categoryBreakdown")}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView((v) => (v === "bars" ? "radar" : "bars"))}
          >
            <Repeat className="h-4 w-4" />
            {t("actions.toggleView")}
          </Button>
        </div>
        {view === "bars" ? (
          <CategoryBars rows={bars} />
        ) : (
          <div className="flex justify-center">
            <CategoryRadar data={radar} size={320} />
          </div>
        )}
      </Card>

      {/* Core Web Vitals */}
      <CwvCard
        metrics={{
          lcp: report.cwvMetrics.lcpMs,
          cls: report.cwvMetrics.cls,
          inp: report.cwvMetrics.inpMs,
        }}
      />

      {/* Rules grouped by category */}
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-ui text-lg font-semibold text-fg">{t("sections.rules")}</h3>
        {ruleGroups.length === 0 ? (
          <p className="font-ui text-sm text-fg-muted">{t("rules.empty")}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {ruleGroups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <h4 className="font-ui text-sm font-semibold uppercase tracking-wider text-fg-muted">
                  {tCategories(group.key)}
                </h4>
                <div className="flex flex-col gap-2">
                  {group.rules.map((rule) => {
                    const status = protoCheckToRuleStatus(rule.status);
                    return (
                      <RuleResultRow
                        key={rule.ruleId || rule.ruleName}
                        name={rule.ruleName}
                        status={status}
                        weight={rule.weight}
                        detail={<RuleDetail rule={rule} status={status} />}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Card>

      {/* Target keyword */}
      {report.targetKeyword && (
        <Card className="flex flex-col gap-3 p-6">
          <h3 className="font-ui text-lg font-semibold text-fg">
            {t("sections.targetKeyword")}
          </h3>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xl font-semibold text-fg">
              {report.targetKeyword.keyword}
            </span>
            <span className="font-mono text-sm text-fg-muted">
              {report.targetKeyword.densityPercent.toFixed(2)}%
            </span>
            <Badge variant={report.targetKeyword.isStuffing ? "error" : "success"}>
              {report.targetKeyword.isStuffing
                ? t("targetKeyword.stuffing")
                : t("targetKeyword.ok")}
            </Badge>
          </div>
          <p className="font-ui text-sm text-fg-muted">
            {t("targetKeyword.verdict")}: {report.targetKeyword.verdict}
          </p>
        </Card>
      )}

      {/* Keyword table */}
      {keywordRows.length > 0 && (
        <Card className="flex flex-col gap-3 p-6">
          <h3 className="font-ui text-lg font-semibold text-fg">
            {t("sections.keywords")}
          </h3>
          <KeywordTable rows={keywordRows} />
        </Card>
      )}
    </div>
  );
}

function RuleDetail({
  rule,
  status,
}: {
  rule: ReportRuleResult;
  status: RuleStatus;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={RULE_STATUS_VARIANT[status]}>{status}</Badge>
        <span className="font-mono text-xs text-fg-muted">
          score {Math.round(rule.score)}/100
        </span>
      </div>
      <p className="font-ui text-sm text-fg">{rule.message}</p>
      {rule.suggestion && (
        <p
          className={cn(
            "rounded-md border border-border bg-bg-overlay/40 px-3 py-2 font-ui text-sm",
            "text-fg-muted",
          )}
        >
          💡 {rule.suggestion}
        </p>
      )}
    </div>
  );
}
