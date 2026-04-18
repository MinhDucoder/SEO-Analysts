"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { meFn } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Google OAuth callback target. Gateway redirects here with `?token=<jwt>`
 * per apps/gateway/src/auth/controllers/auth.controller.ts:148-149.
 * Hydrate the store by stashing the token and fetching /auth/me, then send
 * the user to /dashboard. Any failure falls back to /login with a toast.
 */
export default function OAuthSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const token = params.get("token");

  const ran = React.useRef(false);
  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      toast.error("Không nhận được token. Vui lòng đăng nhập lại.");
      router.replace(ROUTES.login);
      return;
    }

    useAuthStore.setState({ accessToken: token });
    void (async () => {
      try {
        const user = await meFn();
        useAuthStore.getState().setAuth(user, token);
        queryClient.setQueryData(queryKeys.auth.me, user);
        router.replace(ROUTES.dashboard);
      } catch {
        useAuthStore.getState().clearAuth();
        toast.error("Không thể xác thực phiên. Vui lòng đăng nhập lại.");
        router.replace(ROUTES.login);
      }
    })();
  }, [queryClient, router, token]);

  return (
    <AuthFormShell title="Đang xác thực..." description="Vui lòng chờ trong giây lát.">
      <div className="flex flex-col items-center gap-2 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </AuthFormShell>
  );
}
