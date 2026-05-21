"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription, usePaymentIntentHistory } from "@/lib/queries/use-billing";
import { PLAN_DISPLAY_NAMES_VI } from "@repo/shared";

export default function BillingPage() {
  const sp = useSearchParams();
  const justPaid = sp.get("paid") === "1";
  const sub = useSubscription();
  const history = usePaymentIntentHistory();

  return (
    <main className="container mx-auto space-y-6 py-8">
      {justPaid ? (
        <div className="rounded bg-green-100 p-4 text-green-900">
          Thanh toán thành công! 🎉
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Gói hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            Plan:{" "}
            <strong>
              {sub.data ? PLAN_DISPLAY_NAMES_VI[sub.data.planCode] : "..."}
            </strong>
          </p>
          <p>Status: {sub.data?.status}</p>
          <p>
            Expires:{" "}
            {sub.data?.expiresAt
              ? new Date(sub.data.expiresAt).toLocaleString("vi-VN")
              : "—"}
          </p>
          {sub.data?.isAdminGranted ? (
            <p className="text-sm text-muted-foreground">
              Được cấp bởi admin (không qua thanh toán)
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Link href="/billing/upgrade">
              <Button>Nâng cấp / Gia hạn</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thanh toán</CardTitle>
        </CardHeader>
        <CardContent>
          {(history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có giao dịch.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1">Thời gian</th>
                  <th>Plan</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {history.data?.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-1">
                      {new Date(
                        p.paidAt ?? p.expiresAt,
                      ).toLocaleString("vi-VN")}
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
    </main>
  );
}
