"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdateAdminRules } from "@/lib/queries/use-admin";
import {
  protoCategoryToKey,
  type IssueCategoryKey,
} from "@/lib/audits/proto-map";
import type { SeoRule } from "@/lib/api/types";

interface AdminRulesTableProps {
  rules: SeoRule[];
}

const MIN_WEIGHT = 1;
const MAX_WEIGHT = 10;

export function AdminRulesTable({ rules }: AdminRulesTableProps) {
  const t = useTranslations("admin.rules");
  const tCategories = useTranslations("auditDetail.rules.categories");
  const mutation = useUpdateAdminRules();

  // Local edited weights keyed by rule.name. Empty until user touches a row.
  const [drafts, setDrafts] = React.useState<Record<string, number>>({});
  const [error, setError] = React.useState<string | null>(null);

  // Re-seed if the server payload identity changes (initial load + after save).
  React.useEffect(() => {
    setDrafts({});
    setError(null);
  }, [rules]);

  const dirtyRules = rules.filter(
    (r) => drafts[r.name] !== undefined && drafts[r.name] !== r.weight,
  );

  const onSave = () => {
    if (dirtyRules.length === 0) return;
    if (
      dirtyRules.some(
        (r) =>
          drafts[r.name]! < MIN_WEIGHT || drafts[r.name]! > MAX_WEIGHT,
      )
    ) {
      setError(t("rangeError"));
      return;
    }
    setError(null);
    mutation.mutate(
      {
        rules: dirtyRules.map((r) => ({
          name: r.name,
          weight: drafts[r.name]!,
        })),
      },
      {
        onSuccess: () => toast.success(t("success")),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated">
        <table className="w-full text-left font-ui text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-overlay/30 text-xs uppercase tracking-wider text-fg-muted">
              <th className="px-4 py-2.5 font-medium">{t("table.name")}</th>
              <th className="px-4 py-2.5 font-medium">{t("table.category")}</th>
              <th className="px-4 py-2.5 font-medium">{t("table.weight")}</th>
              <th className="px-4 py-2.5 font-medium">{t("table.enabled")}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const draftValue = drafts[rule.name];
              const value = draftValue ?? rule.weight;
              const isDirty =
                draftValue !== undefined && draftValue !== rule.weight;
              const categoryKey: IssueCategoryKey = protoCategoryToKey(
                rule.category,
              );
              return (
                <tr
                  key={rule.id}
                  className="border-b border-border last:border-0 hover:bg-bg-overlay/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-fg">
                        {rule.displayName}
                      </span>
                      <span className="font-mono text-xs text-fg-subtle">
                        {rule.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{tCategories(categoryKey)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={MIN_WEIGHT}
                      max={MAX_WEIGHT}
                      value={value}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [rule.name]: Number(e.target.value),
                        }))
                      }
                      className={`w-20 font-mono ${
                        isDirty ? "border-class-fair" : ""
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.isEnabled ? "success" : "muted"}>
                      {rule.isEnabled ? "on" : "off"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onSave}
          disabled={dirtyRules.length === 0 || mutation.isPending}
        >
          {mutation.isPending ? t("saving") : t("save")}
        </Button>
        {dirtyRules.length === 0 ? (
          <span className="font-ui text-xs text-fg-muted">
            {t("noChanges")}
          </span>
        ) : (
          <span className="font-ui text-xs text-fg-muted">
            {dirtyRules.length} pending
          </span>
        )}
        {error && (
          <span className="font-ui text-xs text-class-poor">{error}</span>
        )}
      </div>
    </div>
  );
}
