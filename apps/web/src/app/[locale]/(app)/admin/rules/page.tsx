"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminRulesTable } from "@/components/admin/admin-rules-table";
import { useAdminRules } from "@/lib/queries/use-admin";

export default function AdminRulesPage() {
  const t = useTranslations("admin.rules");
  const query = useAdminRules();

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-ui text-2xl font-semibold text-fg">
          {t("title")}
        </h1>
        <p className="font-ui text-sm text-fg-muted">{t("subtitle")}</p>
      </header>

      {query.isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="flex flex-col gap-3 p-6">
          <p className="font-ui text-sm text-class-poor">{t("error")}</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            {t("error")}
          </Button>
        </Card>
      )}

      {query.data && <AdminRulesTable rules={query.data.rules} />}
    </div>
  );
}
