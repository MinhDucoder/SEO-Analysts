/**
 * Bearer-fetch wrapper around `POST /api/v1/public/check`.
 *
 * Mirrors `packages/seo-check-cli/src/client.ts` so the same auth and
 * error-mapping contract holds across both clients. Specifically:
 *   - Always `Authorization: Bearer sk_...` (API key)
 *   - Always `X-Install-Id: <installId>` (device binding)
 *   - Always `Content-Type: application/json`
 *   - On non-2xx, parses the documented `{statusCode, code, message,
 *     requestId, details?}` envelope and throws `PublicApiError`
 *     carrying the stable `code` for downstream UX dispatch.
 *   - On network failure (no response, DNS, abort) synthesises
 *     `CLIENT_NETWORK_ERROR` — distinct from any server-emitted code.
 *
 * The base URL is provided by the caller (the service worker reads it
 * from `chrome.storage.local`, falling back to `http://localhost:3000`
 * for dev). Keep this surface tiny — the popup never imports `fetch`.
 */
import { PublicApiError, type PublicApiErrorCode } from './errors';
import type {
  PublicApiErrorBody,
  PublicCheckRequest,
  PublicCheckResponse,
} from './api-types';

export interface CheckArgs {
  apiKey: string;
  installId: string;
  baseUrl: string;
  body: PublicCheckRequest;
  /** Optional AbortSignal — popup wires this so cancellation works. */
  signal?: AbortSignal;
  /** Allows tests to inject a stub. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_PATH = '/api/v1/public/check';

export async function check(args: CheckArgs): Promise<PublicCheckResponse> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const url = trimSlash(args.baseUrl) + DEFAULT_PATH;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${args.apiKey}`,
        'x-install-id': args.installId,
        'content-type': 'application/json',
      },
      body: JSON.stringify(args.body),
      signal: args.signal,
    });
  } catch (e) {
    // No HTTP response at all (DNS failure, aborted, offline, CORS
    // pre-flight failed, etc.). Surface a stable synthetic code so the
    // popup can branch without sniffing the raw error message.
    throw new PublicApiError({
      code: 'CLIENT_NETWORK_ERROR',
      message: e instanceof Error ? e.message : String(e),
      status: 0,
    });
  }

  if (res.ok) {
    return (await res.json()) as PublicCheckResponse;
  }

  // Parse the documented error envelope. Even on a 5xx the gateway's
  // filter should return JSON; if it ever returns HTML / empty body we
  // fall through to `CLIENT_UNKNOWN`.
  let body: Partial<PublicApiErrorBody> = {};
  try {
    body = (await res.json()) as Partial<PublicApiErrorBody>;
  } catch {
    // intentional — handled below
  }

  const retryAfterRaw = res.headers.get('retry-after');
  const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;

  throw new PublicApiError({
    code: (body.code as PublicApiErrorCode | undefined) ?? 'CLIENT_UNKNOWN',
    message: body.message ?? res.statusText ?? `HTTP ${res.status}`,
    status: res.status,
    requestId: body.requestId,
    retryAfterSeconds:
      Number.isFinite(retryAfter) && retryAfter !== undefined ? retryAfter : undefined,
  });
}

function trimSlash(u: string): string {
  return u.endsWith('/') ? u.slice(0, -1) : u;
}
