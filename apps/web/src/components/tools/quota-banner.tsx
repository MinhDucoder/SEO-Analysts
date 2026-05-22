"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ToolsResponseMeta } from "@/lib/api/tools";

interface Props {
  meta?: ToolsResponseMeta | null;
  authenticated: boolean;
}

/**
 * Compact remaining-quota banner shown above tool results. Hidden when there
 * is no metered quota to report (unlimited plans or no meta yet).
 */
export function QuotaBanner({ meta, authenticated }: Props) {
  const t = useTranslations("tools.quota");
  if (!meta) return null;
  // Unlimited plans report quotaLeft = -1; very high values are also "effectively unlimited".
  if (meta.quotaLeft < 0 || meta.quotaLeft > 200) return null;
  const total = meta.quotaLeft + meta.quotaUsed;
  const ctaHref = authenticated ? "/pricing" : "/auth/login";
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-3 text-sm">
      <span>
        {t("remaining", { left: meta.quotaLeft, total })}
        {meta.cached && ` ${t("cached")}`}.
      </span>
      <Link href={ctaHref} className="text-primary hover:underline">
        {authenticated ? t("upgrade") : t("login")}
      </Link>
    </div>
  );
}
