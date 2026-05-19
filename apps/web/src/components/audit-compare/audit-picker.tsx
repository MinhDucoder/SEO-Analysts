"use client";

import * as React from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuditStatus } from "@repo/shared";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuditsList } from "@/lib/queries/use-audits";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { formatRelativeDate } from "@/lib/utils/format";
import { scoreTextClass } from "@/lib/utils/classify";
import { cn } from "@/lib/utils/cn";
import type { AuditListItem } from "@/lib/api/types";

export interface AuditPickerProps {
  /** Card title (e.g. "Audit A (before)"). */
  label: string;
  /** Current selection id, if any. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Other side's audit id — disabled in the list to avoid picking the same audit twice. */
  excludeId?: string | null;
}

/**
 * Two-state picker card consumed by the compare page. Shows a search +
 * scrollable list of recent **completed** audits until one is picked,
 * then collapses to a summary row with Change/Clear actions.
 */
export function AuditPicker({ label, selectedId, onSelect, excludeId }: AuditPickerProps) {
  const t = useTranslations("auditCompare");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  // Lazy-load the selected audit's row so the summary can render even
  // when the user landed on the page via URL params (audit not in the
  // visible search results).
  const selectedQuery = useAuditsList({
    page: 1,
    limit: 20,
    status: AuditStatus.COMPLETED,
  });
  const allSelectedRows = selectedQuery.data?.data ?? [];
  const selectedAudit = selectedId
    ? allSelectedRows.find((a) => a.id === selectedId) ?? null
    : null;

  const searchQuery = useAuditsList({
    page: 1,
    limit: 20,
    search: debouncedQuery.trim() || undefined,
    status: AuditStatus.COMPLETED,
  });
  const rows = searchQuery.data?.data ?? [];

  // Picked state — show summary card.
  if (selectedId && !open) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <PickerHeader label={label} />
        {selectedAudit ? (
          <AuditSummaryRow audit={selectedAudit} />
        ) : (
          <p className="font-mono text-xs text-fg-subtle">{selectedId}</p>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {t("pickerChange")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
            <X className="h-4 w-4" />
            {t("pickerClear")}
          </Button>
        </div>
      </Card>
    );
  }

  // Picker state — search + scroll list.
  return (
    <Card className="flex flex-col gap-3 p-5">
      <PickerHeader label={label} />
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("pickerSearch")}
          className="pl-9"
        />
      </div>
      <p className="font-ui text-xs text-fg-muted">{t("pickerOnlyCompleted")}</p>
      <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
        {rows.length === 0 ? (
          <li className="px-3 py-6 text-center font-ui text-sm text-fg-muted">
            {searchQuery.isLoading ? "…" : t("pickerEmpty")}
          </li>
        ) : (
          rows.map((audit) => {
            const isExcluded = excludeId === audit.id;
            const isSelected = selectedId === audit.id;
            return (
              <li key={audit.id}>
                <button
                  type="button"
                  disabled={isExcluded}
                  onClick={() => {
                    onSelect(audit.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors",
                    "hover:bg-bg-overlay/60 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-ui text-sm font-medium text-fg" title={audit.url}>
                      {audit.domain || audit.url}
                    </span>
                    <span className="font-mono text-xs text-fg-muted">
                      {formatRelativeDate(audit.createdAt)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      scoreTextClass(audit.seoScore),
                    )}
                  >
                    {audit.seoScore !== null ? Math.round(audit.seoScore) : "—"}
                  </span>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-class-excellent" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-fg-subtle" aria-hidden />
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}

function PickerHeader({ label }: { label: string }) {
  return (
    <p className="font-ui text-xs font-medium uppercase tracking-wider text-fg-muted">
      {label}
    </p>
  );
}

function AuditSummaryRow({ audit }: { audit: AuditListItem }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-ui text-sm font-semibold text-fg" title={audit.url}>
          {audit.domain || audit.url}
        </span>
        <span className="font-mono text-xs text-fg-muted">
          {formatRelativeDate(audit.createdAt)}
        </span>
      </div>
      <AuditStatusBadge status={audit.status} />
      <span
        className={cn(
          "font-mono text-base font-semibold tabular-nums",
          scoreTextClass(audit.seoScore),
        )}
      >
        {audit.seoScore !== null ? Math.round(audit.seoScore) : "—"}
      </span>
    </div>
  );
}
