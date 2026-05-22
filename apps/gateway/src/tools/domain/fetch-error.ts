export const FETCH_ERROR_CODES = [
  'SSRF_BLOCKED',
  'TIMEOUT',
  'TOO_LARGE',
  'INVALID_PROTOCOL',
  'INVALID_PORT',
  'BAD_STATUS',
  'TOO_MANY_REDIRECTS',
  'DNS_FAIL',
] as const;
export type FetchErrorCode = (typeof FETCH_ERROR_CODES)[number];

export class FetchError extends Error {
  constructor(
    public readonly code: FetchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}
