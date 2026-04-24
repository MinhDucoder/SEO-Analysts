// Public-API surface (gateway /api/v1/public/*) — shared types + Redis key
// namespaces + rate-limit / cache constants. Lives here because multiple
// services (gateway, seo-analyzer, potentially crawler) need the same names.

export type IssueAudience = 'writer' | 'dev';
export type IssueSeverity = 'info' | 'warning' | 'error';
export type EnrichMode = 'off' | 'template' | 'llm';
export type PublicApiLanguage = 'vi' | 'en';
export type ApiKeyEnvironment = 'live' | 'test';
export type AnalyzeModeName = 'content_only' | 'full';

export type PublicRuleCategory =
  | 'content'
  | 'meta'
  | 'technical'
  | 'accessibility'
  | 'headings'
  | 'images'
  | 'links'
  | 'performance';

export const PUBLIC_API_REDIS_KEYS = {
  apiKeyVerify: (hash: string) => `apikey:${hash}` as const,
  rateLimitMinute: (keyId: string) => `rl:pubcheck:min:${keyId}` as const,
  rateLimitDay: (keyId: string) => `rl:pubcheck:day:${keyId}` as const,
  rateLimitConcurrency: (keyId: string) => `rl:pubcheck:concur:${keyId}` as const,
  rateLimitIp: (ip: string) => `rl:pubcheck:ip:${ip}` as const,
  publicCheckResponse: (hash: string) => `public-check:${hash}` as const,
  liteFetch: (hash: string) => `lite-fetch:${hash}` as const,
  suggest: (hash: string) => `suggest:${hash}` as const,
  rulesList: (lang: string) => `rules-list:${lang}` as const,
  usage: (
    keyId: string,
    date: string,
    field: 'requests' | 'llm_calls' | 'errors' | 'cache_hits',
  ) => `usage:${keyId}:${date}:${field}` as const,
} as const;

export const PUBLIC_API_RATE_LIMITS = {
  PER_KEY_MINUTE: 20,
  PER_KEY_DAY: 500,
  PER_KEY_CONCURRENCY: 5,
  PER_IP_MINUTE: 100,
  PAYLOAD_MAX_BYTES: 200 * 1024,
  URL_FETCH_TIMEOUT_MS: 10_000,
  LLM_TIMEOUT_MS: 8_000,
} as const;

/**
 * Cache schema version for /public/check responses. Bump when the
 * analyzer rule semantics, enrichment prompt, or response shape change
 * — bumping this string invalidates ALL cached check responses.
 *
 * Override at runtime via `PUBLIC_API_CACHE_SCHEMA_VERSION` env var so
 * ops can flush cache without a redeploy.
 */
export const PUBLIC_API_CACHE_SCHEMA_VERSION = '1.2.0';

export const PUBLIC_API_CACHE_TTL = {
  API_KEY_VERIFY_SECONDS: 60,
  PUBLIC_CHECK_LLM_SECONDS: 3600,
  PUBLIC_CHECK_TEMPLATE_SECONDS: 600,
  LITE_FETCH_SECONDS: 3600,
  SUGGEST_SECONDS: 3600,
  RULES_LIST_SECONDS: 600,
  USAGE_COUNTER_SECONDS: 48 * 3600,
} as const;
