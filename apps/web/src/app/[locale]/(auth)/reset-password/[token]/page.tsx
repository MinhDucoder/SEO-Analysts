"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { PasswordRules } from "@/components/auth/password-rules";
import { useResetPassword } from "@/lib/auth/mutations";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/auth/schemas";
import { ROUTES } from "@/lib/constants";
import { HTTPError } from "ky";

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string; locale: string };
}) {
  const t = useTranslations("auth.reset");
  const tCommon = useTranslations("auth.common");

  const token = params.token || "";
  const [success, setSuccess] = React.useState(false);
  const [invalidToken, setInvalidToken] = React.useState(false);

  const mutation = useResetPassword({
    onSuccess: () => setSuccess(true),
    onError: (err) => {
      if (err instanceof HTTPError && (err.response.status === 400 || err.response.status === 404)) {
        setInvalidToken(true);
      }
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword");

  if (!token) {
    return (
      <AuthShell title={t("missingTokenTitle")} subtitle={t("missingTokenBody")}>
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-16 w-16 text-class-fair" aria-hidden />
          <Button asChild variant="outline" className="w-full">
            <Link href={ROUTES.forgotPassword}>{tCommon("email")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (invalidToken) {
    return (
      <AuthShell title={t("invalidTokenTitle")} subtitle={t("invalidTokenBody")}>
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-16 w-16 text-class-poor" aria-hidden />
          <Button asChild className="w-full">
            <Link href={ROUTES.forgotPassword}>{t("loginCta")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell title={t("successTitle")} subtitle={t("successBody")}>
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-class-excellent" aria-hidden />
          <Button asChild className="w-full">
            <Link href={ROUTES.login}>{t("loginCta")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <form
        onSubmit={handleSubmit((values) =>
          mutation.mutate({ token, newPassword: values.newPassword }),
        )}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <AuthFormField
            id="newPassword"
            label={t("newPassword")}
            placeholder={tCommon("passwordPlaceholder")}
            autoComplete="new-password"
            withPasswordToggle
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <PasswordRules password={newPassword ?? ""} />
        </div>
        <AuthFormField
          id="confirmPassword"
          label={tCommon("confirmPassword")}
          placeholder={tCommon("confirmPasswordPlaceholder")}
          autoComplete="new-password"
          withPasswordToggle
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
