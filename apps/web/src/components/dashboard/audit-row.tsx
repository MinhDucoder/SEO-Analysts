import Link from "next/link";
import { ScoreBadge } from "@/components/common/score-badge";
import { StatusBadge } from "@/components/common/status-badge";
import type { AuditListItem } from "@/lib/api/types";
import { ROUTES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils/format";

/**
 * A single audit row inside RecentAuditsCard. Clicking anywhere on the
 * row navigates to the audit detail page (slug 5).
 */
export interface AuditRowProps {
  audit: AuditListItem;
}

export function AuditRow({ audit }: AuditRowProps) {
  return (
    <Link
      href={ROUTES.auditDetail(audit.id)}
      className="flex items-center gap-3 py-3 hover:bg-surface-container-low/40 rounded-lg -mx-2 px-2 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-bold text-on-surface truncate">
          {audit.url}
        </p>
        <p className="text-caption text-on-surface-variant truncate">
          {audit.domain} · {formatRelativeDate(audit.createdAt)}
        </p>
      </div>
      <ScoreBadge score={audit.seoScore} />
      <StatusBadge status={audit.status} />
    </Link>
  );
}
