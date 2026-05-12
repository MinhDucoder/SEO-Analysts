import ky from "ky";
import type { ReportDetail } from "@/lib/api/types";
import { API_URL } from "@/lib/constants";

/**
 * Public ky instance — no Authorization header, no refresh interceptor.
 * The gateway `/shared/audits/:token` endpoint is unauthenticated; sending a
 * bearer token would still work but uselessly triggers the 401 → refresh
 * dance for guests reading shared links.
 */
const publicApi = ky.create({
  prefixUrl: API_URL,
  timeout: 30_000,
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
});

/**
 * `GET /shared/audits/:token` — returns the same `ReportDetail` shape as
 * `audits/:id`.report. 404 when the token is unknown or revoked.
 */
export async function getSharedReport(token: string): Promise<ReportDetail> {
  return publicApi.get(`shared/audits/${encodeURIComponent(token)}`).json<ReportDetail>();
}
