"use client";

import { useRouter } from "next/navigation";
import { useCreatePaymentIntent, usePlans, useSubscription } from "@/lib/queries/use-billing";
import { useAuthStore } from "@/lib/auth/store";
import { PlanCard } from "@/components/billing/PlanCard";
import type { PlanCode } from "@repo/shared";

export default function PricingPage() {
  const plansQ = usePlans();
  const subQ = useSubscription();
  const create = useCreatePaymentIntent();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const onSelect = (code: PlanCode) => {
    if (accessToken === null) {
      router.push("/login?next=/pricing");
      return;
    }
    if (code === "free") return;
    create.mutate(code as Exclude<PlanCode, "free">);
  };

  if (plansQ.isLoading)
    return <div className="container mx-auto py-12">Đang tải...</div>;
  if (plansQ.isError)
    return (
      <div className="container mx-auto py-12 text-red-600">
        Lỗi tải danh sách gói.
      </div>
    );

  return (
    <main className="container mx-auto py-12">
      <h1 className="mb-8 text-center text-4xl font-bold">
        Chọn gói phù hợp với bạn
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plansQ.data?.map((p) => (
          <PlanCard
            key={p.code}
            plan={p}
            current={subQ.data?.planCode === p.code}
            highlighted={p.code === "pro"}
            onSelect={onSelect}
            busy={create.isPending}
          />
        ))}
      </div>
    </main>
  );
}
