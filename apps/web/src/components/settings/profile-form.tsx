"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { useAuthStore } from "@/lib/auth/store";
import { useUpdateProfile } from "@/lib/queries/use-user";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/auth/schemas";
import { formatAbsoluteDate } from "@/lib/utils/format";

export function ProfileForm() {
  const t = useTranslations("settings.profile");
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: user?.fullName ?? "" },
  });

  // When AuthBootstrap finishes after first mount, the user payload arrives
  // late — reset the form so the field reflects the freshest value.
  React.useEffect(() => {
    if (user?.fullName) reset({ fullName: user.fullName });
  }, [user?.fullName, reset]);

  if (!user) {
    return (
      <Card className="p-6">
        <p className="font-ui text-sm text-fg-muted">{t("loading")}</p>
      </Card>
    );
  }

  const onSubmit = handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: (data) => {
        toast.success(t("success"));
        reset({ fullName: data.fullName });
      },
    });
  });

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-ui text-lg font-semibold text-fg">{t("title")}</h2>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <AuthFormField
          id="fullName"
          label={t("fullNameLabel")}
          placeholder={t("fullNamePlaceholder")}
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            value={user.email}
            readOnly
            disabled
            className="font-mono"
          />
          <p className="font-ui text-xs text-fg-muted">{t("emailHelper")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-bg-overlay/30 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-ui text-xs text-fg-muted">
              {t("roleLabel")}
            </span>
            <Badge variant={user.role === "admin" ? "info" : "muted"}>
              {user.role}
            </Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-ui text-xs text-fg-muted">
              {t("createdAtLabel")}
            </span>
            <span className="font-mono text-sm text-fg">
              {formatAbsoluteDate(user.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {update.isPending ? t("submitting") : t("submit")}
          </Button>
          {!isDirty && (
            <span className="font-ui text-xs text-fg-muted">
              {t("noChanges")}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
