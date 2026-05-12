"use client";

import { Gauge } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Layout for auth pages: public header (logo + theme/locale toggles) +
 * centered card with title/subtitle/body, optional footer link row.
 */
export function AuthShell({ title, subtitle, children, footer, className }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2 text-fg">
          <Gauge className="h-6 w-6" aria-hidden />
          <span className="font-ui text-base font-semibold">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle iconOnly />
          <LocaleSwitcher iconOnly />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className={cn("flex w-full max-w-md flex-col gap-6", className)}>
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="font-ui text-2xl font-semibold text-fg">{title}</h1>
            {subtitle && <p className="font-ui text-sm text-fg-muted">{subtitle}</p>}
          </div>
          {children}
          {footer && (
            <div className="text-center font-ui text-sm text-fg-muted">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}
