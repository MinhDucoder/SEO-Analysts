import { AuditStatus } from "@repo/shared";
import { Badge, type BadgeProps } from "@/components/ui/badge";

/**
 * Audit status chip. Maps `AuditStatus` enum → Vietnamese label + Badge
 * variant. Pre-completed states use neutral/primary; COMPLETED =
 * success, FAILED = error.
 */
export interface StatusBadgeProps extends Omit<BadgeProps, "children" | "variant"> {
  status: AuditStatus;
}

const LABEL: Record<AuditStatus, string> = {
  [AuditStatus.PENDING]: "Chờ xử lý",
  [AuditStatus.CRAWLING]: "Đang crawl",
  [AuditStatus.ANALYZING]: "Đang phân tích",
  [AuditStatus.REPORTING]: "Đang tổng hợp",
  [AuditStatus.COMPLETED]: "Hoàn tất",
  [AuditStatus.FAILED]: "Thất bại",
};

const VARIANT: Record<AuditStatus, BadgeProps["variant"]> = {
  [AuditStatus.PENDING]: "neutral",
  [AuditStatus.CRAWLING]: "primary",
  [AuditStatus.ANALYZING]: "primary",
  [AuditStatus.REPORTING]: "primary",
  [AuditStatus.COMPLETED]: "success",
  [AuditStatus.FAILED]: "error",
};

export function StatusBadge({ status, ...rest }: StatusBadgeProps) {
  return (
    <Badge {...rest} variant={VARIANT[status]} shape="pill">
      {LABEL[status]}
    </Badge>
  );
}
