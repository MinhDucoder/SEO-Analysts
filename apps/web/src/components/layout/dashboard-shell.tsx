"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth/hooks";

/**
 * Shell for every authenticated page under `(app)` route group.
 * Wraps Sidebar (desktop) + Header (with MobileNav embedded) + main
 * canvas. AuthGuard is applied one level up in `app/(app)/layout.tsx`
 * so this client component can assume a hydrated auth store.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <Header user={user} />
      <main
        className="lg:ml-64 px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
        role="main"
      >
        {children}
      </main>
    </div>
  );
}
