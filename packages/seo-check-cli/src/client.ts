export interface SeoClientOptions {
  apiBase: string;
  apiKey: string;
}

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

export interface SuggestionOut {
  type: 'rewrite' | 'add' | 'remove' | 'reorder';
  text: string;
  rationale: string;
}

export interface IssueOut {
  ruleId: string;
  severity: 'info' | 'warning' | 'error';
  category: string;
  audience: Array<'writer' | 'dev'>;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestion: SuggestionOut | null;
  docRef?: string;
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: IssueOut[];
  summary?: { writer: string; dev: string };
  meta: {
    inputType: 'url' | 'markdown' | 'html';
    resolvedUrl?: string;
    contentStats: { words: number; characters: number; readingTimeSec: number };
    processingTimeMs: number;
    ruleVersion: string;
    enrichMode: 'off' | 'template' | 'llm';
    suggestionSource: 'llm' | 'template' | 'mixed' | 'none';
    degraded: boolean;
    cached: boolean;
    requestId: string;
    usage: {
      remaining: { minute: number; day: number };
      resetAt: { minute: string; day: string };
    };
  };
}

export class SeoApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly raw?: unknown;
  constructor(message: string, status: number, code?: string, raw?: unknown) {
    super(message);
    this.name = 'SeoApiError';
    this.status = status;
    this.code = code;
    this.raw = raw;
  }
}

export class SeoClient {
  constructor(private readonly opts: SeoClientOptions) {}

  async check(body: PublicCheckRequest): Promise<PublicCheckResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.opts.apiBase}/public/check`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new SeoApiError(
        err instanceof Error ? err.message : 'network error',
        0,
        'NETWORK',
        err,
      );
    }
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) {
      const p = parsed as { message?: string; code?: string } | null;
      throw new SeoApiError(
        p?.message ?? `HTTP ${res.status}`,
        res.status,
        p?.code,
        parsed,
      );
    }
    return parsed as PublicCheckResponse;
  }
}
