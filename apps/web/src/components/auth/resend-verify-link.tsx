"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/lib/auth/mutations";

/**
 * CTA button shown alongside "chưa verify" / "token expired" error banners.
 * Gateway doesn't have a dedicated `resend-verify` endpoint yet, so we
 * leverage `/auth/forgot-password` which will re-issue a verify-like email
 * if the account exists (idempotent, never leaks account existence).
 */
export function ResendVerifyLink({ email }: { email: string }) {
  const { mutate, isPending } = useForgotPassword({
    onSuccess: () => {
      toast.success("Đã gửi lại email. Vui lòng kiểm tra hộp thư.");
    },
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!email || isPending}
      onClick={() => mutate({ email })}
    >
      Gửi lại email verify
    </Button>
  );
}
