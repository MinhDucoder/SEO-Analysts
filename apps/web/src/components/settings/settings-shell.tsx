"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type SettingsTab = "profile" | "password";

interface SettingsShellProps {
  active: SettingsTab;
  children: React.ReactNode;
}

/**
 * Settings page chrome — header (title + subtitle) + persistent tab nav
 * that points at `/settings/profile` and `/settings/password`. We can't
 * use Radix `Tabs` here because each tab is a distinct route; the active
 * tab is determined by `active` prop, mirrored from the file-based
 * routing.
 *
 * Tab styling mirrors the shadcn `TabsTrigger` token so visual parity
 * with other tab layouts is maintained.
 */
export function SettingsShell({ active, children }: SettingsShellProps) {
  const t = useTranslations("settings");
  const tabs: { key: SettingsTab; href: string }[] = [
    { key: "profile", href: ROUTES.settingsProfile },
    { key: "password", href: ROUTES.settingsPassword },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-ui text-2xl font-semibold text-fg">{t("title")}</h1>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </header>

      <nav
        role="tablist"
        aria-label={t("title")}
        className="inline-flex h-10 items-center gap-6 border-b border-border text-fg-muted"
      >
        {tabs.map(({ key, href }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative inline-flex h-full items-center py-3 font-ui text-sm font-medium transition-colors",
                isActive
                  ? "font-semibold text-fg after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-fg"
                  : "hover:text-fg",
              )}
            >
              {t(`tabs.${key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="max-w-2xl">{children}</div>
    </div>
  );
}
