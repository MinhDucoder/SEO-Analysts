"use client";

import { useQuery } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { getSharedReport } from "@/lib/api/shared";
import type { ReportDetail } from "@/lib/api/types";
import { queryKeys } from "@/lib/queries/keys";

/**
 * `GET /shared/audits/:token` — public, no auth gating. Returns the same
 * `ReportDetail` shape as the authenticated detail endpoint.
 *
 * Retries are skipped on 404 because revoked/unknown tokens are terminal;
 * other failures fall back to the default react-query retry behaviour.
 */
export function useSharedReport(token: string | null | undefined) {
  const safeToken = token ?? "";
  return useQuery<ReportDetail>({
    queryKey: safeToken
      ? queryKeys.shared.detail(safeToken)
      : ["shared", "detail", "noop"],
    queryFn: () => getSharedReport(safeToken),
    enabled: Boolean(safeToken),
    // `'always'` keeps the query firing even when the runtime reports
    // offline — without it react-query pauses on a network failure and
    // the page would stay stuck in the loading branch instead of
    // surfacing the error to the guest.
    networkMode: "always",
    retry: (failureCount, error) => {
      if (error instanceof HTTPError && error.response.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1_000,
  });
}
