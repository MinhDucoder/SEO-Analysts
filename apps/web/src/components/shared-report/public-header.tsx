"use client";

import { Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { APP_NAME } from "@/lib/constants";

/**
 * Public-facing header used by the shared-report route. Differs from the
 * authed AppShell topbar by surfacing a "public report" badge and never
 * embedding user controls (no avatar / sign-out). The home link still
 * points at "/" so a guest who lands here can discover the product.
 */
export function PublicHeader() {
  const t = useTranslations("sharedReport");
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-fg">
          <Gauge className="h-6 w-6" aria-hidden />
          <span className="font-ui text-base font-semibold">{APP_NAME}</span>
        </Link>
        <Badge variant="muted" className="hidden sm:inline-flex">
          {t("headerBadge")}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle iconOnly />
        <LocaleSwitcher iconOnly />
      </div>
    </header>
  );
}
