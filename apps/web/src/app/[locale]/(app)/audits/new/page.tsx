"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, Globe, Network, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { useCreateAudit } from "@/lib/queries/use-audits";
import { getFriendlyMessage, isHandledByModal } from "@/lib/api/errors";
import {
  createAuditFormSchema,
  type CreateAuditFormInput,
} from "@/lib/audits/schemas";
import type { CreateAuditDto } from "@/lib/api/audits";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

interface SuccessState {
  auditId: string;
  url: string;
}

export default function AuditCreatePage() {
  const t = useTranslations("audits.create");
  const router = useRouter();
  const [success, setSuccess] = React.useState<SuccessState | null>(null);

  const form = useForm<CreateAuditFormInput>({
    resolver: zodResolver(createAuditFormSchema),
    defaultValues: {
      url: "",
      targetKeyword: "",
      mode: "single",
      maxUrls: 500,
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;
  const mode = watch("mode");
  const createMutation = useCreateAudit();

  const onSubmit = (input: CreateAuditFormInput) => {
    const body: CreateAuditDto = {
      url: input.url.trim(),
      mode: input.mode,
    };
    const keyword = input.targetKeyword?.trim();
    if (keyword) body.targetKeyword = keyword;
    if (input.mode === "site" && input.maxUrls !== undefined) {
      body.maxUrls = Number(input.maxUrls);
    }
    createMutation.mutate(body, {
      onSuccess: (res) => {
        setSuccess({ auditId: res.auditId, url: input.url });
      },
      onError: (err) => {
        // 401/403/429 (quota, feature-not-available, rate limit, account
        // lock) are already surfaced by a global modal — a toast would just
        // stack raw "status code 429" noise on top of it.
        if (isHandledByModal(err)) return;
        toast.error(getFriendlyMessage(err, t("errorGeneric")));
      },
    });
  };

  if (success) {
    return (
      <div className="space-y-5 p-6">
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <CheckCircle2 className="h-20 w-20 text-class-excellent" aria-hidden />
          <h1 className="font-ui text-2xl font-semibold text-fg">{t("successTitle")}</h1>
          <p className="max-w-md font-ui text-sm text-fg-muted">
            {t("successBody", { url: success.url })}
          </p>
          <p className="font-mono text-xs text-fg-subtle">{success.auditId}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => router.push(ROUTES.auditDetail(success.auditId))}>
              {t("viewDetail")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                setSuccess(null);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("title")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h1>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      <Card className="p-6">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">{t("urlLabel")}</Label>
            <Input
              id="url"
              type="url"
              autoComplete="url"
              placeholder={t("urlPlaceholder")}
              aria-invalid={errors.url ? "true" : "false"}
              {...register("url")}
            />
            <p className={cn("font-ui text-xs", errors.url ? "text-class-poor" : "text-fg-muted")}>
              {errors.url?.message ?? t("urlHint")}
            </p>
          </div>

          {/* Mode */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium leading-none text-fg">
              {t("modeLabel")}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ModeOption
                checked={mode === "single"}
                onSelect={() => setValue("mode", "single", { shouldValidate: true })}
                icon={<Globe className="h-5 w-5" />}
                label={t("modeSingle")}
                description={t("modeSingleDesc")}
              />
              <ModeOption
                checked={mode === "site"}
                onSelect={() => setValue("mode", "site", { shouldValidate: true })}
                icon={<Network className="h-5 w-5" />}
                label={t("modeSite")}
                description={t("modeSiteDesc")}
              />
            </div>
          </fieldset>

          {/* Max URLs (site only) */}
          {mode === "site" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxUrls">{t("maxUrlsLabel")}</Label>
              <Input
                id="maxUrls"
                type="number"
                min={1}
                max={5000}
                inputMode="numeric"
                aria-invalid={errors.maxUrls ? "true" : "false"}
                {...register("maxUrls", { valueAsNumber: true })}
              />
              <p
                className={cn(
                  "font-ui text-xs",
                  errors.maxUrls ? "text-class-poor" : "text-fg-muted",
                )}
              >
                {errors.maxUrls?.message ?? t("maxUrlsHint")}
              </p>
            </div>
          )}

          {/* Target keyword */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetKeyword">{t("keywordLabel")}</Label>
            <Input
              id="targetKeyword"
              type="text"
              placeholder={t("keywordPlaceholder")}
              aria-invalid={errors.targetKeyword ? "true" : "false"}
              {...register("targetKeyword")}
            />
            <p
              className={cn(
                "font-ui text-xs",
                errors.targetKeyword ? "text-class-poor" : "text-fg-muted",
              )}
            >
              {errors.targetKeyword?.message ?? t("keywordHint")}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button asChild variant="ghost">
              <Link href={ROUTES.audits}>← {t("title")}</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {createMutation.isPending ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ModeOption({
  checked,
  onSelect,
  icon,
  label,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-bg p-4 text-left transition-colors",
        checked
          ? "border-primary bg-primary/5"
          : "border-border hover:border-fg-muted",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          checked ? "bg-primary/15 text-primary" : "bg-bg-overlay text-fg-muted",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-ui text-sm font-semibold text-fg">{label}</span>
        <span className="font-ui text-xs text-fg-muted">{description}</span>
      </span>
    </button>
  );
}
