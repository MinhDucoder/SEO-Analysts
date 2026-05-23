"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentIntentResponse } from "@/lib/api/billing";

interface Props {
  intent: PaymentIntentResponse;
}

export function VietQrDisplay({ intent }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(intent.expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Quét mã VietQR để thanh toán</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold">
          {intent.amountVnd.toLocaleString("vi-VN")}đ
        </div>
        {/* External image — using plain <img> since Next.js Image needs domain config */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={intent.vietqrUrl} alt="VietQR" className="mx-auto w-72 rounded" />
        <div className="rounded-md bg-amber-50 p-3 text-sm">
          <p className="font-semibold">Nội dung chuyển khoản BẮT BUỘC:</p>
          <p className="mt-1 font-mono text-lg">{intent.refCode}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Hệ thống sẽ tự kích hoạt gói trong 1-2 phút sau khi nhận tiền.
          </p>
        </div>
        <div className="text-center text-sm">
          Mã hết hạn sau:{" "}
          <span className={`font-mono ${secondsLeft <= 60 ? "text-red-500" : ""}`}>
            {mm}:{ss}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
