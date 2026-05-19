import { api } from "@/lib/api/client";

/**
 * `PATCH /users/profile` — partial update. The gateway requires at least
 * one of `fullName` / `avatarUrl` to be present (BadRequest otherwise);
 * callers are expected to omit untouched fields rather than send empty
 * strings.
 */
export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
}

export interface UpdateProfileResponse {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export async function updateProfile(
  body: UpdateProfileDto,
): Promise<UpdateProfileResponse> {
  return api
    .patch("users/profile", { json: body })
    .json<UpdateProfileResponse>();
}

/**
 * `PATCH /users/password` — change password.
 *
 * ⚠️ Server-side side-effect: ALL refresh tokens are revoked including the
 * current session. The mutation hook is responsible for clearing the auth
 * store and bouncing to /login after success.
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  body: ChangePasswordDto,
): Promise<{ message: string }> {
  return api
    .patch("users/password", { json: body })
    .json<{ message: string }>();
}
