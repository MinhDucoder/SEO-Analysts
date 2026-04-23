# JavaScript SDK snippet

No npm package in v0.1. Copy-paste this 40-line TypeScript snippet into your project — zero deps, works in Node 18+ and modern browsers.

```typescript
// seo-client.ts
export interface PublicCheckRequest {
  input:
    | { type: 'url'; url: string }
    | { type: 'markdown'; markdown: string }
    | { type: 'html'; html: string };
  targetKeyword: string;
  secondaryKeywords?: string[];
  options?: {
    enrichMode?: 'off' | 'template' | 'llm';
    language?: 'vi' | 'en';
    includeSummary?: boolean;
    filter?: {
      categories?: string[];
      audiences?: Array<'writer' | 'dev'>;
      minSeverity?: 'info' | 'warning' | 'error';
    };
  };
}

export class SeoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SeoApiError';
  }
}

export class SeoClient {
  constructor(private readonly apiBase: string, private readonly apiKey: string) {}

  async check<T = unknown>(body: PublicCheckRequest): Promise<T> {
    const res = await fetch(`${this.apiBase}/public/check`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const p = payload as { message?: string; code?: string } | null;
      throw new SeoApiError(p?.message ?? `HTTP ${res.status}`, res.status, p?.code, payload);
    }
    return payload as T;
  }
}
```

## Usage

```typescript
import { SeoClient, SeoApiError } from './seo-client';

const client = new SeoClient('http://localhost:3000/api/v1', process.env.SEO_API_KEY!);

try {
  const res = await client.check({
    input: { type: 'url', url: 'https://your-blog.com/post' },
    targetKeyword: 'seo 2026',
    options: { enrichMode: 'llm', language: 'vi' },
  });
  console.log(`Score: ${(res as any).score}`);
} catch (err) {
  if (err instanceof SeoApiError && err.status === 429) {
    /* back off based on Retry-After */
  }
  throw err;
}
```

For stricter typing of the response, mirror the `PublicCheckResponse` shape from [output-schema.md](./output-schema.md).
