"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { grantSubscription } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanCode } from "@repo/shared";

export default function AdminSubscriptionsPage() {
  const [userId, setUserId] = useState("");
  const [planCode, setPlanCode] = useState<PlanCode>("pro");
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState<string | null>(null);

  const grant = useMutation({
    mutationFn: grantSubscription,
    onSuccess: () => setMessage("✓ Đã cấp gói thành công."),
    onError: (e: unknown) => setMessage(`Lỗi: ${(e as Error).message}`),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    grant.mutate({ userId, planCode, days });
  };

  return (
    <main className="container mx-auto py-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Cấp gói thủ công</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm">User UUID</label>
              <Input
                placeholder="00000000-0000-0000-0000-000000000000"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Plan</label>
              <select
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value as PlanCode)}
                className="w-full rounded border p-2 bg-background"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Số ngày (1-3650)</label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
              />
            </div>
            <Button type="submit" disabled={grant.isPending}>
              {grant.isPending ? "Đang cấp..." : "Cấp gói"}
            </Button>
            {message ? <p className="mt-2 text-sm">{message}</p> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
