"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ScheduledErrorProps {
  message?: string | null;
  onRetry: () => void;
}

export function ScheduledError({ message, onRetry }: ScheduledErrorProps) {
  const t = useTranslations("scheduled.error");
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <TriangleAlert className="h-20 w-20 text-class-poor" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">
        {message ?? t("description")}
      </p>
      <Button onClick={onRetry} size="lg" variant="secondary">
        {t("retry")}
      </Button>
    </Card>
  );
}
