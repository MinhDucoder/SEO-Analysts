"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { POLICY_SECTIONS } from "@/lib/content/policy";
import { LocaleSwitcher } from "./locale-switcher";

export function PublicFooter() {
  const tPolicy = useTranslations("policy");
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-bg-elevated">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4">
          {POLICY_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`${ROUTES.policy}#${s.id}`}
              className="text-fg-muted hover:text-fg"
            >
              {tPolicy(s.titleKey)}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 text-fg-subtle">
          <LocaleSwitcher iconOnly />
          <span>© {year} {APP_NAME}</span>
        </div>
      </div>
    </footer>
  );
}
