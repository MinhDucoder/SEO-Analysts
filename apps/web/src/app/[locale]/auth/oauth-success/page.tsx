"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthStore } from "@/lib/auth/store";
import { meFn } from "@/lib/api/auth";
import type { AuthenticatedUser } from "@/lib/api/types";
import { ROUTES } from "@/lib/constants";

type Phase = "loading" | "success" | "missing" | "invalid";

export default function OAuthSuccessPage() {
  const t = useTranslations("auth.oauth");
  const params = useSearchParams();
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("loading");

  React.useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setPhase("missing");
      return;
    }

    let cancelled = false;
    (async () => {
      // Seed store with token + placeholder user so ky's beforeRequest hook
      // picks up the Authorization header for the /auth/me call below. We'll
      // replace the placeholder with the real user immediately after.
      const placeholder: AuthenticatedUser = {
        id: "",
        email: "",
        fullName: "",
        role: "user",
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };
      useAuthStore.getState().setAuth(placeholder, token);

      try {
        const me = await meFn();
        if (cancelled) return;
        useAuthStore.getState().setAuth(me, token);
        setPhase("success");
        setTimeout(() => {
          if (!cancelled) router.replace(ROUTES.dashboard);
        }, 1200);
      } catch {
        if (cancelled) return;
        useAuthStore.getState().clearAuth();
        setPhase("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (phase === "loading") {
    return (
      <AuthShell title={t("loadingTitle")} subtitle={t("loadingBody")}>
        <div className="flex justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" aria-hidden />
        </div>
      </AuthShell>
    );
  }

  if (phase === "success") {
    return (
      <AuthShell title={t("successTitle")} subtitle={t("successBody")}>
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-class-excellent" aria-hidden />
        </div>
      </AuthShell>
    );
  }

  const errorBody = phase === "missing" ? t("errorMissingToken") : t("errorInvalidToken");
  return (
    <AuthShell title={t("errorTitle")} subtitle={errorBody}>
      <div className="flex flex-col items-center gap-4">
        <AlertTriangle className="h-16 w-16 text-class-poor" aria-hidden />
        <Button asChild className="w-full">
          <Link href={ROUTES.login}>{t("retry")}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
