"use client";

import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

/**
 * Public state shown when the share token returns 404 — either it was
 * never minted, expired, or the owner revoked it. CTA bounces to the
 * product landing so a guest can still discover SEO Analyst.
 */
export function SharedNotFound() {
  const t = useTranslations("sharedReport");
  return (
    <Card className="flex flex-col items-center gap-4 p-12 text-center">
      <Ban className="h-24 w-24 text-fg-muted" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">
        {t("notFoundTitle")}
      </h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">{t("notFoundBody")}</p>
      <Button asChild>
        <Link href="/">{t("ctaButton")}</Link>
      </Button>
    </Card>
  );
}
