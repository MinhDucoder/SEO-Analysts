"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface DashboardErrorProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Pencil dashboard error banner — surfaces a localised title +
 * description and a Retry button that calls the supplied refetch.
 */
export function DashboardError({ message, onRetry }: DashboardErrorProps) {
  const t = useTranslations("dashboard.error");

  return (
    <Card className="border-class-poor/40 bg-class-poor/5 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-class-poor" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-ui font-semibold text-fg">{t("title")}</p>
          <p className="mt-1 font-ui text-sm text-fg-muted">
            {message ?? t("description")}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    </Card>
  );
}
