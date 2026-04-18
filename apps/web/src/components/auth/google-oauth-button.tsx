"use client";

import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/constants";

/**
 * Initiates Google OAuth by full-page redirecting to gateway's
 * `GET /auth/google` endpoint. Gateway handles the provider round-trip
 * then sends the browser to `/auth/oauth-success?token=<jwt>` on our FE.
 *
 * `API_URL` typically ends in `/api/v1`. The auth endpoints live at the
 * root (no `/api/v1` prefix per gateway main.ts), so strip it before
 * appending `/auth/google`.
 */
export function GoogleOAuthButton({ label = "Đăng nhập với Google" }: { label?: string }) {
  const onClick = () => {
    const base = API_URL.replace(/\/api\/v\d+$/, "");
    window.location.href = `${base}/auth/google`;
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={onClick}
    >
      <Chrome className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
