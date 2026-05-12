"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";
import {
  changePassword,
  updateProfile,
  type ChangePasswordDto,
  type UpdateProfileDto,
  type UpdateProfileResponse,
} from "@/lib/api/user";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

async function describeUserError(err: unknown): Promise<string> {
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
    if (status === 401) return "Mật khẩu hiện tại không đúng";
    if (status === 403) return "Không có quyền thực hiện";
    if (status === 429) return "Quá nhiều lần thử, vui lòng đợi";
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

/**
 * `PATCH /users/profile` — patches the server-side profile and mirrors
 * the new `fullName` into the auth store so the topbar/sidebar pick it
 * up without a re-fetch. The query cache for `auth.me` is also
 * invalidated for any consumer that reads `useQuery(queryKeys.auth.me)`.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<UpdateProfileResponse, unknown, UpdateProfileDto>({
    mutationFn: (dto) => updateProfile(dto),
    onSuccess: (data) => {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore
          .getState()
          .setAuth(
            { ...current, fullName: data.fullName },
            useAuthStore.getState().accessToken ?? "",
          );
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: async (err) => toast.error(await describeUserError(err)),
  });
}

/**
 * `PATCH /users/password` — on success the gateway revokes ALL refresh
 * tokens (including the current session). The mutation clears the local
 * auth store; the caller is expected to bounce to /login so the user
 * can re-authenticate.
 *
 * `setQueryDefaults` is not used here — the auth store is the source of
 * truth and `clearAuth` is enough to flush every authed query via the
 * `enabled: accessToken !== null` gate.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, unknown, ChangePasswordDto>({
    mutationFn: (dto) => changePassword(dto),
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      queryClient.clear();
    },
    onError: async (err) => toast.error(await describeUserError(err)),
  });
}
