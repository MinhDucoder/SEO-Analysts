"use client";

import * as React from "react";
import { Eye, Repeat } from "lucide-react";
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
  ReportCategoryScore,
  ReportDetail,
  ReportRuleResult,
} from "@/lib/api/types";
import { formatRelativeDate } from "@/lib/utils/format";
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

const RULE_STATUS_VARIANT: Record<RuleStatus, "success" | "error" | "warn" | "muted"> = {
  pass: "success",
  fail: "error",
  warn: "warn",
  skipped: "muted",
};

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

export interface SharedReportViewProps {
  report: ReportDetail;
}

export function SharedReportView({ report }: SharedReportViewProps) {
  const t = useTranslations("sharedReport");
  const tClass = useTranslations("sharedReport.classification");
  const tCategories = useTranslations("sharedReport.rules.categories");
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

  const isLowScore =
    report.classification === "poor" || report.classification === "fair";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-bg-overlay/40 p-3 font-ui text-xs text-fg-muted">
        <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{t("publicNotice")}</span>
      </div>

      {isLowScore && (
        <div
          className={cn(
            "rounded-lg border p-4 font-ui text-sm",
            report.classification === "poor"
              ? "border-class-poor/40 bg-class-poor/5 text-class-poor"
              : "border-class-fair/40 bg-class-fair/5 text-class-fair",
          )}
        >
          {t("lowScoreNotice")}
        </div>
      )}

      <Card className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:gap-8">
        <ScoreRing score={report.finalScore} size={160} className="mx-auto lg:mx-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-mono text-xs text-fg-subtle" title={report.url}>
            {report.url}
          </p>
          <h1 className="font-ui text-2xl font-semibold text-fg">
            {report.domain || report.url}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isLowScore ? "warn" : "success"}>
              {tClass(report.classification)}
            </Badge>
            <span className="font-ui text-xs text-fg-muted">
              {t("createdAt")}: {formatRelativeDate(report.createdAt)}
            </span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-ui text-lg font-semibold text-fg">
            {t("sections.categoryBreakdown")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView((v) => (v === "bars" ? "radar" : "bars"))}
          >
            <Repeat className="h-4 w-4" />
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

      <CwvCard
        metrics={{
          lcp: report.cwvMetrics?.lcpMs ?? null,
          cls: report.cwvMetrics?.cls ?? null,
          inp: report.cwvMetrics?.inpMs ?? null,
        }}
      />

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-ui text-lg font-semibold text-fg">
          {t("sections.rules")}
        </h2>
        {ruleGroups.length === 0 ? (
          <p className="font-ui text-sm text-fg-muted">{t("rules.empty")}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {ruleGroups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <h3 className="font-ui text-sm font-semibold uppercase tracking-wider text-fg-muted">
                  {tCategories(group.key)}
                </h3>
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

      {report.targetKeyword && (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-ui text-lg font-semibold text-fg">
            {t("sections.targetKeyword")}
          </h2>
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

      {keywordRows.length > 0 && (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-ui text-lg font-semibold text-fg">
            {t("sections.keywords")}
          </h2>
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
