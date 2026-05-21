"use client";

import Link from "next/link";
import { useQuotaDialog } from "@/lib/billing/quota-dialog.store";
import { Button } from "@/components/ui/button";

export function QuotaExceededDialog() {
  const { open, title, message, resetAt, close } = useQuotaDialog();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-bold">{title}</h2>
        <p className="text-sm">{message}</p>
        {resetAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Reset vào: {new Date(resetAt).toLocaleString("vi-VN")}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Đóng
          </Button>
          <Link href="/billing/upgrade" onClick={close}>
            <Button>Nâng cấp</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
