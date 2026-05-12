"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  AuditFilterBar,
  type AuditFilterState,
  type SortField,
  type SortOrder,
} from "@/components/audits/audit-filter-bar";
import { AuditTable } from "@/components/audits/audit-table";
import { AuditTableSkeleton } from "@/components/audits/audit-table-skeleton";
import { AuditsEmpty } from "@/components/audits/audits-empty";
import { AuditsError } from "@/components/audits/audits-error";
import { AuditsPagination } from "@/components/audits/audits-pagination";
import { useAuditsList, useDeleteAudit } from "@/lib/queries/use-audits";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { ROUTES } from "@/lib/constants";
import type { ListAuditsParams } from "@/lib/api/audits";
import { HTTPError } from "ky";

const DEFAULT_LIMIT = 20;

const DEFAULT_FILTERS: AuditFilterState = {
  search: "",
  status: "",
  sort: "createdAt" as SortField,
  order: "desc" as SortOrder,
};

function buildQuery(
  filters: AuditFilterState,
  debouncedSearch: string,
  page: number,
): ListAuditsParams {
  const out: ListAuditsParams = {
    page,
    limit: DEFAULT_LIMIT,
    sort: filters.sort,
    order: filters.order,
  };
  if (debouncedSearch.trim()) out.search = debouncedSearch.trim();
  if (filters.status) out.status = filters.status;
  return out;
}

function isFiltered(filters: AuditFilterState): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.status !== "" ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.order !== DEFAULT_FILTERS.order
  );
}

export default function AuditsPage() {
  const t = useTranslations("audits");
  const tDelete = useTranslations("audits.delete");

  const [filters, setFilters] = React.useState<AuditFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  // Reset to page 1 whenever filters change (excluding page itself).
  const filtersSignature = `${debouncedSearch}|${filters.status}|${filters.sort}|${filters.order}`;
  React.useEffect(() => {
    setPage(1);
  }, [filtersSignature]);

  const query = buildQuery(filters, debouncedSearch, page);
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditsList(query);
  const deleteMutation = useDeleteAudit();

  const handleDelete = (id: string) => {
    if (typeof window !== "undefined" && !window.confirm(tDelete("confirm"))) {
      return;
    }
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(tDelete("success")),
      onError: () => toast.error(tDelete("fail")),
    });
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const filtered = isFiltered(filters);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h1>
          <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href={ROUTES.auditsNew}>
            <Plus className="h-4 w-4" />
            {t("new").replace(/^\+\s?/, "")}
          </Link>
        </Button>
      </div>

      <AuditFilterBar
        value={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onClear={handleClearFilters}
        isFiltered={filtered}
      />

      {isError ? (
        <AuditsError
          requestId={extractRequestId(error)}
          message={error instanceof Error ? error.message : null}
          onRetry={() => refetch()}
        />
      ) : isLoading && !data ? (
        <AuditTableSkeleton rows={DEFAULT_LIMIT / 2} />
      ) : rows.length === 0 ? (
        <AuditsEmpty filtered={filtered} onClearFilters={handleClearFilters} />
      ) : (
        <>
          <div className={isFetching ? "opacity-70 transition-opacity" : undefined}>
            <AuditTable
              rows={rows}
              onDelete={handleDelete}
              deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
            />
          </div>
          <AuditsPagination
            page={page}
            limit={DEFAULT_LIMIT}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function extractRequestId(error: unknown): string | null {
  if (error instanceof HTTPError) {
    return error.response.headers.get("x-request-id");
  }
  return null;
}
