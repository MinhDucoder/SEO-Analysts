import { describe, it, expect } from 'vitest';
import { PublicApiError, dispatchErrorCode } from '../lib/errors';

describe('dispatchErrorCode', () => {
  const cases: Array<[string, ReturnType<typeof dispatchErrorCode>]> = [
    ['MISSING_API_KEY', 'OPEN_OPTIONS'],
    ['INVALID_API_KEY', 'OPEN_OPTIONS'],
    ['KEY_DISABLED', 'OPEN_OPTIONS'],
    ['RATE_LIMIT_EXCEEDED', 'RETRY_LATER'],
    ['URL_FETCH_FAILED', 'FALLBACK_TO_HTML'],
    ['URL_FETCH_TIMEOUT', 'FALLBACK_TO_HTML'],
    ['PAYLOAD_TOO_LARGE', 'REDUCE_PAYLOAD'],
    ['CLIENT_PAYLOAD_TOO_LARGE', 'REDUCE_PAYLOAD'],
    ['INVALID_URL', 'INPUT_FIX'],
    ['INVALID_MARKDOWN', 'INPUT_FIX'],
    ['MISSING_TARGET_KEYWORD', 'INPUT_FIX'],
    ['INPUT_TYPE_MISMATCH', 'INPUT_FIX'],
    ['INVALID_JSON', 'INPUT_FIX'],
    ['ANALYZER_UNAVAILABLE', 'SHOW_SERVER_OUTAGE'],
    ['CRAWLER_UNAVAILABLE', 'SHOW_SERVER_OUTAGE'],
    ['SERVICE_UNAVAILABLE', 'SHOW_SERVER_OUTAGE'],
    ['INTERNAL', 'SHOW_GENERIC'],
    ['CLIENT_NETWORK_ERROR', 'SHOW_GENERIC'],
    ['CLIENT_UNKNOWN', 'SHOW_GENERIC'],
    ['UNKNOWN_FUTURE_CODE', 'SHOW_GENERIC'],
  ];

  it.each(cases)('%s → %s', (code, action) => {
    expect(dispatchErrorCode(code)).toBe(action);
  });
});

describe('PublicApiError', () => {
  it('carries stable code + status + optional metadata', () => {
    const e = new PublicApiError({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'too many',
      status: 429,
      requestId: 'req_abc',
      retryAfterSeconds: 30,
    });
    expect(e.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(e.status).toBe(429);
    expect(e.requestId).toBe('req_abc');
    expect(e.retryAfterSeconds).toBe(30);
    expect(e.action).toBe('RETRY_LATER');
    expect(e instanceof Error).toBe(true);
  });
});
