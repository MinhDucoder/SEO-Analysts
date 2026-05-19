"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";
import {
  getAdminStats,
  listAdminRules,
  listAdminUsers,
  updateAdminRules,
  updateUserLock,
} from "@/lib/api/admin";
import type {
  AdminPaginated,
  AdminStats,
  AdminUser,
  ListAdminUsersQuery,
  SeoRule,
  UpdateRulesDto,
} from "@/lib/api/types";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

async function describeAdminError(err: unknown): Promise<string> {
  if (err instanceof HTTPError) {
    const status = err.response.status;
    if (status === 400) {
      const body = await err.response.clone().json().catch(() => null);
      const msg =
        typeof body === "object" && body !== null && "message" in body
          ? (body as { message: string | string[] }).message
          : null;
      if (Array.isArray(msg)) return msg.join(", ");
      if (typeof msg === "string") return msg;
      return "Dữ liệu không hợp lệ";
    }
    if (status === 403) return "Không có quyền admin";
    if (status === 404) return "Không tìm thấy";
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

/**
 * Admin queries gate on both `accessToken` AND `isAdmin()` so a stale
 * non-admin session doesn't fire 403-noise at the gateway.
 */
function useAdminEnabled(): boolean {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  return token !== null && role === "admin";
}

export function useAdminStats(period = 30) {
  const enabled = useAdminEnabled();
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats(period),
    queryFn: () => getAdminStats(period),
    enabled,
    staleTime: 5 * 60 * 1_000,
  });
}

export function useAdminUsers(filters: ListAdminUsersQuery) {
  const enabled = useAdminEnabled();
  return useQuery<AdminPaginated<AdminUser>>({
    queryKey: queryKeys.admin.users(filters as Record<string, unknown>),
    queryFn: () => listAdminUsers(filters),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 30 * 1_000,
  });
}

export function useUpdateUserLock() {
  const queryClient = useQueryClient();
  return useMutation<
    Pick<AdminUser, "id" | "email" | "isLocked">,
    unknown,
    { id: string; isLocked: boolean }
  >({
    mutationFn: ({ id, isLocked }) => updateUserLock(id, isLocked),
    onMutate: async ({ id, isLocked }) => {
      // Optimistic patch — flip the row immediately, roll back on error.
      const lists = queryClient.getQueriesData<AdminPaginated<AdminUser>>({
        queryKey: ["admin", "users"],
      });
      const previous = lists.map(([key, value]) => ({ key, value }));
      for (const [key, value] of lists) {
        if (!value) continue;
        queryClient.setQueryData<AdminPaginated<AdminUser>>(key, {
          ...value,
          data: value.data.map((u) =>
            u.id === id ? { ...u, isLocked } : u,
          ),
        });
      }
      return { previous };
    },
    onError: async (err, _vars, ctx) => {
      const context = ctx as { previous?: Array<{ key: unknown; value: AdminPaginated<AdminUser> }> } | undefined;
      if (context?.previous) {
        for (const { key, value } of context.previous) {
          queryClient.setQueryData(key as readonly unknown[], value);
        }
      }
      toast.error(await describeAdminError(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminRules() {
  const enabled = useAdminEnabled();
  return useQuery<{ rules: SeoRule[] }>({
    queryKey: queryKeys.admin.rules(),
    queryFn: listAdminRules,
    enabled,
    staleTime: 60 * 1_000,
  });
}

export function useUpdateAdminRules() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: SeoRule[] }, unknown, UpdateRulesDto>({
    mutationFn: (body) => updateAdminRules(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.rules() });
    },
    onError: async (err) => toast.error(await describeAdminError(err)),
  });
}
