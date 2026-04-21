"use client";

import * as React from "react";
import Link from "next/link";
import { use } from "react";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifyEmail } from "@/lib/auth/mutations";
import { ROUTES } from "@/lib/constants";

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const token = resolvedParams.token;

  const { mutate, isPending, isSuccess, isError } = useVerifyEmail();

  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current || !token) return;
    fired.current = true;
    mutate({ token });
  }, [mutate, token]);

  if (isPending || (!isSuccess && !isError)) {
    return (
      <AuthFormShell title="Đang xác nhận..." description="Vui lòng chờ trong giây lát.">
        <div className="flex flex-col items-center gap-2 py-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </AuthFormShell>
    );
  }

  if (isSuccess) {
    return (
      <AuthFormShell
        title="Xác nhận thành công"
        description="Tài khoản của bạn đã được kích hoạt."
      >
        <Button asChild size="lg" className="w-full">
          <Link href={ROUTES.login}>Đăng nhập</Link>
        </Button>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Link không hợp lệ"
      description="Link xác nhận có thể đã hết hạn hoặc đã được sử dụng."
      footer={
        <Link href={ROUTES.forgotPassword} className="font-medium text-primary hover:underline">
          Yêu cầu email mới
        </Link>
      }
    >
      <p className="text-body-sm text-on-surface-variant">
        Bạn có thể yêu cầu link xác nhận mới bằng cách nhập lại email đăng ký.
      </p>
    </AuthFormShell>
  );
}
