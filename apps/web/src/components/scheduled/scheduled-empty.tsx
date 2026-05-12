"use client";

import { CalendarX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ScheduledEmptyProps {
  onCreate: () => void;
}

/**
 * Pencil ScheduledList/Empty — calendar-x icon + title + description + CTA
 * that opens the create-schedule dialog.
 */
export function ScheduledEmpty({ onCreate }: ScheduledEmptyProps) {
  const t = useTranslations("scheduled.empty");
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <CalendarX className="h-24 w-24 text-fg-muted" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">{t("description")}</p>
      <Button size="lg" onClick={onCreate}>
        {t("cta")}
      </Button>
    </Card>
  );
}
