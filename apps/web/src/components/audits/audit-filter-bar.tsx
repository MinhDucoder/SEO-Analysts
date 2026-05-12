"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuditStatus } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export type SortField = "createdAt" | "seoScore";
export type SortOrder = "asc" | "desc";

export interface AuditFilterState {
  search: string;
  status: AuditStatus | "";
  sort: SortField;
  order: SortOrder;
}

export interface AuditFilterBarProps {
  value: AuditFilterState;
  onChange: (next: Partial<AuditFilterState>) => void;
  onClear: () => void;
  /** True when any filter differs from the defaults — toggles the clear button. */
  isFiltered: boolean;
  className?: string;
}

const STATUS_OPTIONS: AuditStatus[] = [
  AuditStatus.PENDING,
  AuditStatus.CRAWLING,
  AuditStatus.ANALYZING,
  AuditStatus.REPORTING,
  AuditStatus.COMPLETED,
  AuditStatus.FAILED,
];

const SELECT_CLS =
  "h-10 rounded-md border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Filter bar for `/audits`. Search input + status select + sort + order +
 * clear. Other filters (score range, date range) can be added when the
 * design lands them — keeping the bar slim for now to avoid clutter.
 */
export function AuditFilterBar({
  value,
  onChange,
  onClear,
  isFiltered,
  className,
}: AuditFilterBarProps) {
  const t = useTranslations("audits.filters");
  const tStatus = useTranslations("auditStatus");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3",
        className,
      )}
    >
      <div className="relative min-w-[200px] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          aria-hidden
        />
        <Input
          type="search"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={t("search")}
          className="pl-9"
          aria-label={t("search")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <span className="font-ui">{t("status")}</span>
        <select
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as AuditStatus | "" })}
          className={SELECT_CLS}
        >
          <option value="">{t("statusAll")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <span className="font-ui">{t("sortBy")}</span>
        <select
          value={value.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortField })}
          className={SELECT_CLS}
        >
          <option value="createdAt">{t("sortCreatedAt")}</option>
          <option value="seoScore">{t("sortScore")}</option>
        </select>
        <select
          value={value.order}
          onChange={(e) => onChange({ order: e.target.value as SortOrder })}
          className={SELECT_CLS}
          aria-label="order"
        >
          <option value="desc">{t("orderDesc")}</option>
          <option value="asc">{t("orderAsc")}</option>
        </select>
      </label>

      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
