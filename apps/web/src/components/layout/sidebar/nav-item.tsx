"use client";

import type { LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

export interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
  /** When true, item is highlighted even if pathname doesn't match exactly. */
  active?: boolean;
  /** Strict equality (default false → uses startsWith for nested routes). */
  exact?: boolean;
}

/**
 * Pencil Component/AppShell/Sidebar/NavItem — single sidebar link. Active when
 * current locale-stripped pathname matches `href`.
 *
 * Collapsed mode hides label, centers icon. Tooltip from native `title` attr
 * (browser default — Phase 6+ may swap to Radix tooltip for design parity).
 */
export function NavItem({ href, icon: Icon, label, collapsed = false, active, exact }: NavItemProps) {
  const pathname = usePathname();
  const isActive = active ?? (exact ? pathname === href : pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md font-ui text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        collapsed ? "h-10 w-10 justify-center px-0" : "h-9 px-3",
        isActive
          ? "bg-bg-overlay text-fg"
          : "text-fg-muted hover:bg-bg-overlay hover:text-fg",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
