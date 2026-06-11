"use client";

import { useTranslations } from "next-intl";
import { GeoRuleCard } from "./geo-rule-card";
import type { GeoRuleResult } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

interface GeoTabProps {
  geoScore: number | null;
  rules: GeoRuleResult[];
  geoVersion?: string | null;
  auditUrl?: string;
}

export function GeoTab({ geoScore, rules, geoVersion, auditUrl: _auditUrl }: GeoTabProps) {
  const t = useTranslations("auditDetail.geo");

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="flex items-center gap-4">
        <div>
          <div className="text-4xl font-bold text-fg">{geoScore ?? "-"}</div>
          <div className="text-sm text-muted-foreground mt-1">{t("subtitle")}</div>
        </div>
        {geoVersion === "1.0-degraded" && (
          <Badge variant="warn">
            {t("degradedBadge")}
          </Badge>
        )}
      </div>

      {/* Rule cards */}
      {rules.length > 0 ? (
        <div className="grid gap-3">
          {rules.map((r) => (
            <article key={r.id}>
              <GeoRuleCard rule={r} />
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
