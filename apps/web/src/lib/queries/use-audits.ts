"use client";

import { useQuery } from "@tanstack/react-query";
import { listAudits, type ListAuditsParams } from "@/lib/api/audits";
import type { AuditListItem, Paginated } from "@/lib/api/types";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Recent audits for dashboard widgets. Pulls the top N most recent audits
 * (default 30) so the page can compute stat cards + trend series from a
 * single request. Slug 4 (audits list page) will ship a separate
 * `useAuditsList(filters)` with search + pagination.
 *
 * Disabled when not authenticated to avoid spamming `/audits` with 401s.
 */

export interface UseRecentAuditsOptions {
  /** Max number of audits to fetch. Defaults to 30. */
  limit?: number;
  /** Optional ISO date lower bound (inclusive). */
  dateFrom?: string;
}

export function useRecentAudits(opts: UseRecentAuditsOptions = {}) {
  const { limit = 30, dateFrom } = opts;
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<Paginated<AuditListItem>>({
    queryKey: queryKeys.audits.recent({ limit, dateFrom }),
    queryFn: () => {
      const params: ListAuditsParams = { limit };
      if (dateFrom) params.dateFrom = dateFrom;
      return listAudits(params);
    },
    enabled: accessToken !== null,
    staleTime: 60 * 1_000,
  });
}
