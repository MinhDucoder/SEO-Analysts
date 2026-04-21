"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  GitCompare,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { SidebarNavItem } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<SidebarNavItem["iconName"], LucideIcon> = {
  LayoutDashboard,
  Search,
  GitCompare,
  Shield,
  Settings,
};

/**
 * A single sidebar nav row. Active state matches when the current pathname
 * equals href OR is a direct sub-route (`/audits/123` still highlights
 * "Audit"). Home-like routes should match exactly in the consumer —
 * SIDEBAR_NAV currently doesn't include a home route so the prefix match
 * is safe.
 */
export interface SidebarLinkProps {
  item: SidebarNavItem;
  onNavigate?: () => void;
}

export function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Strip query string off href for prefix comparison ("/audits?compare=1").
  const basePath = href.split("?")[0];
  if (basePath === "/") return pathname === "/";
  return pathname === basePath || pathname.startsWith(basePath + "/");
}

export function SidebarLink({ item, onNavigate }: SidebarLinkProps) {
  const pathname = usePathname();
  const Icon = ICONS[item.iconName];
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 mx-2 my-1 px-4 py-3 rounded-xl transition-all duration-200",
        "font-medium text-body-sm",
        active
          ? "bg-sidebar-bg-active text-sidebar-text-active shadow-primary active:scale-95"
          : "text-sidebar-text hover:text-sidebar-text-hover hover:bg-slate-800",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
