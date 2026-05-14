/**
 * Error-code dispatch for `POST /api/v1/public/check`. The 16 codes
 * documented at `docs/public-api/error-codes.md` are mapped to a small
 * set of UX intents so the popup can render the same kind of toast /
 * action for related failures without writing 16 branches by hand.
 *
 * `code` is the stable identifier (won't change across versions).
 * `message` is human-readable and may change — never dispatch on it.
 */

/** Stable error code emitted by the gateway's PublicApiExceptionFilter. */
export type PublicApiErrorCode =
  | 'INVALID_JSON'
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'KEY_DISABLED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INPUT_TYPE_MISMATCH'
  | 'INVALID_URL'
  | 'INVALID_MARKDOWN'
  | 'MISSING_TARGET_KEYWORD'
  | 'URL_FETCH_FAILED'
  | 'URL_FETCH_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL'
  | 'ANALYZER_UNAVAILABLE'
  | 'CRAWLER_UNAVAILABLE'
  | 'SERVICE_UNAVAILABLE'
  // Client-side synthesised codes (never returned by the gateway, but
  // the popup needs to distinguish them from network errors).
  | 'CLIENT_NETWORK_ERROR'
  | 'CLIENT_PAYLOAD_TOO_LARGE'
  | 'CLIENT_UNKNOWN';

export type ErrorAction =
  | 'OPEN_OPTIONS' // missing/invalid/disabled key
  | 'RETRY_LATER' // rate limit (with countdown)
  | 'FALLBACK_TO_HTML' // url-fetch failure → try DOM scrape
  | 'REDUCE_PAYLOAD' // 413: drop noise from HTML, then retry
  | 'INPUT_FIX' // bad URL, missing keyword, etc.
  | 'SHOW_SERVER_OUTAGE' // upstream unavailable
  | 'SHOW_GENERIC'; // internal / unknown

/** Map the stable code to a UX intent. */
export function dispatchErrorCode(code: string): ErrorAction {
  switch (code as PublicApiErrorCode) {
    case 'MISSING_API_KEY':
    case 'INVALID_API_KEY':
    case 'KEY_DISABLED':
      return 'OPEN_OPTIONS';
    case 'RATE_LIMIT_EXCEEDED':
      return 'RETRY_LATER';
    case 'URL_FETCH_FAILED':
    case 'URL_FETCH_TIMEOUT':
      return 'FALLBACK_TO_HTML';
    case 'PAYLOAD_TOO_LARGE':
    case 'CLIENT_PAYLOAD_TOO_LARGE':
      return 'REDUCE_PAYLOAD';
    case 'INVALID_URL':
    case 'INVALID_MARKDOWN':
    case 'MISSING_TARGET_KEYWORD':
    case 'INPUT_TYPE_MISMATCH':
    case 'INVALID_JSON':
      return 'INPUT_FIX';
    case 'ANALYZER_UNAVAILABLE':
    case 'CRAWLER_UNAVAILABLE':
    case 'SERVICE_UNAVAILABLE':
      return 'SHOW_SERVER_OUTAGE';
    case 'INTERNAL':
    case 'CLIENT_NETWORK_ERROR':
    case 'CLIENT_UNKNOWN':
    default:
      return 'SHOW_GENERIC';
  }
}

/**
 * The error thrown by `client.check()`. Carries the stable code, the
 * HTTP status (or 0 for synthesised network errors), the human-readable
 * message, and optionally the server-returned requestId + Retry-After
 * seconds so the popup can show "retry in 12s" and "request id req_..."
 * to support bug reports.
 */
export class PublicApiError extends Error {
  readonly code: PublicApiErrorCode;
  readonly status: number;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(args: {
    code: PublicApiErrorCode;
    message: string;
    status: number;
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    super(args.message);
    this.name = 'PublicApiError';
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.retryAfterSeconds = args.retryAfterSeconds;
  }

  get action(): ErrorAction {
    return dispatchErrorCode(this.code);
  }
}
