"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { usePaymentIntent } from "@/lib/queries/use-billing";
import { queryKeys } from "@/lib/queries/keys";
import { VietQrDisplay } from "@/components/billing/VietQrDisplay";
import { getSocket } from "@/lib/ws/client";

export default function CheckoutPage() {
  const params = useParams<{ intentId: string }>();
  const intentId = params.intentId;
  const router = useRouter();
  const qc = useQueryClient();
  const query = usePaymentIntent(intentId);
  const [redirected, setRedirected] = useState(false);

  // Polling-based redirect (fallback if socket doesn't fire)
  useEffect(() => {
    if (query.data?.status === "paid" && !redirected) {
      setRedirected(true);
      qc.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
      router.push(`${ROUTES.settingsBilling}?paid=1`);
    }
  }, [query.data, redirected, qc, router]);

  // Socket-based subscribe + listen
  useEffect(() => {
    let sock: ReturnType<typeof getSocket> | null = null;
    try {
      sock = getSocket();
    } catch {
      // Socket helper not yet initialized — fall back to polling only
      return;
    }
    if (!sock || !intentId) return;

    const onConnect = () => sock?.emit("billing:subscribe", { intentId });
    if (sock.connected) {
      sock.emit("billing:subscribe", { intentId });
    } else {
      sock.once("connect", onConnect);
    }

    const onConfirmed = (evt: { intentId: string }) => {
      if (evt.intentId === intentId && !redirected) {
        setRedirected(true);
        qc.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
        router.push(`${ROUTES.settingsBilling}?paid=1`);
      }
    };
    sock.on("billing:confirmed", onConfirmed);

    return () => {
      sock?.off("billing:confirmed", onConfirmed);
      sock?.off("connect", onConnect);
    };
  }, [intentId, redirected, qc, router]);

  if (query.isLoading) {
    return <div className="container mx-auto py-12 text-center">Đang tải...</div>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="mb-4">Không tìm thấy đơn thanh toán.</p>
        <Link href={ROUTES.pricing}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }
  if (query.data.status === "expired" || query.data.status === "failed") {
    return (
      <div className="container mx-auto py-12 space-y-4 text-center">
        <p>Mã thanh toán đã hết hạn hoặc thất bại.</p>
        <Link href={ROUTES.pricing}>
          <Button>Tạo mã mới</Button>
        </Link>
      </div>
    );
  }
  return (
    <main className="container mx-auto py-12">
      <VietQrDisplay intent={query.data} />
    </main>
  );
}
