"use client";

import { Languages } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

const FLAGS: Record<Locale, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
};

interface LocaleSwitcherProps {
  iconOnly?: boolean;
  className?: string;
}

export function LocaleSwitcher({ iconOnly, className }: LocaleSwitcherProps) {
  const t = useTranslations("locale");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const change = (next: Locale) => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={t(locale)}
          className={cn(
            "flex items-center gap-2 rounded-md font-ui text-sm font-medium text-fg-muted transition-colors",
            "hover:bg-bg-overlay hover:text-fg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            iconOnly ? "h-9 w-9 justify-center" : "h-9 px-3",
            className,
          )}
        >
          {iconOnly ? (
            <Languages className="h-4 w-4 flex-shrink-0" />
          ) : (
            <>
              <span className="text-base leading-none">{FLAGS[locale]}</span>
              <span>{t(locale)}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => change(loc)}
            className={cn(
              "gap-2",
              loc === locale && "bg-bg-overlay font-semibold text-fg",
            )}
          >
            <span className="text-base leading-none">{FLAGS[loc]}</span>
            <span>{t(loc)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
