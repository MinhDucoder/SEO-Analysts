"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface AdminUsersFilterState {
  search: string;
  role: "user" | "admin" | "";
  isLocked: "true" | "false" | "";
}

interface AdminUsersFiltersProps {
  value: AdminUsersFilterState;
  onChange: (next: Partial<AdminUsersFilterState>) => void;
  onClear: () => void;
  isFiltered: boolean;
  className?: string;
}

const SELECT_CLS =
  "h-10 rounded-md border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50";

export function AdminUsersFilters({
  value,
  onChange,
  onClear,
  isFiltered,
  className,
}: AdminUsersFiltersProps) {
  const t = useTranslations("admin.users.filters");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3",
        className,
      )}
    >
      <div className="relative min-w-[220px] flex-1">
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
        <span className="font-ui">{t("role")}</span>
        <select
          value={value.role}
          onChange={(e) =>
            onChange({
              role: e.target.value as AdminUsersFilterState["role"],
            })
          }
          className={SELECT_CLS}
        >
          <option value="">{t("roleAll")}</option>
          <option value="user">{t("roleUser")}</option>
          <option value="admin">{t("roleAdmin")}</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <span className="font-ui">{t("lock")}</span>
        <select
          value={value.isLocked}
          onChange={(e) =>
            onChange({
              isLocked: e.target.value as AdminUsersFilterState["isLocked"],
            })
          }
          className={SELECT_CLS}
        >
          <option value="">{t("lockAll")}</option>
          <option value="true">{t("lockLocked")}</option>
          <option value="false">{t("lockActive")}</option>
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
