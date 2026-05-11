"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tryRefresh } from "@/lib/api/client";
import { meFn } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Once on app mount: attempt a silent refresh using the HTTP-only
 * `refresh_token` cookie. If successful, fetch /auth/me to hydrate the
 * Zustand store so authenticated pages don't flash guest UI on reload.
 */
export function AuthBootstrap() {
  const queryClient = useQueryClient();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const token = await tryRefresh();
      if (!token) return;
      try {
        const me = await meFn();
        useAuthStore.getState().setAuth(me, token);
        queryClient.setQueryData(queryKeys.auth.me, me);
      } catch {
        useAuthStore.getState().clearAuth();
      }
    })();
  }, [queryClient]);

  return null;
}
