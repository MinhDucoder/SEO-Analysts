import { api } from "@/lib/api/client";
import type { AuthSession, AuthenticatedUser } from "@/lib/api/types";
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
} from "@/lib/auth/schemas";

/**
 * Thin, typed wrappers around gateway `/auth/*` REST endpoints. No behavior
 * beyond JSON de/serialization — mutation logic (toast, store hydration,
 * redirect) lives in `lib/auth/mutations.ts` + `lib/auth/hooks.ts`.
 */

export interface VerifyEmailInput {
  token: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export async function registerFn(input: RegisterInput): Promise<AuthSession> {
  const payload = {
    fullName: input.fullName,
    email: input.email,
    password: input.password,
  };
  return api.post("auth/register", { json: payload }).json<AuthSession>();
}

export async function loginFn(input: LoginInput): Promise<AuthSession> {
  return api.post("auth/login", { json: input }).json<AuthSession>();
}

export async function logoutFn(): Promise<{ message: string }> {
  return api.post("auth/logout").json<{ message: string }>();
}

export async function meFn(): Promise<AuthenticatedUser> {
  return api.get("auth/me").json<AuthenticatedUser>();
}

export async function verifyEmailFn(input: VerifyEmailInput): Promise<{ message: string }> {
  return api.post("auth/verify-email", { json: input }).json<{ message: string }>();
}

export async function forgotPasswordFn(
  input: ForgotPasswordInput,
): Promise<{ message: string }> {
  return api.post("auth/forgot-password", { json: input }).json<{ message: string }>();
}

export async function resetPasswordFn(
  input: ResetPasswordRequest,
): Promise<{ message: string }> {
  return api.post("auth/reset-password", { json: input }).json<{ message: string }>();
}
