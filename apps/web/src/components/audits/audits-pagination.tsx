"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface AuditsPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pencil pagination — left-aligned "showing X-Y of Z" label + right
 * prev/next buttons. Hides itself when total <= limit (single page).
 */
export function AuditsPagination({
  page,
  limit,
  total,
  onPageChange,
  className,
}: AuditsPaginationProps) {
  const t = useTranslations("audits.pagination");
  if (total <= limit) return null;

  const lastPage = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={`flex items-center justify-between gap-3 ${className ?? ""}`}>
      <span className="font-ui text-sm text-fg-muted">
        {t("showing", { from, to, total })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("previous")}
        </Button>
        <span className="font-mono text-sm text-fg">
          {t("page", { page })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
        >
          {t("next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
