"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";

/**
 * Root landing page. Bounces to /dashboard for authenticated users and
 * /login for guests. Mounted as a client component because the auth state
 * lives in the Zustand store hydrated by AuthBootstrap on mount.
 *
 * The AuthBootstrap silent-refresh attempt may finish slightly after the
 * first render — we wait one tick by reading the store inside a layout
 * effect, then redirect. A small centered spinner covers the gap.
 */
export default function HomePage() {
  const router = useRouter();
  const authed = useAuthStore((s) => s.accessToken !== null);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  React.useEffect(() => {
    if (!bootstrapped) return;
    router.replace(authed ? ROUTES.dashboard : ROUTES.login);
  }, [authed, bootstrapped, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg text-fg-muted">
      <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
    </main>
  );
}
