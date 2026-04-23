/**
 * @file HTTP client for the gateway REST API. Injects Bearer JWT,
 * attempts one silent refresh on 401, and throws ApiError with a
 * structured `{code, message, details}` shape for non-2xx responses.
 *
 * Refresh is cookie-based — we send `credentials: 'include'` so the
 * gateway's HTTP-only `refresh_token` cookie (path=/api/v1/auth) is
 * attached to `/auth/refresh`.
 */

export interface TokenStore {
  get(): string | null;
  set(token: string | null): void;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiClient {
  private refreshing: Promise<string | null> | null = null;

  constructor(private readonly baseUrl: string, private readonly tokens: TokenStore) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = this.tokens.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
      const fresh = await this.attemptRefresh();
      if (fresh) return this.request<T>(method, path, body, true);
    }

    if (!res.ok) {
      const payload = await this.safeJson(res);
      throw new ApiError(
        (payload as { message?: string })?.message ?? `HTTP ${res.status}`,
        res.status,
        (payload as { code?: string })?.code,
        payload,
      );
    }

    if (res.status === 204) return undefined as T;
    const ctype = res.headers.get('content-type') ?? '';
    if (!ctype.includes('application/json')) return undefined as T;
    return (await res.json()) as T;
  }

  private async attemptRefresh(): Promise<string | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          this.tokens.set(null);
          return null;
        }
        const body = (await res.json()) as { accessToken: string };
        this.tokens.set(body.accessToken);
        return body.accessToken;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  private async safeJson(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
}

const ACCESS_TOKEN_KEY = 'seo-web-access-token';

export function browserTokenStore(): TokenStore {
  return {
    get: () =>
      typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY),
    set: (t) => {
      if (typeof window === 'undefined') return;
      if (t) window.localStorage.setItem(ACCESS_TOKEN_KEY, t);
      else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    },
  };
}
