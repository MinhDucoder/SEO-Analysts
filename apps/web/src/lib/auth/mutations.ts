"use client";

import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";
import {
  registerFn,
  loginFn,
  verifyEmailFn,
  forgotPasswordFn,
  resetPasswordFn,
  type VerifyEmailInput,
  type ResetPasswordRequest,
} from "@/lib/api/auth";
import type { AuthSession } from "@/lib/api/types";
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
} from "@/lib/auth/schemas";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";

/**
 * Vietnamese error message for a caught HTTPError. Falls back to a generic
 * string when the response body doesn't parse or there's no status.
 */
async function describeError(err: unknown): Promise<string> {
  if (err instanceof HTTPError) {
    const status = err.response.status;
    if (status === 401) return "Email hoặc mật khẩu không đúng";
    if (status === 403) {
      const body = await err.response.clone().json().catch(() => null);
      const msg = typeof body === "object" && body !== null && "message" in body ? String((body as { message: unknown }).message) : "";
      if (msg.toLowerCase().includes("verify")) return "Vui lòng verify email trước khi đăng nhập";
      if (msg.toLowerCase().includes("locked")) return "Tài khoản đã bị khoá";
      return msg || "Không có quyền truy cập";
    }
    if (status === 409) return "Email đã được đăng ký";
    if (status === 429) {
      const retry = err.response.headers.get("Retry-After");
      return retry ? `Quá nhiều lần thử. Thử lại sau ${retry} giây` : "Quá nhiều lần thử, vui lòng đợi";
    }
    if (status === 400) {
      const body = await err.response.clone().json().catch(() => null);
      const msg = typeof body === "object" && body !== null && "message" in body ? (body as { message: string | string[] }).message : null;
      if (Array.isArray(msg)) return msg.join(", ");
      if (typeof msg === "string") return msg;
      return "Dữ liệu không hợp lệ";
    }
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

type MutationExtras<TInput, TOutput> = Omit<UseMutationOptions<TOutput, unknown, TInput>, "mutationFn">;

export function useLogin(extras?: MutationExtras<LoginInput, AuthSession>) {
  const queryClient = useQueryClient();
  return useMutation<AuthSession, unknown, LoginInput>({
    mutationFn: loginFn,
    onSuccess: (session, ...rest) => {
      useAuthStore.getState().setAuth(session.user, session.accessToken);
      queryClient.setQueryData(queryKeys.auth.me, session.user);
      extras?.onSuccess?.(session, ...rest);
    },
    onError: async (err, ...rest) => {
      toast.error(await describeError(err));
      extras?.onError?.(err, ...rest);
    },
    ...extras,
  });
}

export function useRegister(extras?: MutationExtras<RegisterInput, AuthSession>) {
  const queryClient = useQueryClient();
  return useMutation<AuthSession, unknown, RegisterInput>({
    mutationFn: registerFn,
    onSuccess: (session, ...rest) => {
      useAuthStore.getState().setAuth(session.user, session.accessToken);
      queryClient.setQueryData(queryKeys.auth.me, session.user);
      extras?.onSuccess?.(session, ...rest);
    },
    onError: async (err, ...rest) => {
      toast.error(await describeError(err));
      extras?.onError?.(err, ...rest);
    },
    ...extras,
  });
}

export function useVerifyEmail(
  extras?: MutationExtras<VerifyEmailInput, { message: string }>,
) {
  return useMutation<{ message: string }, unknown, VerifyEmailInput>({
    mutationFn: verifyEmailFn,
    onError: async (err, ...rest) => {
      toast.error(await describeError(err));
      extras?.onError?.(err, ...rest);
    },
    ...extras,
  });
}

export function useForgotPassword(
  extras?: MutationExtras<ForgotPasswordInput, { message: string }>,
) {
  return useMutation<{ message: string }, unknown, ForgotPasswordInput>({
    mutationFn: forgotPasswordFn,
    onError: async (err, ...rest) => {
      toast.error(await describeError(err));
      extras?.onError?.(err, ...rest);
    },
    ...extras,
  });
}

export function useResetPassword(
  extras?: MutationExtras<ResetPasswordRequest, { message: string }>,
) {
  return useMutation<{ message: string }, unknown, ResetPasswordRequest>({
    mutationFn: resetPasswordFn,
    onError: async (err, ...rest) => {
      toast.error(await describeError(err));
      extras?.onError?.(err, ...rest);
    },
    ...extras,
  });
}
