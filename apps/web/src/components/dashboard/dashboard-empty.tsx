"use client";

import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

/**
 * Pencil dashboard empty state — large search-x icon + title + description
 * + primary CTA to the audit-create page.
 */
export function DashboardEmpty() {
  const t = useTranslations("dashboard.empty");

  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <SearchX className="h-24 w-24 text-fg-muted" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">{t("description")}</p>
      <Button asChild size="lg">
        <Link href={ROUTES.auditsNew}>{t("cta")}</Link>
      </Button>
    </Card>
  );
}
