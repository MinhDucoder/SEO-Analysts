"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface PasswordRulesProps {
  password: string;
  className?: string;
}

interface Rule {
  key: "rule8chars" | "ruleUppercase" | "ruleNumber" | "ruleSpecial";
  test: (s: string) => boolean;
}

const RULES: Rule[] = [
  { key: "rule8chars", test: (s) => s.length >= 8 },
  { key: "ruleUppercase", test: (s) => /[A-Z]/.test(s) },
  { key: "ruleNumber", test: (s) => /\d/.test(s) },
  { key: "ruleSpecial", test: (s) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(s) },
];

/**
 * Live password rules checklist — used on Register + Reset password forms.
 * Empty password → all neutral. As user types, satisfied rules turn green.
 */
export function PasswordRules({ password, className }: PasswordRulesProps) {
  const t = useTranslations("auth.common");
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {RULES.map(({ key, test }) => {
        const ok = password.length > 0 && test(password);
        return (
          <li
            key={key}
            className={cn(
              "flex items-center gap-2 font-ui text-xs",
              ok ? "text-class-excellent" : "text-fg-muted",
            )}
          >
            {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            <span>{t(key)}</span>
          </li>
        );
      })}
    </ul>
  );
}
