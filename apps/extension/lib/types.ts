/**
 * Local type surface for the extension. Phase 1 only needs the
 * environment / language enums shared with the gateway public API.
 * Phase 2 will add `PublicCheckRequest` / `PublicCheckResponse` once
 * the consumer code is written.
 */
export type ApiKeyEnvironment = 'live' | 'test';
export type PublicApiLanguage = 'vi' | 'en';

/** Messages exchanged across the extension's runtime boundaries. */
export type ExtensionMessage =
  | { type: 'OPEN_OPTIONS' }
  | { type: 'API_KEY_SAVED'; environment: ApiKeyEnvironment }
  | { type: 'API_KEY_CLEARED' };
