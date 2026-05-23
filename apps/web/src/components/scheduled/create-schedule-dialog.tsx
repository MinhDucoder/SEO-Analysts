"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ChevronRight, Globe, Loader2, Network } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateScheduledAudit } from "@/lib/queries/use-scheduled";
import { getFriendlyMessage, isHandledByModal } from "@/lib/api/errors";
import {
  createScheduledAuditFormSchema,
  type CreateScheduledAuditFormInput,
} from "@/lib/audits/schemas";
import type { CreateScheduledAuditDto } from "@/lib/api/scheduled";
import {
  SCHEDULE_PRESETS,
  DEFAULT_SCHEDULE_CRON,
  findSchedulePreset,
} from "@/lib/audits/cron-presets";
import { cn } from "@/lib/utils/cn";

export interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
}: CreateScheduleDialogProps) {
  const t = useTranslations("scheduled.create");
  const tCommon = useTranslations("common");
  const form = useForm<CreateScheduledAuditFormInput>({
    resolver: zodResolver(createScheduledAuditFormSchema),
    defaultValues: {
      url: "",
      cron: DEFAULT_SCHEDULE_CRON,
      mode: "single",
      maxUrls: 500,
      targetKeyword: "",
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
  const cron = watch("cron");
  const activePreset = findSchedulePreset(cron);
  const createMutation = useCreateScheduledAudit();

  // The advanced cron field stays hidden while a preset chip is selected.
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Reset the form whenever the dialog opens so stale state doesn't leak
  // back in after a previous successful submit.
  React.useEffect(() => {
    if (open) {
      reset();
      setShowAdvanced(false);
    }
  }, [open, reset]);

  const onSubmit = (input: CreateScheduledAuditFormInput) => {
    const body: CreateScheduledAuditDto = {
      url: input.url.trim(),
      cron: input.cron.trim(),
      mode: input.mode,
    };
    const keyword = input.targetKeyword?.trim();
    if (keyword) body.targetKeyword = keyword;
    if (input.mode === "site" && input.maxUrls !== undefined) {
      body.maxUrls = Number(input.maxUrls);
    }
    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success(t("successToast"));
        onOpenChange(false);
      },
      onError: (err) => {
        // 403 FEATURE_NOT_AVAILABLE (free plan can't schedule) / 429 quota are
        // surfaced by the global upgrade dialog. Close this form dialog so that
        // modal is visible, and skip the redundant raw toast.
        if (isHandledByModal(err)) {
          onOpenChange(false);
          return;
        }
        toast.error(getFriendlyMessage(err, t("errorToast")));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduleUrl">{t("urlLabel")}</Label>
            <Input
              id="scheduleUrl"
              type="url"
              placeholder={t("urlPlaceholder")}
              aria-invalid={errors.url ? "true" : "false"}
              {...register("url")}
            />
            {errors.url && (
              <p className="font-ui text-xs text-class-poor">{errors.url.message}</p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium leading-none text-fg">
              {t("frequencyLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCHEDULE_PRESETS.map((preset) => (
                <Chip
                  key={preset.id}
                  checked={activePreset?.id === preset.id}
                  onSelect={() =>
                    setValue("cron", preset.cron, { shouldValidate: true })
                  }
                  label={t(`presets.${preset.id}`)}
                />
              ))}
            </div>
            <p className="font-ui text-xs text-fg-muted">
              {activePreset
                ? t("frequencyHint", {
                    schedule: t(`presetDesc.${activePreset.id}`),
                  })
                : t("frequencyCustom")}
            </p>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="flex w-fit items-center gap-1 font-ui text-xs font-medium text-fg-muted transition-colors hover:text-fg"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showAdvanced && "rotate-90",
                )}
                aria-hidden
              />
              {t("advancedToggle")}
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheduleCron" className="sr-only">
                  {t("cronLabel")}
                </Label>
                <Input
                  id="scheduleCron"
                  type="text"
                  placeholder={t("cronPlaceholder")}
                  className="font-mono"
                  aria-invalid={errors.cron ? "true" : "false"}
                  {...register("cron")}
                />
                <p
                  className={cn(
                    "font-ui text-xs",
                    errors.cron ? "text-class-poor" : "text-fg-muted",
                  )}
                >
                  {errors.cron?.message ?? t("cronHint")}
                </p>
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium leading-none text-fg">
              {t("modeLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Chip
                checked={mode === "single"}
                onSelect={() => setValue("mode", "single", { shouldValidate: true })}
                icon={<Globe className="h-4 w-4" />}
                label={t("modeSingle")}
              />
              <Chip
                checked={mode === "site"}
                onSelect={() => setValue("mode", "site", { shouldValidate: true })}
                icon={<Network className="h-4 w-4" />}
                label={t("modeSite")}
              />
            </div>
          </fieldset>

          {mode === "site" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduleMaxUrls">{t("maxUrlsLabel")}</Label>
              <Input
                id="scheduleMaxUrls"
                type="number"
                min={1}
                max={5000}
                {...register("maxUrls", { valueAsNumber: true })}
              />
              {errors.maxUrls && (
                <p className="font-ui text-xs text-class-poor">
                  {errors.maxUrls.message}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduleKeyword">{t("keywordLabel")}</Label>
            <Input id="scheduleKeyword" type="text" {...register("targetKeyword")} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {createMutation.isPending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  checked,
  onSelect,
  icon,
  label,
}: {
  checked: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        icon ? "" : "justify-center",
        checked
          ? "border-primary bg-primary/5 text-fg"
          : "border-border bg-bg text-fg-muted hover:border-fg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
