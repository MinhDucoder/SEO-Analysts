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
  | { type: 'API_KEY_CLEARED' }
  | {
      type: 'AUDIT_PAGE';
      targetKeyword: string;
      language?: PublicApiLanguage;
      secondaryKeywords?: string[];
    }
  /** Content-script request envelope. `needHtml=false` is a cheap probe
   * to decide URL vs HTML mode; `needHtml=true` returns the serialised
   * payload (capped at 200 KB per scraper.ts). `aggressive=true` drops
   * nav/footer/sidebars too — used after a 413 to shrink further. */
  | { type: 'EXTRACT_FOR_CHECK'; needHtml: boolean; aggressive?: boolean };

export interface ContentScrapeProbe {
  url: string;
  isAuthGated: boolean;
  html?: string;
}
