import { api } from "@/lib/api/client";
import type {
  AdminPaginated,
  AdminRevenue,
  AdminStats,
  AdminUser,
  ListAdminUsersQuery,
  SeoRule,
  UpdateRulesDto,
} from "@/lib/api/types";
import type { PlanCode } from "@repo/shared";

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
 * `PATCH /admin/users/:id` — change a user's role. The gateway rejects an
 * admin changing their own role with 400.
 */
export async function updateUserRole(
  id: string,
  role: AdminUser["role"],
): Promise<Pick<AdminUser, "id" | "email" | "role">> {
  return api
    .patch(`admin/users/${id}`, { json: { role } })
    .json<Pick<AdminUser, "id" | "email" | "role">>();
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

/**
 * `POST /admin/subscriptions/grant` — admin manually assigns a plan
 * for `days` (bypassing payment). Returns 200 on success.
 */
export async function grantSubscription(input: {
  userId: string;
  planCode: PlanCode;
  days: number;
}): Promise<void> {
  await api.post("admin/subscriptions/grant", { json: input });
}

/**
 * `GET /admin/revenue` — calendar-period revenue summary (gross/net/vat,
 * per-plan breakdown, delta vs previous period). `query` is built by
 * `periodToQuery`.
 */
export async function getAdminRevenue(
  query: Record<string, string>,
): Promise<AdminRevenue> {
  return api.get("admin/revenue", { searchParams: query }).json<AdminRevenue>();
}

/**
 * `GET /admin/revenue/export.csv` — download the CSV for the given period.
 * Reads the server `Content-Disposition` filename; falls back to a generic
 * name. The ky `beforeRequest` hook attaches the bearer token, so the blob
 * download stays authenticated.
 */
export async function exportAdminRevenueCsv(
  query: Record<string, string>,
): Promise<void> {
  const res = await api.get("admin/revenue/export.csv", { searchParams: query });
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "doanh-thu.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
