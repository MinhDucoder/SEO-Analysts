"use client";

import * as React from "react";
import { AuthGuard } from "@/lib/auth/guard";
import { AppShellRouted } from "@/components/layout/app-shell-routed";

/**
 * Authenticated app shell. Composes:
 *   AuthGuard → redirect unauthed users to /login
 *   AppShellRouted → Sidebar + Topbar + breadcrumb auto-derived from pathname
 *
 * Every route under `[locale]/(app)/` inherits this shell.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShellRouted>{children}</AppShellRouted>
    </AuthGuard>
  );
}
