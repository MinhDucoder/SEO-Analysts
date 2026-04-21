"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { Button } from "@/components/ui/button";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/auth/schemas";
import { useResetPassword } from "@/lib/auth/mutations";
import { ROUTES } from "@/lib/constants";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const router = useRouter();
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const token = resolvedParams.token;

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const { mutate, isPending } = useResetPassword({
    onSuccess: () => {
      toast.success("Đã đặt lại mật khẩu. Vui lòng đăng nhập.");
      router.push(ROUTES.login);
    },
  });

  const onSubmit = form.handleSubmit((values) =>
    mutate({ token, newPassword: values.newPassword }),
  );

  return (
    <AuthFormShell
      title="Đặt lại mật khẩu"
      description="Nhập mật khẩu mới (tối thiểu 8 ký tự)."
    >
      <FormProvider {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <AuthFormField<ResetPasswordInput>
            name="newPassword"
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
          />
          <AuthFormField<ResetPasswordInput>
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            type="password"
            autoComplete="new-password"
          />
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Đang đặt lại..." : "Đặt mật khẩu mới"}
          </Button>
        </form>
      </FormProvider>
    </AuthFormShell>
  );
}
