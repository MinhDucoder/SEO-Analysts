"use client";

import Link from "next/link";
import { useSubscription } from "@/lib/queries/use-billing";

export function ExpiryBanner() {
  const { data } = useSubscription();
  if (!data?.expiresAt) return null;
  const expires = new Date(data.expiresAt);
  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 3 || daysLeft < 0) return null;
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Gói {data.planCode} của bạn hết hạn trong {daysLeft} ngày.{" "}
      <Link href="/billing/upgrade" className="font-semibold underline">
        Gia hạn ngay
      </Link>
    </div>
  );
}
