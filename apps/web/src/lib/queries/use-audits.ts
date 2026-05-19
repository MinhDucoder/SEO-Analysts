"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  compareAudits,
  createAudit,
  createShareLink,
  deleteAudit,
  getAudit,
  getAuditStatus,
  listAudits,
  revokeShareLink,
  type CreateAuditDto,
  type CreateAuditResponse,
  type ListAuditsParams,
} from "@/lib/api/audits";
import type {
  AuditDetailResponse,
  AuditListItem,
  AuditStatusResponse,
  CompareResult,
  Paginated,
  ShareLinkResponse,
} from "@/lib/api/types";
import { AuditStatus } from "@repo/shared";
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

/**
 * Submit a new audit via `POST /audits`. Invalidates every audits list
 * query on success so the newly-created row appears at the top of both
 * the dashboard recent list and the /audits table.
 */
export function useCreateAudit() {
  const queryClient = useQueryClient();
  return useMutation<CreateAuditResponse, Error, CreateAuditDto>({
    mutationFn: (body) => createAudit(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.all() });
    },
  });
}

/**
 * `GET /audits/:id` — the canonical detail query. Driven by the page
 * route param. Disabled when unauthenticated. Refetches on focus only
 * if the audit is still in flight (terminal states are stable forever).
 */
export function useAudit(id: string | null | undefined) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<AuditDetailResponse>({
    queryKey: id ? queryKeys.audits.detail(id) : ["audits", "detail", "noop"],
    queryFn: () => getAudit(id as string),
    enabled: accessToken !== null && Boolean(id),
    staleTime: 30 * 1_000,
  });
}

/**
 * `GET /audits/:id/status` — short-poll fallback for clients without
 * working WebSocket. Polls every 3s while status is non-terminal.
 *
 * Pass `enabled=false` when the WS hook is active to avoid duplicate
 * traffic; the WS path is the primary update channel.
 */
export interface UseAuditStatusOptions {
  enabled?: boolean;
}

const TERMINAL_STATUSES = new Set<AuditStatus>([
  AuditStatus.COMPLETED,
  AuditStatus.FAILED,
]);

export function useAuditStatus(
  id: string | null | undefined,
  opts: UseAuditStatusOptions = {},
) {
  const { enabled = true } = opts;
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const query = useQuery<AuditStatusResponse>({
    queryKey: id ? queryKeys.audits.status(id) : ["audits", "status", "noop"],
    queryFn: () => getAuditStatus(id as string),
    enabled: enabled && accessToken !== null && Boolean(id),
    refetchInterval: (q) => {
      const data = q.state.data as AuditStatusResponse | undefined;
      if (!data || TERMINAL_STATUSES.has(data.status)) return false;
      return 3_000;
    },
  });

  // Defense-in-depth: if WS missed `audit:completed`/`audit:failed`, the
  // polling path still needs to refresh the detail query when status flips
  // to a terminal state — otherwise the page stays stuck on cached
  // pre-completion data.
  const prevStatus = useRef<AuditStatus | null>(null);
  useEffect(() => {
    if (!id || !query.data) return;
    const wasTerminal = prevStatus.current && TERMINAL_STATUSES.has(prevStatus.current);
    const isTerminal = TERMINAL_STATUSES.has(query.data.status);
    if (isTerminal && !wasTerminal) {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.detail(id) });
    }
    prevStatus.current = query.data.status;
  }, [id, query.data, queryClient]);

  return query;
}

export function useCreateShareLink(auditId: string) {
  const queryClient = useQueryClient();
  return useMutation<ShareLinkResponse, Error, void>({
    mutationFn: () => createShareLink(auditId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.detail(auditId) });
    },
  });
}

export function useRevokeShareLink(auditId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => revokeShareLink(auditId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.detail(auditId) });
    },
  });
}

/**
 * `GET /audits/compare` — diff two completed audits. Disabled until
 * both ids are present. Compare results are stable once both audits
 * are completed, so we mark the result as effectively-immortal cache.
 */
export function useCompareAudits(
  audit1: string | null | undefined,
  audit2: string | null | undefined,
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const a1 = audit1 ?? "";
  const a2 = audit2 ?? "";
  return useQuery<CompareResult>({
    queryKey: queryKeys.audits.compare(a1, a2),
    queryFn: () => compareAudits(a1, a2),
    enabled: accessToken !== null && Boolean(a1) && Boolean(a2),
    staleTime: 5 * 60 * 1_000,
  });
}
