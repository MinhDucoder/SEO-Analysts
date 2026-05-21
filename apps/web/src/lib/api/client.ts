import ky, { type KyInstance, HTTPError } from "ky";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/lib/auth/store";
import { useGlobalModalStore } from "@/lib/ui/global-modal-store";

/**
 * HTTP client for the gateway REST API (`/api/v1`).
 *
 * Behavior:
 * - `prefixUrl` from `NEXT_PUBLIC_API_URL` (or localhost fallback).
 * - `credentials: 'include'` so the HTTP-only `refresh_token` cookie travels.
 * - `beforeRequest` attaches `Authorization: Bearer <accessToken>` from the
 *   auth store when available.
 * - `afterResponse` handles 401 by attempting ONE silent refresh via
 *   `/auth/refresh`. On success the original request is replayed with the
 *   new bearer; on failure the store is cleared.
 */

const REFRESH_PATH = "auth/refresh";

// Single-flight refresh: if multiple 401s land concurrently, they await the
// same promise instead of hitting /auth/refresh in parallel.
let refreshInFlight: Promise<string | null> | null = null;

export async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/${REFRESH_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { accessToken?: string };
      return body.accessToken ?? null;
    } catch {
      return null;
    } finally {
      // Clear after a microtask so awaiters can read the same resolved value.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();

  return refreshInFlight;
}

export const api: KyInstance = ky.create({
  prefixUrl: API_URL,
  credentials: "include",
  timeout: 30_000,
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    beforeError: [
      async (error) => {
        try {
          // ky's HTTPError has .response; read JSON safely via clone()
          const body: unknown = await error.response?.clone().json().catch(() => null);
          const code =
            typeof body === "object" && body !== null && "code" in body
              ? String((body as { code: unknown }).code)
              : undefined;
          if (code === "QUOTA_EXCEEDED") {
            const { useQuotaDialog } = await import("@/lib/billing/quota-dialog.store");
            const b = body as { message?: string; resetAt?: string };
            useQuotaDialog.getState().show({
              title: "Đã hết quota",
              message: b?.message ?? "Bạn đã đạt giới hạn cho tháng này.",
              resetAt: b?.resetAt ?? null,
            });
          } else if (code === "FEATURE_NOT_AVAILABLE") {
            const { useQuotaDialog } = await import("@/lib/billing/quota-dialog.store");
            const b = body as { message?: string };
            useQuotaDialog.getState().show({
              title: "Tính năng không có trong gói",
              message: b?.message ?? "Tính năng này yêu cầu nâng cấp gói.",
            });
          }
        } catch {
          // never let the interceptor itself throw
        }
        return error;
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        // 401 → silent refresh + replay (or clearAuth on failure)
        if (response.status === 401) {
          if (request.url.includes(REFRESH_PATH)) return response;

          const newToken = await tryRefresh();
          if (newToken) {
            useAuthStore.setState({ accessToken: newToken });
            request.headers.set("Authorization", `Bearer ${newToken}`);
            return ky(request);
          }

          useAuthStore.getState().clearAuth();
          return response;
        }

        // 403 → surface AccountLocked modal when the body identifies as
        // a lock event. Gateway emits RFC 7807 problem-details
        // (`{ type, title, status, detail, instance, requestId }`) where
        // `detail` is a Vietnamese phrase. We accept both the legacy
        // `{ code, message }` shape (used by some seed scripts) AND the
        // RFC 7807 `detail` field, and we match Vietnamese phrasing
        // alongside English so the contract stays robust if BE retitles
        // its copy.
        if (response.status === 403) {
          const body = await response.clone().json().catch(() => null);
          let code = "";
          let phrase = "";
          if (typeof body === "object" && body !== null) {
            if ("code" in body) code = String((body as { code: unknown }).code);
            if ("message" in body) phrase += " " + String((body as { message: unknown }).message);
            if ("detail" in body) phrase += " " + String((body as { detail: unknown }).detail);
            if ("title" in body) phrase += " " + String((body as { title: unknown }).title);
          }
          phrase = phrase.toLowerCase();
          // Gateway also throttles via 403 (not 429) when the rate
          // limit trips — copy reads "Quá nhiều lần đăng nhập thất bại.
          // Thử lại sau 900s" (Vietnamese without diacritics). Extract
          // the wait-seconds and route to RateLimitModal so the user
          // sees a countdown instead of a vague 403 toast.
          const tooManyMatch = /qua nhieu|quá nhiều|too many/.test(phrase);
          if (tooManyMatch) {
            const secMatch = phrase.match(/(\d+)\s*s\b/);
            const retryAfterSec = secMatch ? Number(secMatch[1]) : 60;
            useGlobalModalStore
              .getState()
              .open({ kind: "rateLimit", retryAfterSec });
            return response;
          }
          // EN: "locked" (without "verify"); VI: "khoa" / "khóa".
          const isLock =
            code === "ACCOUNT_LOCKED" ||
            (/\b(locked|khoa|khóa)\b/.test(phrase) &&
              !/\b(verify|verif|xac minh|xác minh)\b/.test(phrase));
          if (isLock) {
            useGlobalModalStore.getState().open({ kind: "accountLocked" });
          }
          return response;
        }

        // 429 → surface RateLimit modal with the Retry-After value if
        // the gateway provided one (else default 60s).
        if (response.status === 429) {
          const retryHeader = response.headers.get("Retry-After");
          const retryAfterSec = retryHeader ? Number(retryHeader) : NaN;
          useGlobalModalStore.getState().open({
            kind: "rateLimit",
            retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : 60,
          });
          return response;
        }

        return response;
      },
    ],
  },
});

export { HTTPError };
