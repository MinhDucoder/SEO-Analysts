"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { PasswordRules } from "@/components/auth/password-rules";
import { GoogleButton } from "@/components/auth/google-button";
import { useRegister } from "@/lib/auth/mutations";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { ROUTES } from "@/lib/constants";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const tCommon = useTranslations("auth.common");
  const [success, setSuccess] = React.useState(false);

  const mutation = useRegister({
    onSuccess: () => setSuccess(true),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreed: false,
    },
  });

  const password = watch("password");

  if (success) {
    return (
      <AuthShell title={t("successTitle")} subtitle={t("successBody")}>
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-class-excellent" aria-hidden />
          <Button asChild>
            <Link href={ROUTES.login}>{t("loginLink")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href={ROUTES.login} className="font-medium text-fg underline-offset-4 hover:underline">
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <AuthFormField
          id="fullName"
          label={tCommon("fullName")}
          autoComplete="name"
          placeholder={tCommon("fullNamePlaceholder")}
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <AuthFormField
          id="email"
          type="email"
          autoComplete="email"
          label={tCommon("email")}
          placeholder={tCommon("emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="flex flex-col gap-2">
          <AuthFormField
            id="password"
            label={tCommon("password")}
            placeholder={tCommon("passwordPlaceholder")}
            autoComplete="new-password"
            withPasswordToggle
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordRules password={password ?? ""} />
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

        <label className="flex items-start gap-2 font-ui text-sm text-fg">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border border-border accent-primary"
            {...register("agreed")}
          />
          <span>{tCommon("termsAgree")}</span>
        </label>
        {errors.agreed && (
          <p className="-mt-2 font-ui text-xs text-class-poor">{errors.agreed.message}</p>
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg px-2 font-ui text-xs text-fg-muted">
          {tCommon("orContinueWith")}
        </span>
      </div>

      <GoogleButton />
    </AuthShell>
  );
}
