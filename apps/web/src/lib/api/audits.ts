import { api } from "@/lib/api/client";
import type { AuditListItem, Paginated } from "@/lib/api/types";

/**
 * Thin wrapper around gateway `GET /audits` (list endpoint). Slug 3 only
 * exercises `limit` + optional `dateFrom`; slug 4 will extend with the
 * full filter surface (search, status, scoreMin, scoreMax, dateTo, sort,
 * order, page).
 */

export interface ListAuditsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: "createdAt" | "seoScore";
  order?: "asc" | "desc";
}

export async function listAudits(
  params: ListAuditsParams = {},
): Promise<Paginated<AuditListItem>> {
  const searchParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams[key] = String(value);
  }
  return api
    .get("audits", { searchParams })
    .json<Paginated<AuditListItem>>();
}

/**
 * `DELETE /audits/:id` — returns 204 no-content. Throws ky `HTTPError` for
 * non-2xx so the caller's onError can surface a toast.
 */
export async function deleteAudit(id: string): Promise<void> {
  await api.delete(`audits/${id}`);
}

export type AuditMode = "single" | "site";

export interface CreateAuditDto {
  url: string;
  targetKeyword?: string;
  mode?: AuditMode;
  /** 1..5000, only meaningful for mode='site'. */
  maxUrls?: number;
}

export interface CreateAuditResponse {
  auditId: string;
  status: "pending";
  mode: AuditMode;
  message: string;
}

/**
 * `POST /audits` — kicks off a new audit. Returns 202 with the auditId
 * the caller can subscribe to via WebSocket or poll via `/audits/:id`.
 */
export async function createAudit(
  body: CreateAuditDto,
): Promise<CreateAuditResponse> {
  return api.post("audits", { json: body }).json<CreateAuditResponse>();
}
