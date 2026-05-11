"use client";

import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  /** Right-side action slot — buttons, dropdowns, search. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Pencil Component/AppShell/Topbar — sticky 56px tall header with breadcrumb
 * trail (left) and actions slot (right). Sits above MainCol content.
 */
export function Topbar({ breadcrumbs = [], actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-bg/80 px-6 backdrop-blur-sm",
        className,
      )}
    >
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 font-ui text-sm">
          {breadcrumbs.map((item, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <li key={`${item.label}-${i}`} className="flex items-center gap-1">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-fg-muted transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(isLast ? "font-medium text-fg" : "text-fg-muted")}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-fg-subtle" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
