import { Sidebar } from "./sidebar";
import { Topbar, type BreadcrumbItem } from "./topbar";

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  topbarActions?: React.ReactNode;
}

/**
 * Pencil Component/AppShell/Wrapper — Sidebar + (Topbar + main slot).
 * 1440×820 reference frame. Sidebar is sticky-left, Topbar is sticky-top.
 */
export function AppShell({ children, breadcrumbs, topbarActions }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar breadcrumbs={breadcrumbs} actions={topbarActions} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
