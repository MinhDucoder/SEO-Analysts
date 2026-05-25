import { api } from "@/lib/api/client";
import type {
  AuditDetailResponse,
  AuditListItem,
  AuditStatusResponse,
  CompareResult,
  PageAuditRow,
  Paginated,
  ShareLinkResponse,
} from "@/lib/api/types";

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
 * `GET /audits/:id/pages` — paginated per-URL results of a site-mode audit
 * (lowest score first). Empty for single-mode audits.
 */
export async function getAuditPages(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<PageAuditRow>> {
  const searchParams: Record<string, string> = {};
  if (params.page !== undefined) searchParams.page = String(params.page);
  if (params.limit !== undefined) searchParams.limit = String(params.limit);
  return api
    .get(`audits/${id}/pages`, { searchParams })
    .json<Paginated<PageAuditRow>>();
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
 * `GET /audits/:id/export` — gateway streams the rendered PDF (bytes)
 * with `Content-Disposition: attachment`. We fetch through `api` so the
 * JWT bearer (+ silent refresh) travels — a plain `<a href>` would 401
 * because the browser doesn't attach the Authorization header on
 * anchor clicks. Returns blob + filename so the caller can trigger a
 * browser download via `URL.createObjectURL`.
 */
export async function downloadAuditPdf(
  id: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get(`audits/${id}/export`);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] ?? `audit-${id}.pdf`;
  return { blob, filename };
}

/**
 * `GET /audits/compare?audit1=&audit2=` — diff between two completed
 * audits. Both ids must be UUIDs owned by the caller (admin override
 * server-side).
 */
export async function compareAudits(
  audit1: string,
  audit2: string,
): Promise<CompareResult> {
  return api
    .get("audits/compare", { searchParams: { audit1, audit2 } })
    .json<CompareResult>();
}

export interface SuggestAuditResponse {
  status: "generated" | "already" | "empty";
  count: number;
  remaining: number | null;
}

/**
 * `POST /audits/:id/suggest` — generate AI suggestions on demand. Consumes
 * 1 `ai_calls_monthly` lượt server-side (only on `generated`). 403 (no
 * feature) / 429 (quota) are handled globally by the api error interceptor.
 */
export async function suggestAudit(id: string): Promise<SuggestAuditResponse> {
  return api.post(`audits/${id}/suggest`).json<SuggestAuditResponse>();
}
