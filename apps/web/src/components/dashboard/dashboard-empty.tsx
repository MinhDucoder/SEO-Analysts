import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ROUTES } from "@/lib/constants";

/**
 * Full-card empty state for the dashboard when the user has zero audits.
 * Shows an illustration, headline, body copy, and primary CTA to
 * /audits/new.
 */
export function DashboardEmpty() {
  return (
    <Card
      variant="elevated"
      padding="lg"
      className="col-span-12"
      data-testid="dashboard-empty"
    >
      <EmptyState
        icon={Sparkles}
        title="Chưa có audit nào"
        body="Tạo audit đầu tiên để bắt đầu phân tích SEO cho website của bạn."
        size="lg"
        action={
          <Button asChild size="lg">
            <Link href={ROUTES.auditsNew}>Tạo audit đầu tiên</Link>
          </Button>
        }
      />
    </Card>
  );
}
