"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tryRefresh } from "@/lib/api/client";
import { meFn } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/store";
import {
  DEV_BYPASS_TOKEN,
  DEV_BYPASS_USER,
  isAuthBypassEnabled,
} from "@/lib/auth/dev-bypass";
import { startMockWorker } from "@/lib/dev/mock-browser";
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

    if (isAuthBypassEnabled()) {
      // eslint-disable-next-line no-console
      console.warn(
        "[dev-bypass] AUTH BYPASS ACTIVE — fake admin user injected. " +
          "Unset NEXT_PUBLIC_DEV_BYPASS_AUTH to restore real auth.",
      );
      (async () => {
        try {
          await startMockWorker();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[dev-bypass] MSW worker failed to start", err);
        }
        useAuthStore.getState().setAuth(DEV_BYPASS_USER, DEV_BYPASS_TOKEN);
        queryClient.setQueryData(queryKeys.auth.me, DEV_BYPASS_USER);
        useAuthStore.getState().markBootstrapped();
      })();
      return;
    }

    (async () => {
      try {
        const token = await tryRefresh();
        if (!token) return;
        try {
          const me = await meFn();
          useAuthStore.getState().setAuth(me, token);
          queryClient.setQueryData(queryKeys.auth.me, me);
        } catch {
          useAuthStore.getState().clearAuth();
        }
      } finally {
        useAuthStore.getState().markBootstrapped();
      }
    })();
  }, [queryClient]);

  return null;
}
