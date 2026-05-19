"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AdminUsersFilters,
  type AdminUsersFilterState,
} from "@/components/admin/admin-users-filters";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { useAdminUsers } from "@/lib/queries/use-admin";
import type { ListAdminUsersQuery } from "@/lib/api/types";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";

const DEFAULTS: AdminUsersFilterState = {
  search: "",
  role: "",
  isLocked: "",
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const [filters, setFilters] = React.useState<AdminUsersFilterState>(DEFAULTS);
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const query = useAdminUsers(toApiQuery(filters, debouncedSearch, page));

  const isFiltered =
    filters.search !== "" || filters.role !== "" || filters.isLocked !== "";

  const onChange = (next: Partial<AdminUsersFilterState>) => {
    setFilters((cur) => ({ ...cur, ...next }));
    setPage(1);
  };

  const onClear = () => {
    setFilters(DEFAULTS);
    setPage(1);
  };

  const data = query.data;

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-ui text-2xl font-semibold text-fg">
          {t("title")}
        </h1>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </header>

      <AdminUsersFilters
        value={filters}
        onChange={onChange}
        onClear={onClear}
        isFiltered={isFiltered}
      />

      {query.isLoading && !data && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="flex flex-col gap-3 p-6">
          <p className="font-ui text-sm text-class-poor">{t("error")}</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            {t("error")}
          </Button>
        </Card>
      )}

      {data && data.data.length === 0 && (
        <Card className="p-6">
          <p className="font-ui text-sm text-fg-muted">{t("empty")}</p>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <>
          <AdminUsersTable rows={data.data} />
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function toApiQuery(
  state: AdminUsersFilterState,
  search: string,
  page: number,
): ListAdminUsersQuery {
  const out: ListAdminUsersQuery = { page, limit: PAGE_SIZE };
  if (search) out.search = search;
  if (state.role) out.role = state.role;
  if (state.isLocked) out.isLocked = state.isLocked;
  return out;
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ←
      </Button>
      <span className="font-mono text-xs text-fg-muted">
        {page} / {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        →
      </Button>
    </div>
  );
}
