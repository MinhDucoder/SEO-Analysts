"use client";

import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

export interface AuditsEmptyProps {
  /** True when filters are active and produced zero rows. */
  filtered: boolean;
  onClearFilters?: () => void;
}

/**
 * Two-flavour empty state for `/audits`:
 *   - filtered=false → first-time empty with CTA to /audits/new
 *   - filtered=true  → no-result with CTA to clear filters
 */
export function AuditsEmpty({ filtered, onClearFilters }: AuditsEmptyProps) {
  const tEmpty = useTranslations("audits.empty");
  const tNoResults = useTranslations("audits.noResults");
  const copy = filtered
    ? { title: tNoResults("title"), description: tNoResults("description"), cta: tNoResults("cta") }
    : { title: tEmpty("title"), description: tEmpty("description"), cta: tEmpty("cta") };

  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <SearchX className="h-24 w-24 text-fg-muted" aria-hidden />
      <h2 className="font-ui text-2xl font-semibold text-fg">{copy.title}</h2>
      <p className="max-w-md font-ui text-sm text-fg-muted">{copy.description}</p>
      {filtered ? (
        <Button onClick={onClearFilters} size="lg">
          {copy.cta}
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link href={ROUTES.auditsNew}>{copy.cta}</Link>
        </Button>
      )}
    </Card>
  );
}
