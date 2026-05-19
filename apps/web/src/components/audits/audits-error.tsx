"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface AuditsErrorProps {
  /** Optional request ID for support tickets. */
  requestId?: string | null;
  message?: string | null;
  onRetry: () => void;
}

/**
 * Pencil AuditList/Error500 — large triangle-alert + title +
 * description + optional request ID (mono) + retry button.
 */
export function AuditsError({ requestId, message, onRetry }: AuditsErrorProps) {
  const t = useTranslations("audits.error");

  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <TriangleAlert className="h-20 w-20 text-class-poor" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">
        {message ?? t("description")}
      </p>
      {requestId && (
        <p className="font-mono text-xs text-fg-subtle">
          {t("requestId")}: {requestId}
        </p>
      )}
      <Button onClick={onRetry} size="lg" variant="secondary">
        {t("retry")}
      </Button>
    </Card>
  );
}
