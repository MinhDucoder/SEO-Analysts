"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCreatePaymentIntent, usePlans, useSubscription } from "@/lib/queries/use-billing";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";
import { PlanCard } from "@/components/billing/PlanCard";
import { PlanComparisonTable } from "@/components/billing/PlanComparisonTable";
import { PricingFaq } from "@/components/billing/PricingFaq";
import type { PlanCode } from "@repo/shared";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const plansQ = usePlans();
  const subQ = useSubscription();
  const create = useCreatePaymentIntent();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const onSelect = (code: PlanCode) => {
    if (accessToken === null) {
      router.push(`${ROUTES.login}?next=${ROUTES.pricing}`);
      return;
    }
    if (code === "free") return;
    create.mutate(code as Exclude<PlanCode, "free">);
  };

  if (plansQ.isLoading) return <div className="container mx-auto py-12">Đang tải...</div>;
  if (plansQ.isError)
    return <div className="container mx-auto py-12 text-red-600">Lỗi tải danh sách gói.</div>;

  const plans = plansQ.data ?? [];
  const currentPlanCode = subQ.data?.planCode ?? null;

  return (
    <main className="container mx-auto space-y-16 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">{t("heroTitle")}</h1>
        <p className="text-muted-foreground">{t("heroSubtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <PlanCard
            key={p.code}
            plan={p}
            current={currentPlanCode === p.code}
            highlighted={p.code === "pro"}
            onSelect={onSelect}
            busy={create.isPending}
          />
        ))}
      </div>

      <PlanComparisonTable plans={plans} currentPlanCode={currentPlanCode} />

      <PricingFaq />
    </main>
  );
}
