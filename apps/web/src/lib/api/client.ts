import ky, { type KyInstance, HTTPError } from "ky";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/lib/auth/store";

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
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401) return response;
        if (request.url.includes(REFRESH_PATH)) return response;

        const newToken = await tryRefresh();
        if (newToken) {
          useAuthStore.setState({ accessToken: newToken });
          request.headers.set("Authorization", `Bearer ${newToken}`);
          return ky(request);
        }

        useAuthStore.getState().clearAuth();
        return response;
      },
    ],
  },
});

export { HTTPError };
