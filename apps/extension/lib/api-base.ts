/**
 * Base URL of the gateway public API. Dev defaults to localhost; the
 * production build (`wxt build`) sets `WXT_API_BASE_URL` via the env
 * variable so the same code targets the live host without code edits.
 *
 * Reading via `import.meta.env` keeps it tree-shakable and lets the
 * popup display the configured host in the "About" footer once the
 * UX polish phase lands.
 */
declare const __EXT_DEV__: boolean | undefined;

export function resolveApiBaseUrl(): string {
  const fromEnv =
    typeof import.meta !== 'undefined' &&
    typeof (import.meta as unknown as { env?: Record<string, string> }).env !==
      'undefined'
      ? (import.meta as unknown as { env?: Record<string, string> }).env?.[
          'WXT_API_BASE_URL'
        ]
      : undefined;
  if (fromEnv) return fromEnv;
  // Sensible dev default — the gateway listens on 3000 locally.
  return 'http://localhost:3000';
}

// Available for tests / explicit overrides.
export const API_BASE_URL = resolveApiBaseUrl();

// Silence "unused" warning for the dev sentinel constant if imported.
export const __EXT_DEV_SENTINEL__ = typeof __EXT_DEV__ === 'boolean';
