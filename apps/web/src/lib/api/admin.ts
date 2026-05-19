import { api } from "@/lib/api/client";
import type {
  AdminPaginated,
  AdminStats,
  AdminUser,
  ListAdminUsersQuery,
  SeoRule,
  UpdateRulesDto,
} from "@/lib/api/types";

/**
 * `GET /admin/users` — paginated user list with search + filters.
 * `isLocked` is a string-boolean query param per the gateway DTO.
 */
export async function listAdminUsers(
  params: ListAdminUsersQuery = {},
): Promise<AdminPaginated<AdminUser>> {
  const searchParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams[key] = String(value);
  }
  return api
    .get("admin/users", { searchParams })
    .json<AdminPaginated<AdminUser>>();
}

/**
 * `PATCH /admin/users/:id` — flip the `isLocked` flag. The gateway
 * rejects an admin locking themselves with 400.
 */
export async function updateUserLock(
  id: string,
  isLocked: boolean,
): Promise<Pick<AdminUser, "id" | "email" | "isLocked">> {
  return api
    .patch(`admin/users/${id}`, { json: { isLocked } })
    .json<Pick<AdminUser, "id" | "email" | "isLocked">>();
}

/**
 * `GET /admin/stats?period=30d` — aggregate dashboard payload.
 */
export async function getAdminStats(period = 30): Promise<AdminStats> {
  return api
    .get("admin/stats", { searchParams: { period: `${period}d` } })
    .json<AdminStats>();
}

/**
 * `GET /admin/rules` — full SEO rule list.
 */
export async function listAdminRules(): Promise<{ rules: SeoRule[] }> {
  return api.get("admin/rules").json<{ rules: SeoRule[] }>();
}

/**
 * `PUT /admin/rules` — batch update of weights. Only rules with a
 * changed weight need to be in the body; the gateway short-circuits
 * unchanged values but we still send them for atomicity.
 */
export async function updateAdminRules(
  body: UpdateRulesDto,
): Promise<{ updated: SeoRule[] }> {
  return api
    .put("admin/rules", { json: body })
    .json<{ updated: SeoRule[] }>();
}
