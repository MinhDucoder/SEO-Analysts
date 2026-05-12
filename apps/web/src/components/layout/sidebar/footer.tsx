"use client";

import { LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { cn } from "@/lib/utils/cn";

interface SidebarFooterProps {
  collapsed: boolean;
  /** When wired to auth store later, pass user info. */
  user?: { fullName: string; email: string } | null;
  onLogout?: () => void;
}

/**
 * Pencil Component/AppShell/Sidebar/Footer — avatar + user menu (logout) +
 * theme toggle + locale switcher. 56px tall.
 *
 * Collapsed: shows avatar only with menu on click. Theme/Locale moved out
 * of footer when collapsed (they get their own icon row above the avatar).
 */
export function SidebarFooter({ collapsed, user, onLogout }: SidebarFooterProps) {
  const initials = user?.fullName
    ?.split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tCommon = useTranslations("nav");

  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-t border-border p-2",
        collapsed && "items-center",
      )}
    >
      {!collapsed && (
        <div className="flex items-center gap-1">
          <ThemeToggle className="flex-1 justify-start" />
        </div>
      )}
      {!collapsed && (
        <div className="flex items-center gap-1">
          <LocaleSwitcher className="flex-1 justify-start" />
        </div>
      )}
      {collapsed && <ThemeToggle iconOnly />}
      {collapsed && <LocaleSwitcher iconOnly />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={user?.fullName ?? "Account"}
            className={cn(
              "flex items-center gap-3 rounded-md transition-colors",
              "hover:bg-bg-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed ? "h-10 w-10 justify-center p-0" : "h-10 px-2",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bg-overlay font-mono text-xs font-semibold text-fg",
                "border border-border",
              )}
              aria-hidden
            >
              {initials || <User className="h-4 w-4" />}
            </span>
            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate font-ui text-sm font-medium text-fg">
                  {user?.fullName ?? "Guest"}
                </span>
                <span className="truncate font-ui text-xs text-fg-muted">
                  {user?.email ?? "—"}
                </span>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side={collapsed ? "right" : "top"} className="w-48">
          <DropdownMenuItem className="gap-2">
            <User className="h-4 w-4" />
            <span>{tCommon("settings")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="gap-2 text-class-poor">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
