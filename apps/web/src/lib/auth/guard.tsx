"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";

/**
 * Redirects to /login if the user is not authenticated.
 * Renders nothing while redirect is in flight to avoid flashing guarded
 * content.
 *
 * Compose around AppShell-wrapped pages, not auth pages themselves.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const authed = useAuthStore((s) => s.accessToken !== null);
  const router = useRouter();

  React.useEffect(() => {
    if (!authed) router.replace(ROUTES.login);
  }, [authed, router]);

  if (!authed) return null;
  return <>{children}</>;
}
