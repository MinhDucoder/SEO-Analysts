import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, dedupeUrls, sameRegistrableDomain } from '../../src/crawler/domain/url-canonicalizer';

describe('canonicalizeUrl', () => {
  it('lowercases the host', () => {
    expect(canonicalizeUrl('https://Example.COM/path')).toBe('https://example.com/path');
  });

  it('preserves scheme case as-is (https stays https, http stays http)', () => {
    expect(canonicalizeUrl('https://example.com/')).toBe('https://example.com/');
    expect(canonicalizeUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('drops the fragment', () => {
    expect(canonicalizeUrl('https://example.com/path#section')).toBe('https://example.com/path');
  });

  it('strips tracking query params (utm_*, gclid, fbclid)', () => {
    expect(canonicalizeUrl('https://example.com/?utm_source=x&utm_medium=y&real=1'))
      .toBe('https://example.com/?real=1');
    expect(canonicalizeUrl('https://example.com/?gclid=abc&id=5')).toBe('https://example.com/?id=5');
    expect(canonicalizeUrl('https://example.com/?fbclid=xxx')).toBe('https://example.com/');
  });

  it('strips session-id query params (jsessionid, phpsessid, sid)', () => {
    expect(canonicalizeUrl('https://example.com/?jsessionid=abc123')).toBe('https://example.com/');
    expect(canonicalizeUrl('https://example.com/?PHPSESSID=xyz')).toBe('https://example.com/');
    expect(canonicalizeUrl('https://example.com/?sid=999&real=1')).toBe('https://example.com/?real=1');
  });

  it('sorts remaining query params alphabetically for stable dedup', () => {
    const a = canonicalizeUrl('https://example.com/?b=2&a=1');
    const b = canonicalizeUrl('https://example.com/?a=1&b=2');
    expect(a).toBe(b);
  });

  it('removes the default port (80 for http, 443 for https)', () => {
    expect(canonicalizeUrl('https://example.com:443/path')).toBe('https://example.com/path');
    expect(canonicalizeUrl('http://example.com:80/path')).toBe('http://example.com/path');
  });

  it('keeps non-default ports', () => {
    expect(canonicalizeUrl('https://example.com:8443/path')).toBe('https://example.com:8443/path');
  });

  it('normalizes trailing slash on root path', () => {
    expect(canonicalizeUrl('https://example.com')).toBe('https://example.com/');
    expect(canonicalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('does not force trailing slash on deep paths', () => {
    expect(canonicalizeUrl('https://example.com/about')).toBe('https://example.com/about');
    expect(canonicalizeUrl('https://example.com/about/')).toBe('https://example.com/about/');
  });

  it('rejects invalid URLs by returning null', () => {
    expect(canonicalizeUrl('not a url')).toBeNull();
    expect(canonicalizeUrl('')).toBeNull();
    expect(canonicalizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects non-http(s) schemes', () => {
    expect(canonicalizeUrl('ftp://example.com/')).toBeNull();
    expect(canonicalizeUrl('file:///etc/passwd')).toBeNull();
  });
});

describe('dedupeUrls', () => {
  it('returns distinct canonical URLs in first-seen order', () => {
    const result = dedupeUrls([
      'https://example.com/?utm_source=x',
      'https://example.com/',
      'https://Example.COM',
      'https://example.com/?a=1',
      'https://example.com/?a=1&utm_medium=y',
    ]);
    expect(result).toEqual([
      'https://example.com/',
      'https://example.com/?a=1',
    ]);
  });

  it('drops unparseable URLs silently', () => {
    const result = dedupeUrls(['https://example.com/', 'not a url', '']);
    expect(result).toEqual(['https://example.com/']);
  });
});

describe('sameRegistrableDomain', () => {
  it('matches bare host vs www', () => {
    expect(sameRegistrableDomain('https://example.com/', 'https://www.example.com/')).toBe(true);
  });

  it('matches same eTLD+1 across subdomains', () => {
    expect(sameRegistrableDomain('https://blog.example.com/a', 'https://shop.example.com/b')).toBe(true);
  });

  it('rejects different registrable domains', () => {
    expect(sameRegistrableDomain('https://example.com/', 'https://other.com/')).toBe(false);
  });

  it('rejects invalid URL inputs', () => {
    expect(sameRegistrableDomain('not a url', 'https://example.com/')).toBe(false);
  });
});
