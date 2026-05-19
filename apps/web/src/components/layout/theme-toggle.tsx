"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore, type ThemePreference } from "@/lib/ui/theme";
import { cn } from "@/lib/utils/cn";

interface ThemeToggleProps {
  /** Show only the icon (for collapsed sidebar or topbar). */
  iconOnly?: boolean;
  className?: string;
}

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeToggle({ iconOnly, className }: ThemeToggleProps) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const t = useTranslations("theme");
  const CurrentIcon = ICONS[preference];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={t(preference)}
          className={cn(
            "flex items-center gap-2 rounded-md font-ui text-sm font-medium text-fg-muted transition-colors",
            "hover:bg-bg-overlay hover:text-fg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            iconOnly ? "h-9 w-9 justify-center" : "h-9 px-3",
            className,
          )}
        >
          <CurrentIcon className="h-4 w-4 flex-shrink-0" />
          {!iconOnly && <span>{t(preference)}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(["light", "dark", "system"] as ThemePreference[]).map((opt) => {
          const Icon = ICONS[opt];
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => setPreference(opt)}
              className={cn(
                "gap-2",
                preference === opt && "bg-bg-overlay font-semibold text-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t(opt)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
