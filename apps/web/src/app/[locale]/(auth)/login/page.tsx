"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { GoogleButton } from "@/components/auth/google-button";
import { useLogin } from "@/lib/auth/mutations";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { ROUTES } from "@/lib/constants";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("auth.common");
  const router = useRouter();
  const login = useLogin({
    onSuccess: () => router.push(ROUTES.dashboard),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href={ROUTES.register} className="font-medium text-fg underline-offset-4 hover:underline">
            {t("registerLink")}
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit((values) => login.mutate(values))}
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
        <div className="flex flex-col gap-1.5">
          <AuthFormField
            id="password"
            label={tCommon("password")}
            placeholder={tCommon("passwordPlaceholder")}
            autoComplete="current-password"
            withPasswordToggle
            error={errors.password?.message}
            {...register("password")}
          />
          <Link
            href={ROUTES.forgotPassword}
            className="self-end font-ui text-xs text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? t("submitting") : t("submit")}
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
