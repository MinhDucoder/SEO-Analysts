"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
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

interface RuleDraft {
  weight?: number;
  isEnabled?: boolean;
}

export function AdminRulesTable({ rules }: AdminRulesTableProps) {
  const t = useTranslations("admin.rules");
  const tCategories = useTranslations("auditDetail.rules.categories");
  const mutation = useUpdateAdminRules();

  // Local edits keyed by rule.name. Only populated fields are in flight.
  const [drafts, setDrafts] = React.useState<Record<string, RuleDraft>>({});
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDrafts({});
    setError(null);
  }, [rules]);

  const dirtyRules = rules.flatMap((rule) => {
    const d = drafts[rule.name];
    if (!d) return [];
    const weightChanged =
      d.weight !== undefined && d.weight !== rule.weight;
    const enabledChanged =
      d.isEnabled !== undefined && d.isEnabled !== rule.isEnabled;
    if (!weightChanged && !enabledChanged) return [];
    return [
      {
        name: rule.name,
        ...(weightChanged ? { weight: d.weight } : {}),
        ...(enabledChanged ? { isEnabled: d.isEnabled } : {}),
      },
    ];
  });

  const onSave = () => {
    if (dirtyRules.length === 0) return;
    if (
      dirtyRules.some(
        (r) =>
          r.weight !== undefined &&
          (r.weight < MIN_WEIGHT || r.weight > MAX_WEIGHT),
      )
    ) {
      setError(t("rangeError"));
      return;
    }
    setError(null);
    mutation.mutate(
      { rules: dirtyRules },
      { onSuccess: () => toast.success(t("success")) },
    );
  };

  const setDraft = (name: string, patch: RuleDraft) =>
    setDrafts((d) => ({ ...d, [name]: { ...d[name], ...patch } }));

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
              const draft = drafts[rule.name];
              const weightValue = draft?.weight ?? rule.weight;
              const enabledValue = draft?.isEnabled ?? rule.isEnabled;
              const weightDirty =
                draft?.weight !== undefined && draft.weight !== rule.weight;
              const enabledDirty =
                draft?.isEnabled !== undefined &&
                draft.isEnabled !== rule.isEnabled;
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
                      value={weightValue}
                      onChange={(e) =>
                        setDraft(rule.name, {
                          weight: Number(e.target.value),
                        })
                      }
                      className={cn(
                        "w-20 font-mono",
                        weightDirty && "border-class-fair",
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabledValue}
                      onClick={() =>
                        setDraft(rule.name, { isEnabled: !enabledValue })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                        enabledValue
                          ? "border-transparent bg-class-excellent"
                          : "border-border bg-bg-overlay",
                        enabledDirty && "ring-2 ring-class-fair/60",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-bg shadow transition-transform",
                          enabledValue ? "translate-x-5" : "translate-x-0.5",
                        )}
                      />
                      <span className="sr-only">
                        {enabledValue ? "on" : "off"}
                      </span>
                    </button>
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
