"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanResponse } from "@/lib/api/billing";
import type { PlanCode } from "@repo/shared";

interface Props {
  plan: PlanResponse;
  current?: boolean;
  highlighted?: boolean;
  onSelect?: (code: PlanCode) => void;
  busy?: boolean;
}

export function PlanCard({ plan, current, highlighted, onSelect, busy }: Props) {
  const isPaid = plan.code !== "free";
  return (
    <Card className={highlighted ? "border-primary shadow-lg" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.displayName}</CardTitle>
          {current ? <Badge variant="info">Đang dùng</Badge> : null}
        </div>
        <div className="text-3xl font-bold">
          {plan.priceVnd === 0 ? "Miễn phí" : `${plan.priceVnd.toLocaleString("vi-VN")}đ`}
          {isPaid ? (
            <span className="text-base font-normal text-muted-foreground"> / tháng</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          <li>{plan.features.audits_monthly} audits / tháng</li>
          <li>
            Site-mode:{" "}
            {plan.features.site_audit_max_pages > 0
              ? `${plan.features.site_audit_max_pages} trang`
              : "—"}
          </li>
          <li>Lịch định kỳ: {plan.features.scheduled_audits_max}</li>
          <li>AI gợi ý: {plan.features.ai_calls_monthly}/tháng</li>
          <li>API: {plan.features.api_calls_daily}/ngày</li>
          <li>
            Lưu lịch sử:{" "}
            {plan.features.history_retention_days === -1
              ? "Vĩnh viễn"
              : `${plan.features.history_retention_days} ngày`}
          </li>
        </ul>
        {!current && isPaid && onSelect ? (
          <Button className="w-full" disabled={busy} onClick={() => onSelect(plan.code)}>
            {busy ? "Đang xử lý..." : "Nâng cấp"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
