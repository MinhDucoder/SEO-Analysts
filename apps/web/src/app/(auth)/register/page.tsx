"use client";

import * as React from "react";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { useRegister } from "@/lib/auth/mutations";
import { ROUTES } from "@/lib/constants";

export default function RegisterPage() {
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreed: false as unknown as true,
    },
  });

  const { mutate, isPending } = useRegister({
    onSuccess: (_session, variables) => {
      setSubmittedEmail(variables.email);
    },
  });

  const onSubmit = form.handleSubmit((values) => mutate(values));

  if (submittedEmail) {
    return (
      <AuthFormShell
        title="Đã gửi email xác nhận"
        description={`Vui lòng kiểm tra hộp thư ${submittedEmail} để hoàn tất đăng ký.`}
        footer={
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          Không thấy email? Hãy kiểm tra thư rác (spam) hoặc thử đăng ký lại.
        </p>
      </AuthFormShell>
    );
  }

  const agreedError = form.formState.errors.agreed?.message as string | undefined;

  return (
    <AuthFormShell
      title="Tạo tài khoản"
      description="Miễn phí — không cần thẻ tín dụng"
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <FormProvider {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <AuthFormField<RegisterInput>
            name="fullName"
            label="Họ và tên"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
          />
          <AuthFormField<RegisterInput>
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ban@vidu.com"
          />
          <AuthFormField<RegisterInput>
            name="password"
            label="Mật khẩu"
            type="password"
            autoComplete="new-password"
            hint="Tối thiểu 8 ký tự"
          />
          <AuthFormField<RegisterInput>
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            type="password"
            autoComplete="new-password"
          />
          <label className="flex items-start gap-2 text-body-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-outline-variant"
              {...form.register("agreed")}
            />
            <span>
              Tôi đồng ý với{" "}
              <a href="/terms" className="text-primary hover:underline">
                Điều khoản sử dụng
              </a>
              .
            </span>
          </label>
          {agreedError ? <p className="text-caption text-error">{agreedError}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>
        </form>
      </FormProvider>
      <div className="flex items-center gap-3 py-2">
        <Separator className="flex-1" />
        <span className="text-caption text-on-surface-variant">hoặc</span>
        <Separator className="flex-1" />
      </div>
      <GoogleOAuthButton label="Đăng ký với Google" />
    </AuthFormShell>
  );
}
