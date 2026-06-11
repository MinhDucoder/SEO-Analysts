"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

export interface CompareIssueItem {
  /** Rule id — stable React key. */
  id: string;
  /** Human-readable rule name shown to the user. */
  label: string;
}

export interface CompareIssuesProps {
  fixed: CompareIssueItem[];
  added: CompareIssueItem[];
}

/**
 * Two stacked lists — rules that flipped pass and rules that flipped
 * fail/warn between the two audits.
 */
export function CompareIssues({ fixed, added }: CompareIssuesProps) {
  const t = useTranslations("auditCompare");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <IssueListCard
        title={t("fixedTitle")}
        emptyLabel={t("fixedEmpty")}
        items={fixed}
        icon={<CheckCircle2 className="h-5 w-5 text-class-excellent" aria-hidden />}
        rowClass="bg-class-excellent/10 text-fg"
      />
      <IssueListCard
        title={t("newTitle")}
        emptyLabel={t("newEmpty")}
        items={added}
        icon={<XCircle className="h-5 w-5 text-class-poor" aria-hidden />}
        rowClass="bg-class-poor/10 text-fg"
      />
    </div>
  );
}

function IssueListCard({
  title,
  emptyLabel,
  items,
  icon,
  rowClass,
}: {
  title: string;
  emptyLabel: string;
  items: CompareIssueItem[];
  icon: React.ReactNode;
  rowClass: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-ui text-base font-semibold text-fg">{title}</h3>
        <span className="ml-auto font-mono text-sm text-fg-muted tabular-nums">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="font-ui text-sm text-fg-muted">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-md px-3 py-2 font-ui text-sm ${rowClass}`}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
