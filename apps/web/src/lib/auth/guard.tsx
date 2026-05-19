"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";

/**
 * Redirects to /login if the user is not authenticated.
 *
 * Waits for AuthBootstrap to complete its silent-refresh attempt before
 * deciding, so authenticated reloads don't flash a /login bounce.
 *
 * Compose around AppShell-wrapped pages, not auth pages themselves.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const authed = useAuthStore((s) => s.accessToken !== null);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const router = useRouter();

  React.useEffect(() => {
    if (bootstrapped && !authed) router.replace(ROUTES.login);
  }, [authed, bootstrapped, router]);

  if (!bootstrapped || !authed) return null;
  return <>{children}</>;
}
