"use client";

import { AdminGuard } from "@/lib/auth/admin-guard";

/**
 * Role-gates every route under `[locale]/(app)/admin/`. The outer
 * `(app)/layout.tsx` already provides AuthGuard + AppShell, so this
 * layer adds the admin-only check on top.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
