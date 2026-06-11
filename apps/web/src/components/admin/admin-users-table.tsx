"use client";

import { Check, ChevronDown, Lock, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateUserLock, useUpdateUserRole } from "@/lib/queries/use-admin";
import { useAuthStore } from "@/lib/auth/store";
import type { AdminUser } from "@/lib/api/types";
import { formatRelativeDate } from "@/lib/utils/format";

interface AdminUsersTableProps {
  rows: AdminUser[];
}

const ROLE_OPTIONS: AdminUser["role"][] = ["user", "admin"];

export function AdminUsersTable({ rows }: AdminUsersTableProps) {
  const t = useTranslations("admin.users");
  const lock = useUpdateUserLock();
  const role = useUpdateUserRole();
  const me = useAuthStore((s) => s.user);

  const roleLabel = (r: AdminUser["role"]) =>
    r === "admin" ? t("filters.roleAdmin") : t("filters.roleUser");

  const onToggle = (user: AdminUser) => {
    const nextLocked = !user.isLocked;
    lock.mutate(
      { id: user.id, isLocked: nextLocked },
      {
        onSuccess: () => {
          toast.success(
            t(nextLocked ? "lockSuccess" : "unlockSuccess", {
              email: user.email,
            }),
          );
        },
      },
    );
  };

  const onChangeRole = (user: AdminUser, nextRole: AdminUser["role"]) => {
    if (nextRole === user.role) return;
    role.mutate(
      { id: user.id, role: nextRole },
      {
        onSuccess: () => {
          toast.success(
            t("roleChangeSuccess", {
              email: user.email,
              role: roleLabel(nextRole),
            }),
          );
        },
      },
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated">
      <table className="w-full text-left font-ui text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-overlay/30 text-xs uppercase tracking-wider text-fg-muted">
            <th className="px-4 py-2.5 font-medium">{t("table.email")}</th>
            <th className="px-4 py-2.5 font-medium">{t("table.fullName")}</th>
            <th className="px-4 py-2.5 font-medium">{t("table.role")}</th>
            <th className="px-4 py-2.5 font-medium">{t("table.audits")}</th>
            <th className="px-4 py-2.5 font-medium">{t("table.status")}</th>
            <th className="px-4 py-2.5 font-medium">{t("table.createdAt")}</th>
            <th className="px-4 py-2.5 text-right font-medium">
              {t("table.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => {
            const isSelf = me?.id === user.id;
            return (
              <tr
                key={user.id}
                className="border-b border-border last:border-0 hover:bg-bg-overlay/30"
              >
                <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                <td className="px-4 py-3">{user.fullName}</td>
                <td className="px-4 py-3">
                  {isSelf ? (
                    <Badge
                      variant={user.role === "admin" ? "info" : "muted"}
                      title={t("selfRoleHint")}
                    >
                      {roleLabel(user.role)}
                    </Badge>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={role.isPending}
                          className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                        >
                          <Badge
                            variant={user.role === "admin" ? "info" : "muted"}
                          >
                            {roleLabel(user.role)}
                          </Badge>
                          <ChevronDown
                            className="h-3.5 w-3.5 text-fg-muted"
                            aria-hidden
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {ROLE_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt}
                            onSelect={() => onChangeRole(user, opt)}
                            className="gap-2"
                          >
                            <Check
                              className={
                                opt === user.role
                                  ? "h-4 w-4"
                                  : "h-4 w-4 opacity-0"
                              }
                              aria-hidden
                            />
                            {roleLabel(opt)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {user.auditCount}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.isLocked && (
                      <Badge variant="error">{t("status.locked")}</Badge>
                    )}
                    {user.isVerified ? (
                      <Badge variant="success">{t("status.verified")}</Badge>
                    ) : (
                      <Badge variant="warn">{t("status.unverified")}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {formatRelativeDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={user.isLocked ? "secondary" : "ghost"}
                    onClick={() => onToggle(user)}
                    disabled={isSelf || lock.isPending}
                    title={isSelf ? "—" : ""}
                  >
                    {user.isLocked ? (
                      <>
                        <Unlock className="h-4 w-4" />
                        {t("actions.unlock")}
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        {t("actions.lock")}
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
