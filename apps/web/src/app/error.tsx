"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Global error boundary for the App Router. Next.js invokes this when any
 * nested segment throws during render. Keep markup minimal so it still renders
 * even if providers or tokens failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app/error] boundary caught:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card variant="outline" padding="lg" className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Đã có lỗi xảy ra</CardTitle>
          <CardDescription>
            Hệ thống gặp sự cố không mong đợi. Vui lòng thử lại.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest ? (
            <p className="text-caption text-on-surface-variant font-mono">
              Mã lỗi: {error.digest}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button variant="primary" onClick={reset}>
              Thử lại
            </Button>
            <Button variant="ghost" onClick={() => window.location.assign("/")}>
              Về trang chủ
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
