"use client";

import * as React from "react";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/auth/schemas";
import { useForgotPassword } from "@/lib/auth/mutations";
import { ROUTES } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const { mutate, isPending } = useForgotPassword({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      // Never leak account existence — show the same success state on any error.
      setSubmitted(true);
    },
  });

  const onSubmit = form.handleSubmit((values) => mutate(values));

  if (submitted) {
    return (
      <AuthFormShell
        title="Đã gửi email"
        description="Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu."
        footer={
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          Vui lòng kiểm tra hộp thư (bao gồm cả thư rác) trong vài phút tới.
        </p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Quên mật khẩu"
      description="Nhập email để nhận link đặt lại mật khẩu."
      footer={
        <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      <FormProvider {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <AuthFormField<ForgotPasswordInput>
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ban@vidu.com"
          />
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Đang gửi..." : "Gửi link đặt lại"}
          </Button>
        </form>
      </FormProvider>
    </AuthFormShell>
  );
}
