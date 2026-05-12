"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteAudit,
  listAudits,
  type ListAuditsParams,
} from "@/lib/api/audits";
import type { AuditListItem, Paginated } from "@/lib/api/types";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Recent audits for dashboard widgets. Pulls the top N most recent audits
 * (default 30) so the page can compute stat cards + trend series from a
 * single request.
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

/**
 * Full audits-list query with filters + pagination, backing the `/audits`
 * route. Keeps previous-page data on filter change via `placeholderData` so
 * the table doesn't flicker through skeleton between paginations.
 */
export function useAuditsList(filters: ListAuditsParams) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<Paginated<AuditListItem>>({
    queryKey: queryKeys.audits.list(filters as Record<string, unknown>),
    queryFn: () => listAudits(filters),
    enabled: accessToken !== null,
    placeholderData: (prev) => prev,
    staleTime: 30 * 1_000,
  });
}

/**
 * Delete an audit and invalidate every audits list query so the row falls
 * out of any open pages. The detail query is removed entirely — there's no
 * cache value left to revalidate after the audit is gone.
 */
export function useDeleteAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAudit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.all() });
      queryClient.removeQueries({ queryKey: queryKeys.audits.detail(id) });
    },
  });
}
