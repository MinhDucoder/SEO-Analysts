import type { ReactNode } from "react";
import { AuthGuard } from "@/lib/auth/guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Layout for every authenticated route (`/dashboard`, `/audits`,
 * `/settings`, `/admin`). AuthGuard redirects guests to `/login`;
 * DashboardShell provides the sidebar + header + main canvas chrome.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
