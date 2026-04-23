import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient, ApiError } from '../src/lib/api';

describe('ApiClient', () => {
  const tokens = {
    get: vi.fn<() => string | null>(),
    set: vi.fn<(t: string | null) => void>(),
  };

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tokens.get.mockReset();
    tokens.set.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeClient() {
    return new ApiClient('http://api.test/v1', tokens);
  }

  it('GET: passes Authorization header when token present', async () => {
    tokens.get.mockReturnValue('jwt-1');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const r = await makeClient().get<{ ok: boolean }>('/ping');
    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-1');
    expect(init.credentials).toBe('include');
  });

  it('POST: sends JSON body + content-type header', async () => {
    tokens.get.mockReturnValue(null);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await makeClient().post<void>('/auth/logout', { foo: 'bar' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ foo: 'bar' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('401: calls /auth/refresh, retries original with new token on success', async () => {
    tokens.get.mockReturnValueOnce('stale').mockReturnValueOnce('fresh');
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'fresh' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const r = await makeClient().get<{ ok: boolean }>('/me');
    expect(r).toEqual({ ok: true });
    expect(tokens.set).toHaveBeenCalledWith('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryInit = fetchMock.mock.calls[2]![1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh');
  });

  it('401 then refresh fails: throws ApiError(401), clears token', async () => {
    tokens.get.mockReturnValue('stale');
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(makeClient().get('/me')).rejects.toThrow(ApiError);
    expect(tokens.set).toHaveBeenCalledWith(null);
  });

  it('non-2xx: throws ApiError with parsed body', async () => {
    tokens.get.mockReturnValue(null);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID', message: 'bad' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    );
    let caught: unknown;
    try {
      await makeClient().post('/auth/login', {});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(422);
    expect((caught as ApiError).code).toBe('INVALID');
  });
});
