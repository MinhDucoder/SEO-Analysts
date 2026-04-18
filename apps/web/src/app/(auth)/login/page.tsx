"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { useLogin } from "@/lib/auth/mutations";
import { ROUTES } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending } = useLogin({
    onSuccess: () => {
      router.push(ROUTES.dashboard);
    },
  });

  const onSubmit = form.handleSubmit((values) => mutate(values));

  return (
    <AuthFormShell
      title="Đăng nhập"
      description="Chào mừng quay trở lại"
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      <FormProvider {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <AuthFormField<LoginInput>
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ban@vidu.com"
          />
          <AuthFormField<LoginInput>
            name="password"
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href={ROUTES.forgotPassword}
              className="text-caption text-primary hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </FormProvider>
      <div className="flex items-center gap-3 py-2">
        <Separator className="flex-1" />
        <span className="text-caption text-on-surface-variant">hoặc</span>
        <Separator className="flex-1" />
      </div>
      <GoogleOAuthButton />
    </AuthFormShell>
  );
}
