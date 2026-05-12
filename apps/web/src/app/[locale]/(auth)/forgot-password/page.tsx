"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { useForgotPassword } from "@/lib/auth/mutations";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/auth/schemas";
import { ROUTES } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgot");
  const tCommon = useTranslations("auth.common");
  const [submitted, setSubmitted] = React.useState(false);

  const mutation = useForgotPassword({
    // Always show success — never leak whether email exists.
    onSuccess: () => setSubmitted(true),
    onError: () => setSubmitted(true),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (submitted) {
    return (
      <AuthShell title={t("successTitle")} subtitle={t("successBody")}>
        <div className="flex flex-col items-center gap-6">
          <CheckCircle2 className="h-16 w-16 text-class-excellent" aria-hidden />
          <Button asChild variant="outline" className="w-full">
            <Link href={ROUTES.login}>{t("backToLogin")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <AuthFormField
          id="email"
          type="email"
          autoComplete="email"
          label={tCommon("email")}
          placeholder={tCommon("emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("submitting") : t("submit")}
        </Button>
        <Link
          href={ROUTES.login}
          className="text-center font-ui text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </form>
    </AuthShell>
  );
}
