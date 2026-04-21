"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { AuthenticatedUser } from "@/lib/api/types";
import { PAGE_TITLE_MAP, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Resolve the current page title from the pathname. Longest-matching-prefix
 * wins to keep ordering (e.g. `/audits/new` beats `/audits`).
 */
export function resolvePageTitle(pathname: string) {
  for (const [prefix, title] of PAGE_TITLE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return title;
    }
  }
  return { title: "", subtitle: undefined };
}

export interface HeaderProps {
  user: AuthenticatedUser | null;
  className?: string;
}

/**
 * Sticky top app bar. Left: mobile hamburger (only < lg) + page title.
 * Right: search placeholder + notification bell + "+ Audit mới" CTA.
 * Spans full width; on desktop the left padding aligns with main canvas
 * (sidebar occupies the first 256px).
 */
export function Header({ user, className }: HeaderProps) {
  const pathname = usePathname();
  const { title, subtitle } = resolvePageTitle(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/80 backdrop-blur",
        "lg:ml-64 border-b border-outline-variant/20",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-4">
        <MobileNav user={user} />

        <div className="min-w-0 flex-1">
          {title && (
            <h2 className="font-headline text-h3 font-extrabold text-on-surface tracking-tight truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-body-sm text-on-surface-variant mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <div className="relative hidden md:block">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/60 pointer-events-none" />
            <input
              type="search"
              disabled
              placeholder="Tìm kiếm (sắp có)"
              aria-label="Tìm kiếm"
              className={cn(
                "bg-surface-container-low rounded-full pl-9 pr-4 py-2 text-body-sm w-64",
                "border-none outline-none placeholder:text-on-surface-variant/50",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            disabled
            aria-label="Thông báo (sắp có)"
            title="Thông báo (sắp có)"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <Button asChild variant="primary" size="md">
            <Link href={ROUTES.auditsNew}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Audit mới</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
