import { api } from "@/lib/api/client";
import type {
  AuditDetailResponse,
  AuditListItem,
  AuditStatusResponse,
  Paginated,
  ShareLinkResponse,
} from "@/lib/api/types";
import { API_URL } from "@/lib/constants";

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

/**
 * `GET /audits/:id` — returns `{ audit, report }`. `report` is null
 * while the pipeline is in-flight; it gets populated once status
 * advances to `completed`.
 */
export async function getAudit(id: string): Promise<AuditDetailResponse> {
  return api.get(`audits/${id}`).json<AuditDetailResponse>();
}

/**
 * `GET /audits/:id/status` — lightweight progress probe. Used as a poll
 * fallback when the WebSocket is unavailable.
 */
export async function getAuditStatus(id: string): Promise<AuditStatusResponse> {
  return api.get(`audits/${id}/status`).json<AuditStatusResponse>();
}

/**
 * `POST /audits/:id/share` — mint a public share link. The gateway
 * generates the `shareToken` and returns the canonical `shareUrl` the
 * user can copy.
 */
export async function createShareLink(id: string): Promise<ShareLinkResponse> {
  return api.post(`audits/${id}/share`).json<ShareLinkResponse>();
}

/**
 * `DELETE /audits/:id/share` — revoke the active share link. 204
 * no-content on success.
 */
export async function revokeShareLink(id: string): Promise<void> {
  await api.delete(`audits/${id}/share`);
}

/**
 * Direct URL for the gateway's PDF export endpoint. The gateway returns
 * 302 → the report-service PDF stream; using `<a href>` lets the
 * browser handle the redirect + download natively.
 */
export function auditExportUrl(id: string): string {
  return `${API_URL.replace(/\/$/, "")}/audits/${id}/export`;
}
