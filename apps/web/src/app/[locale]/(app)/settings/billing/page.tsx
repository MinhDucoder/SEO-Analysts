"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsShell } from "@/components/settings/settings-shell";
import { useSubscription, usePaymentIntentHistory } from "@/lib/queries/use-billing";
import { ROUTES } from "@/lib/constants";
import { PLAN_DISPLAY_NAMES_VI } from "@repo/shared";

export default function SettingsBillingPage() {
  const t = useTranslations("settings.billing");
  const sp = useSearchParams();
  const justPaid = sp.get("paid") === "1";
  const sub = useSubscription();
  const history = usePaymentIntentHistory();

  return (
    <SettingsShell active="billing">
      <div className="space-y-6">
        {justPaid ? (
          <div className="rounded-md bg-class-good/10 px-4 py-3 text-sm font-medium text-class-good">
            {t("paidBanner")}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("currentTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {t("planLabel")}:{" "}
              <strong>{sub.data ? PLAN_DISPLAY_NAMES_VI[sub.data.planCode] : "…"}</strong>
            </p>
            <p className="flex items-center gap-2">
              {t("statusLabel")}:{" "}
              {sub.data ? (
                <Badge variant={sub.data.status === "active" ? "info" : "muted"}>
                  {sub.data.status}
                </Badge>
              ) : (
                "…"
              )}
            </p>
            <p>
              {t("expiresLabel")}:{" "}
              {sub.data?.expiresAt
                ? new Date(sub.data.expiresAt).toLocaleString("vi-VN")
                : "—"}
            </p>
            {sub.data?.isAdminGranted ? (
              <p className="text-fg-muted">{t("adminGranted")}</p>
            ) : null}
            <div className="pt-2">
              <Button asChild>
                <Link href={ROUTES.pricing}>{t("upgrade")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("historyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(history.data ?? []).length === 0 ? (
              <p className="text-sm text-fg-muted">{t("historyEmpty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-fg-muted">
                    <th className="py-2 font-medium">{t("colTime")}</th>
                    <th className="font-medium">{t("colPlan")}</th>
                    <th className="font-medium">{t("colAmount")}</th>
                    <th className="font-medium">{t("colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data?.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-2">
                        {new Date(p.paidAt ?? p.expiresAt).toLocaleString("vi-VN")}
                      </td>
                      <td>{p.planCode}</td>
                      <td>{p.amountVnd.toLocaleString("vi-VN")}đ</td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsShell>
  );
}
