"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { AppShell } from "./app-shell";
import type { BreadcrumbItem } from "./topbar";

/**
 * Strip the locale prefix that `useLocale` is internally aware of. next-intl's
 * `usePathname` already returns the unprefixed path, so we just normalise
 * trailing slashes and treat empty as "/".
 */
function normalisePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

interface NavTranslator {
  (key: string): string;
}

function deriveBreadcrumbs(pathname: string, tNav: NavTranslator): BreadcrumbItem[] {
  const path = normalisePath(pathname);
  if (path.startsWith("/dashboard")) {
    return [{ label: tNav("dashboard") }];
  }
  if (path === "/audits") {
    return [{ label: tNav("audits") }];
  }
  if (path.startsWith("/audits/new")) {
    return [
      { label: tNav("audits"), href: "/audits" },
      { label: tNav("auditsNew") },
    ];
  }
  if (path.startsWith("/audits/compare")) {
    return [
      { label: tNav("audits"), href: "/audits" },
      { label: tNav("compare") },
    ];
  }
  if (path.startsWith("/audits/")) {
    return [
      { label: tNav("audits"), href: "/audits" },
      { label: tNav("auditsDetail") },
    ];
  }
  if (path.startsWith("/scheduled")) {
    return [{ label: tNav("scheduled") }];
  }
  if (path.startsWith("/settings/profile")) {
    return [
      { label: tNav("settings"), href: "/settings/profile" },
      { label: tNav("profile") },
    ];
  }
  if (path.startsWith("/settings/password")) {
    return [
      { label: tNav("settings"), href: "/settings/profile" },
      { label: tNav("password") },
    ];
  }
  if (path.startsWith("/admin/stats")) {
    return [
      { label: tNav("admin"), href: "/admin/stats" },
      { label: tNav("stats") },
    ];
  }
  if (path.startsWith("/admin/users")) {
    return [
      { label: tNav("admin"), href: "/admin/users" },
      { label: tNav("users") },
    ];
  }
  if (path.startsWith("/admin/rules")) {
    return [
      { label: tNav("admin"), href: "/admin/rules" },
      { label: tNav("rules") },
    ];
  }
  return [];
}

export interface AppShellRoutedProps {
  children: React.ReactNode;
  /** Override the auto-derived breadcrumbs (rarely needed). */
  breadcrumbs?: BreadcrumbItem[];
  topbarActions?: React.ReactNode;
}

/**
 * AppShell wrapper that auto-derives breadcrumbs from the current pathname.
 * Used by the `(app)` layout so individual pages don't need to wire their
 * own breadcrumb props.
 */
export function AppShellRouted({
  children,
  breadcrumbs,
  topbarActions,
}: AppShellRoutedProps) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const derived = React.useMemo(
    () => breadcrumbs ?? deriveBreadcrumbs(pathname ?? "/", tNav),
    [breadcrumbs, pathname, tNav],
  );

  return (
    <AppShell breadcrumbs={derived} topbarActions={topbarActions}>
      {children}
    </AppShell>
  );
}
