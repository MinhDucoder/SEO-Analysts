"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logoutFn, meFn } from "@/lib/api/auth";
import { tryRefresh } from "@/lib/api/client";
import type { AuthenticatedUser } from "@/lib/api/types";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Selector hook for the auth store. Re-renders only when user/token change.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  return {
    user,
    accessToken,
    isAuthenticated: accessToken !== null,
    isAdmin: user?.role === "admin",
  };
}

/**
 * Logout mutation: calls gateway, clears the store, pushes `/login`.
 * Toasts "Đã đăng xuất" on success; silent on error (cookie still cleared
 * client-side).
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutFn,
    onSettled: () => {
      useAuthStore.getState().clearAuth();
      queryClient.removeQueries({ queryKey: queryKeys.auth.me });
      router.push(ROUTES.login);
    },
    onSuccess: () => {
      toast.success("Đã đăng xuất");
    },
  });
}

/**
 * `useQuery` for the current user. Enabled only when `accessToken` is set so
 * we don't spam `/auth/me` for guest visitors.
 */
export function useMeQuery() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<AuthenticatedUser>({
    queryKey: queryKeys.auth.me,
    queryFn: meFn,
    enabled: accessToken !== null,
    staleTime: 5 * 60 * 1_000,
  });
}

/**
 * One-shot boot: if there's no access token but the browser still holds a
 * refresh_token cookie, silently refresh and fetch `/auth/me` so the app
 * renders as authenticated instead of bouncing to `/login`.
 *
 * Idempotent across re-renders thanks to the module-scope `booted` flag.
 */
let booted = false;

export function useAuthBootstrap() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (booted) return;
    booted = true;

    const store = useAuthStore.getState();
    if (store.accessToken) return;

    void (async () => {
      const newToken = await tryRefresh();
      if (!newToken) return;

      useAuthStore.setState({ accessToken: newToken });
      try {
        const user = await meFn();
        store.setAuth(user, newToken);
        queryClient.setQueryData(queryKeys.auth.me, user);
      } catch {
        // Leave only the access token; a later /auth/me retry will hydrate the user.
      }
    })();
  }, [queryClient]);
}
