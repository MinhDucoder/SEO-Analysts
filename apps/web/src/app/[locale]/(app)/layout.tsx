"use client";

import * as React from "react";
import { AuthGuard } from "@/lib/auth/guard";
import { AppShellRouted } from "@/components/layout/app-shell-routed";
import { ExpiryBanner } from "@/components/billing/ExpiryBanner";
import { PlanStatusBadge } from "@/components/billing/PlanStatusBadge";

/**
 * Authenticated app shell. Composes:
 *   AuthGuard → redirect unauthed users to /login
 *   AppShellRouted → Sidebar + Topbar + breadcrumb auto-derived from pathname
 *
 * ExpiryBanner shows a 3-day warning strip above the main content.
 * PlanStatusBadge is mounted in the Topbar actions slot.
 *
 * Every route under `[locale]/(app)/` inherits this shell.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShellRouted topbarActions={<PlanStatusBadge />}>
        <ExpiryBanner />
        {children}
      </AppShellRouted>
    </AuthGuard>
  );
}
