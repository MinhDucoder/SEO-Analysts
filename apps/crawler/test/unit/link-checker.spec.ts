import { describe, it, expect } from 'vitest';
import { LinkChecker } from '../../src/crawler/infra/fetchers/link-checker';

type FetchCall = { url: string; init?: RequestInit };
type ResponderOutput = { status: number; location?: string } | Error;

function mockFetch(
  responder: (call: FetchCall) => ResponderOutput | Promise<ResponderOutput>,
): { fetch: (url: string, init?: RequestInit) => Promise<Response>; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    const out = await responder({ url, init });
    if (out instanceof Error) throw out;
    return new Response(null, {
      status: out.status,
      headers: out.location ? { location: out.location } : undefined,
    });
  };
  return { fetch: fetchFn, calls };
}

describe('LinkChecker', () => {
  it('returns isBroken=false for a 2xx HEAD response', async () => {
    const { fetch } = mockFetch(() => ({ status: 200 }));
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/ok');

    expect(result).toMatchObject({
      href: 'https://example.com/ok',
      status: 200,
      isBroken: false,
      redirectChain: [],
    });
    expect(result.reason).toBeUndefined();
  });

  it('marks 4xx responses as broken with reason=HTTP_4XX', async () => {
    const { fetch } = mockFetch(() => ({ status: 404 }));
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/missing');

    expect(result).toMatchObject({
      status: 404,
      isBroken: true,
      reason: 'HTTP_4XX',
    });
  });

  it('marks 5xx responses as broken with reason=HTTP_5XX', async () => {
    const { fetch } = mockFetch(() => ({ status: 503 }));
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/down');

    expect(result).toMatchObject({ status: 503, isBroken: true, reason: 'HTTP_5XX' });
  });

  it('follows redirects and records each hop in the chain', async () => {
    let hop = 0;
    const { fetch, calls } = mockFetch(() => {
      hop++;
      if (hop === 1) return { status: 301, location: 'https://example.com/2' };
      if (hop === 2) return { status: 302, location: 'https://example.com/final' };
      return { status: 200 };
    });
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/1');

    expect(result.status).toBe(200);
    expect(result.isBroken).toBe(false);
    expect(result.redirectChain).toEqual([
      'https://example.com/1',
      'https://example.com/2',
    ]);
    expect(calls).toHaveLength(3);
  });

  it('marks TOO_MANY_REDIRECTS when the redirect chain exceeds the max', async () => {
    const { fetch } = mockFetch(({ url }) => ({
      status: 301,
      location: url + 'x',
    }));
    const checker = new LinkChecker(fetch, { maxRedirects: 3 });

    const result = await checker.checkOne('https://example.com/loop');

    expect(result.isBroken).toBe(true);
    expect(result.reason).toBe('TOO_MANY_REDIRECTS');
    expect(result.redirectChain.length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to GET when HEAD returns 405/501', async () => {
    const { fetch, calls } = mockFetch(({ init }) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'HEAD') return { status: 405 };
      return { status: 200 };
    });
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/head-blocked');

    expect(result.status).toBe(200);
    expect(result.isBroken).toBe(false);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe('HEAD');
    expect(calls[1]?.init?.method).toBe('GET');
  });

  it('treats network errors as broken with reason=NETWORK', async () => {
    const { fetch } = mockFetch(() => new TypeError('ECONNREFUSED'));
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/offline');

    expect(result.isBroken).toBe(true);
    expect(result.reason).toBe('NETWORK');
    expect(result.status).toBe(0);
  });

  it('treats AbortError as TIMEOUT', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const { fetch } = mockFetch(() => abortErr);
    const checker = new LinkChecker(fetch);

    const result = await checker.checkOne('https://example.com/slow');

    expect(result.isBroken).toBe(true);
    expect(result.reason).toBe('TIMEOUT');
  });

  it('checkAll returns one result per input href (same order)', async () => {
    const statuses = new Map<string, number>([
      ['https://a.com/1', 200],
      ['https://a.com/2', 404],
      ['https://b.com/1', 301],
    ]);
    let redirectServed = false;
    const { fetch } = mockFetch(({ url }) => {
      if (url === 'https://b.com/1' && !redirectServed) {
        redirectServed = true;
        return { status: 301, location: 'https://b.com/final' };
      }
      if (url === 'https://b.com/final') return { status: 200 };
      return { status: statuses.get(url) ?? 500 };
    });
    const checker = new LinkChecker(fetch);

    const results = await checker.checkAll([
      'https://a.com/1',
      'https://a.com/2',
      'https://b.com/1',
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ href: 'https://a.com/1', isBroken: false });
    expect(results[1]).toMatchObject({ href: 'https://a.com/2', isBroken: true, reason: 'HTTP_4XX' });
    expect(results[2]).toMatchObject({ href: 'https://b.com/1', status: 200, isBroken: false });
  });

  it('checkAll honours per-host concurrency so one slow host never blocks others', async () => {
    const inflightPerHost: Record<string, number> = {};
    let maxPerHost = 0;

    const { fetch } = mockFetch(async ({ url }) => {
      const host = new URL(url).host;
      inflightPerHost[host] = (inflightPerHost[host] ?? 0) + 1;
      maxPerHost = Math.max(maxPerHost, inflightPerHost[host]!);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inflightPerHost[host] = inflightPerHost[host]! - 1;
      return { status: 200 };
    });

    const checker = new LinkChecker(fetch, { perHostConcurrency: 2 });
    const hrefs = Array.from({ length: 10 }, (_, i) => `https://slow.example/p${i}`);

    await checker.checkAll(hrefs);

    expect(maxPerHost).toBeLessThanOrEqual(2);
  });
});
