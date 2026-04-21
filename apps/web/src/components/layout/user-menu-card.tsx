"use client";

import Link from "next/link";
import { LogOut, Settings, ShieldCheck, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthenticatedUser } from "@/lib/api/types";
import { useLogout } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Sidebar footer card: avatar (initials) + fullName + role label + caret
 * trigger that opens a dropdown with Profile / Security / Logout items.
 * Role label is "Admin" for admins, "Người dùng" otherwise.
 */
export interface UserMenuCardProps {
  user: AuthenticatedUser | null;
  className?: string;
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  const combined = (first + last).toUpperCase();
  return combined || "?";
}

export function UserMenuCard({ user, className }: UserMenuCardProps) {
  const logout = useLogout();

  if (!user) {
    // While the store is hydrating, render a placeholder so the sidebar
    // footer doesn't collapse. AuthBootstrap completes before any guarded
    // page renders, so this is transient.
    return (
      <div
        className={cn(
          "bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3",
          className,
        )}
        aria-busy="true"
      >
        <div className="h-10 w-10 rounded-full bg-slate-700" />
        <div className="h-2.5 w-20 rounded bg-slate-700" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "bg-slate-800/50 hover:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 w-full text-left transition-colors",
            className,
          )}
          aria-label="Mở menu tài khoản"
        >
          <div className="h-10 w-10 rounded-full bg-primary-container/25 text-sidebar-text-active flex items-center justify-center font-headline font-bold text-caption">
            {initialsOf(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-text-active text-caption font-bold leading-tight truncate">
              {user.fullName}
            </p>
            <p className="text-micro text-slate-500 mt-0.5">
              {user.role === "admin" ? "Admin" : "Người dùng"}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={ROUTES.settingsProfile} className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Hồ sơ</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.settingsSecurity} className="cursor-pointer">
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>Bảo mật</span>
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href={ROUTES.adminUsers} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Quản trị</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            logout.mutate();
          }}
          className="cursor-pointer text-error focus:text-error"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
