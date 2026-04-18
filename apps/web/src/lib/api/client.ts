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
 *   `/auth/refresh`. Slug 1 ships this as a stub — refresh currently returns
 *   null (no network call), and the interceptor just clears auth on 401.
 *   Slug 2 (auth-flow) replaces `tryRefresh()` with the real impl.
 */

const REFRESH_PATH = "auth/refresh";

async function tryRefresh(): Promise<string | null> {
  // STUB — real impl in slug 2:
  //   const res = await ky.post(`${API_URL}/${REFRESH_PATH}`, {
  //     credentials: "include",
  //   }).json<{ accessToken: string }>();
  //   return res.accessToken;
  return null;
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
