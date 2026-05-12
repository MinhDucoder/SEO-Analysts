"use client";

import { XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface FailedStateProps {
  url: string;
  errorMessage: string | null;
  auditId: string;
  onRerun?: () => void;
}

export function FailedState({ url, errorMessage, auditId, onRerun }: FailedStateProps) {
  const t = useTranslations("auditDetail.failed");
  const tCommon = useTranslations("common");

  return (
    <Card className="flex flex-col items-center gap-4 p-12 text-center">
      <XCircle className="h-20 w-20 text-class-poor" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h2>
      <p className="font-mono text-xs text-fg-subtle" title={url}>
        {url}
      </p>
      <p className="max-w-lg font-ui text-sm text-fg-muted">
        {errorMessage ?? t("fallbackMessage")}
      </p>
      <p className="font-mono text-xs text-fg-subtle">{auditId}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRerun && (
          <Button onClick={onRerun}>{t("rerun")}</Button>
        )}
        <Button variant="secondary" disabled>
          {tCommon("reportIssue")}
        </Button>
      </div>
    </Card>
  );
}
