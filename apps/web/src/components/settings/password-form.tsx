"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { PasswordRules } from "@/components/auth/password-rules";
import { useChangePassword } from "@/lib/queries/use-user";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/auth/schemas";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

export function PasswordForm() {
  const t = useTranslations("settings.password");
  const router = useRouter();
  const change = useChangePassword();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  const onSubmit = handleSubmit((values) => {
    change.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          reset();
          // The mutation already wiped the auth store; bounce so the
          // user re-authenticates.
          router.push(ROUTES.login);
        },
      },
    );
  });

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-ui text-lg font-semibold text-fg">{t("title")}</h2>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-class-fair/40 bg-class-fair/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-class-fair" />
        <div className="flex flex-col gap-1">
          <p className="font-ui text-sm font-semibold text-fg">
            {t("warningTitle")}
          </p>
          <p className="font-ui text-xs text-fg-muted">{t("warningBody")}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <AuthFormField
          id="currentPassword"
          label={t("currentLabel")}
          placeholder={t("currentPlaceholder")}
          autoComplete="current-password"
          withPasswordToggle
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <div className="flex flex-col gap-2">
          <AuthFormField
            id="newPassword"
            label={t("newLabel")}
            placeholder={t("newPlaceholder")}
            autoComplete="new-password"
            withPasswordToggle
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <PasswordRules password={newPassword ?? ""} />
        </div>
        <AuthFormField
          id="confirmPassword"
          label={t("confirmLabel")}
          placeholder={t("confirmPlaceholder")}
          autoComplete="new-password"
          withPasswordToggle
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
