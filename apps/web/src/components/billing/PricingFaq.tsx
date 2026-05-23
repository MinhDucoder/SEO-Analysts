"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
import { PRICING_FAQ } from "@/lib/content/pricing-faq";

export function PricingFaq() {
  const t = useTranslations("pricing");
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold">{t("faqTitle")}</h2>
      <div className="space-y-2">
        {PRICING_FAQ.map((item) => (
          <details key={item.q} className="rounded-md border border-border p-3">
            <summary className="cursor-pointer font-medium">{item.q}</summary>
            <p className="mt-2 text-sm text-fg-muted">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-4 text-sm">
        <Link href={ROUTES.policy} className="text-primary underline">
          {t("faqMore")}
        </Link>
      </p>
    </section>
  );
}
