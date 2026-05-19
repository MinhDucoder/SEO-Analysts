"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SharedErrorProps {
  onRetry?: () => void;
}

/**
 * Generic error state for non-404 failures (5xx, network, parse). Offers
 * a manual retry — react-query already retried twice silently before the
 * caller decided to render us.
 */
export function SharedError({ onRetry }: SharedErrorProps) {
  const t = useTranslations("sharedReport");
  return (
    <Card className="flex flex-col items-center gap-4 p-12 text-center">
      <TriangleAlert className="h-16 w-16 text-class-poor" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("errorTitle")}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">{t("errorBody")}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </Card>
  );
}
