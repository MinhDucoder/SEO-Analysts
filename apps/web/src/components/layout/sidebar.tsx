"use client";

import { Wordmark } from "@/components/layout/wordmark";
import { SidebarLink } from "@/components/layout/sidebar-link";
import { UserMenuCard } from "@/components/layout/user-menu-card";
import type { AuthenticatedUser } from "@/lib/api/types";
import { SIDEBAR_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop sidebar (≥ lg). Fixed left, dark theme via --color-sidebar-*
 * tokens. Always expanded (width 64 × 4px = 256px). On smaller screens
 * the MobileNav drawer takes over — this component is `hidden lg:flex`.
 */
export interface SidebarProps {
  user: AuthenticatedUser | null;
  className?: string;
}

export function Sidebar({ user, className }: SidebarProps) {
  const items = SIDEBAR_NAV.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar-bg rounded-r-2xl shadow-xl",
        "z-40 hidden lg:flex flex-col py-6",
        className,
      )}
      aria-label="Thanh điều hướng chính"
    >
      <div className="px-6 mb-8">
        <Wordmark variant="light" />
      </div>

      <nav className="flex-1 space-y-1" aria-label="Danh mục">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="mt-auto px-4 pt-4">
        <UserMenuCard user={user} />
      </div>
    </aside>
  );
}
