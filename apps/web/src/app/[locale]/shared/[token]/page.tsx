"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { HTTPError } from "ky";
import { PublicHeader } from "@/components/shared-report/public-header";
import { SharedError } from "@/components/shared-report/shared-error";
import { SharedNotFound } from "@/components/shared-report/shared-not-found";
import { SharedReportSkeleton } from "@/components/shared-report/shared-skeleton";
import { SharedReportView } from "@/components/shared-report/shared-report-view";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useSharedReport } from "@/lib/queries/use-shared";

/**
 * Public `/shared/[token]` route. No AuthGuard (lives outside the
 * `(app)` route group) and no AppShell — uses a slim public header
 * instead.
 *
 * State branches driven by `useSharedReport`:
 *  - missing/empty token       → SharedNotFound
 *  - fetching                  → SharedReportSkeleton
 *  - HTTP 404                  → SharedNotFound (revoked/unknown token)
 *  - other failure (incl. the
 *    react-query `paused`
 *    fetchStatus when the
 *    network is unreachable)   → SharedError + retry
 *  - success                   → SharedReportView (drives low-score variant
 *                                from `report.classification`)
 */
export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const t = useTranslations("sharedReport");

  const query = useSharedReport(token);

  const body = (() => {
    if (!token) return <SharedNotFound />;
    if (query.isLoading || query.fetchStatus === "fetching") {
      return <SharedReportSkeleton />;
    }
    if (
      query.error instanceof HTTPError &&
      query.error.response.status === 404
    ) {
      return <SharedNotFound />;
    }
    if (query.isError || !query.data) {
      return <SharedError onRetry={() => query.refetch()} />;
    }
    return <SharedReportView report={query.data} />;
  })();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        {body}
        <Card className="mt-8 flex flex-col items-center gap-3 p-6 text-center">
          <h3 className="font-ui text-lg font-semibold text-fg">
            {t("ctaTitle")}
          </h3>
          <p className="max-w-md font-ui text-sm text-fg-muted">{t("ctaBody")}</p>
          <Button asChild>
            <Link href="/">{t("ctaButton")}</Link>
          </Button>
        </Card>
      </main>
    </div>
  );
}
