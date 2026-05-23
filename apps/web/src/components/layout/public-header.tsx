"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function PublicHeader() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const authed = useAuthStore((s) => s.accessToken !== null);

  return (
    <header className="border-b border-border bg-bg-elevated">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <Link href={ROUTES.home} className="font-semibold">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={ROUTES.pricing} className="text-fg-muted hover:text-fg">
            {tNav("pricing")}
          </Link>
          <Link href={ROUTES.policy} className="text-fg-muted hover:text-fg">
            {tNav("policy")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher iconOnly />
          <ThemeToggle iconOnly />
          {authed ? (
            <Button asChild size="sm">
              <Link href={ROUTES.dashboard}>{tCommon("enterApp")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.login}>{tCommon("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.register}>{tCommon("register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
