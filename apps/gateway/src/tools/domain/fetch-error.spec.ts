import { describe, it, expect } from 'vitest';
import { FetchError, FETCH_ERROR_CODES } from './fetch-error';

describe('FetchError', () => {
  it('carries code + message', () => {
    const e = new FetchError('SSRF_BLOCKED', 'blocked by policy');
    expect(e.code).toBe('SSRF_BLOCKED');
    expect(e.message).toBe('blocked by policy');
    expect(e.name).toBe('FetchError');
    expect(e).toBeInstanceOf(Error);
  });

  it('exposes all expected codes', () => {
    expect(FETCH_ERROR_CODES).toEqual(
      expect.arrayContaining([
        'SSRF_BLOCKED',
        'TIMEOUT',
        'TOO_LARGE',
        'INVALID_PROTOCOL',
        'INVALID_PORT',
        'BAD_STATUS',
        'TOO_MANY_REDIRECTS',
        'DNS_FAIL',
      ]),
    );
  });
});
