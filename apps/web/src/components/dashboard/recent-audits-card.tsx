import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuditRow } from "@/components/dashboard/audit-row";
import { EmptyState } from "@/components/common/empty-state";
import type { AuditListItem } from "@/lib/api/types";
import { ROUTES } from "@/lib/constants";

/**
 * Top-N recent audits list card. Default N = 5. When audits is empty,
 * renders a compact EmptyState inside the card body (the page-level
 * <DashboardEmpty> replaces the full widget set when NO audits exist —
 * this fallback applies only when the query is filtered/paginated).
 */
export interface RecentAuditsCardProps {
  audits: AuditListItem[];
  limit?: number;
  className?: string;
}

export function RecentAuditsCard({
  audits,
  limit = 5,
  className,
}: RecentAuditsCardProps) {
  const items = audits.slice(0, limit);

  return (
    <Card padding="md" className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline text-h4 font-semibold text-on-surface">
          Audit gần đây
        </h3>
        <Link
          href={ROUTES.audits}
          className="text-caption font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Xem tất cả
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Chưa có audit nào"
          body="Tạo audit đầu tiên để theo dõi."
          size="md"
          action={
            <Button asChild size="sm">
              <Link href={ROUTES.auditsNew}>Tạo audit</Link>
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {items.map((audit) => (
            <AuditRow key={audit.id} audit={audit} />
          ))}
        </div>
      )}
    </Card>
  );
}
