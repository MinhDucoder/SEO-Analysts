"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

export function GeoPaywallOverlay() {
  const t = useTranslations("auditDetail.geo");
  const locale = useLocale();

  return (
    <div className="relative">
      {/* Blurred placeholder content */}
      <div aria-hidden className="blur-sm opacity-40 pointer-events-none p-8 select-none">
        <div className="text-4xl font-bold">- - -</div>
        <div className="grid gap-3 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background border rounded-xl p-8 max-w-sm shadow-lg text-center">
          <h3 className="text-lg font-semibold mb-2 text-fg">{t("paywallTitle")}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t("paywallDescription")}</p>
          <Link
            href={`/${locale}/pricing`}
            className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t("paywallCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
