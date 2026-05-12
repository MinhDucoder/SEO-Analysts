"use client";

import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

/**
 * Pencil AuditDetail/Empty — large search-x icon + 404 copy + CTA back to
 * the audits list. Surfaces when getAudit returns 404 (deleted audit or
 * cross-user access).
 */
export function NotFoundState() {
  const t = useTranslations("auditDetail");
  return (
    <Card className="flex flex-col items-center gap-4 p-12 text-center">
      <SearchX className="h-24 w-24 text-fg-muted" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("notFoundTitle")}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">{t("notFoundBody")}</p>
      <Button asChild>
        <Link href={ROUTES.audits}>{t("backToList")}</Link>
      </Button>
    </Card>
  );
}
