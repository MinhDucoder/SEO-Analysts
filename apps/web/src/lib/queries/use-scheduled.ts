"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createScheduledAudit,
  deleteScheduledAudit,
  listScheduledAudits,
  pauseScheduledAudit,
  resumeScheduledAudit,
  type CreateScheduledAuditDto,
  type ScheduledAudit,
} from "@/lib/api/scheduled";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

/**
 * `GET /scheduled-audits` — full list (no pagination). Disabled when
 * unauthenticated so the page doesn't fire 401s during the auth bootstrap.
 */
export function useScheduledAudits() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<ScheduledAudit[]>({
    queryKey: queryKeys.scheduled.list(),
    queryFn: () => listScheduledAudits(),
    enabled: accessToken !== null,
    staleTime: 30 * 1_000,
  });
}

/**
 * Optimistically patch the cached list entry so the row's `isActive`
 * flips immediately, then await the server's authoritative response and
 * roll back on error. Shared between pause + resume mutations.
 */
function useTogglePatch(
  action: (id: string) => Promise<ScheduledAudit>,
  nextActive: boolean,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => action(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.scheduled.list() });
      const snapshot = queryClient.getQueryData<ScheduledAudit[]>(
        queryKeys.scheduled.list(),
      );
      if (snapshot) {
        queryClient.setQueryData<ScheduledAudit[]>(
          queryKeys.scheduled.list(),
          snapshot.map((s) => (s.id === id ? { ...s, isActive: nextActive } : s)),
        );
      }
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(queryKeys.scheduled.list(), ctx.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduled.all() });
    },
  });
}

export function usePauseScheduledAudit() {
  return useTogglePatch(pauseScheduledAudit, false);
}

export function useResumeScheduledAudit() {
  return useTogglePatch(resumeScheduledAudit, true);
}

export function useCreateScheduledAudit() {
  const queryClient = useQueryClient();
  return useMutation<ScheduledAudit, Error, CreateScheduledAuditDto>({
    mutationFn: (body) => createScheduledAudit(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduled.all() });
    },
  });
}

export function useDeleteScheduledAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteScheduledAudit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduled.all() });
    },
  });
}
