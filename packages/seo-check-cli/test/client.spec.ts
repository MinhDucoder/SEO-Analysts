import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeoClient, SeoApiError } from '../src/client';

describe('SeoClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('check(): POSTs JSON with Bearer header and returns parsed response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ score: 90, issues: [], meta: { enrichMode: 'llm' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const c = new SeoClient({ apiBase: 'http://x/v1', apiKey: 'sk_live_K' });
    const res = await c.check({
      input: { type: 'url', url: 'https://x' },
      targetKeyword: 'seo',
    });
    expect(res.score).toBe(90);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://x/v1/public/check');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk_live_K');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('4xx: throws SeoApiError with status + parsed code', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_API_KEY', message: 'bad key' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const c = new SeoClient({ apiBase: 'http://x/v1', apiKey: 'bad' });
    let caught: unknown;
    try {
      await c.check({ input: { type: 'url', url: 'https://x' }, targetKeyword: 's' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SeoApiError);
    expect((caught as SeoApiError).status).toBe(401);
    expect((caught as SeoApiError).code).toBe('INVALID_API_KEY');
  });

  it('network error: throws SeoApiError with status=0', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const c = new SeoClient({ apiBase: 'http://x/v1', apiKey: 'k' });
    let caught: unknown;
    try {
      await c.check({ input: { type: 'url', url: 'https://x' }, targetKeyword: 's' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SeoApiError);
    expect((caught as SeoApiError).status).toBe(0);
    expect((caught as SeoApiError).message).toContain('ECONNREFUSED');
  });
});
