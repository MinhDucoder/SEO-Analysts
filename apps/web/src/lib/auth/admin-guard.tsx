"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";

/**
 * Role gate composed inside an `AuthGuard`-protected segment. Non-admin
 * users get bounced to /dashboard. We never render the children for a
 * non-admin so server-rendered admin payloads never reach a regular
 * user's DOM.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const router = useRouter();

  React.useEffect(() => {
    if (bootstrapped && !isAdmin) router.replace(ROUTES.dashboard);
  }, [isAdmin, bootstrapped, router]);

  if (!bootstrapped || !isAdmin) return null;
  return <>{children}</>;
}
