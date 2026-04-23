/**
 * @file SSR-safe wrappers around localStorage for the playground.
 * Each accessor returns null on the server and guards against
 * JSON.parse exceptions from corrupted values.
 */
import type { PublicCheckInput } from '@/types/api';

const KEY_API = 'seo-playground-api-key';
const KEY_INPUT = 'seo-playground-input';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredApiKey(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(KEY_API);
}

export function setStoredApiKey(value: string | null): void {
  if (!hasWindow()) return;
  if (value === null || value === '') window.localStorage.removeItem(KEY_API);
  else window.localStorage.setItem(KEY_API, value);
}

export function getStoredInput(): PublicCheckInput | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(KEY_INPUT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicCheckInput;
  } catch {
    return null;
  }
}

export function setStoredInput(value: PublicCheckInput | null): void {
  if (!hasWindow()) return;
  if (value === null) window.localStorage.removeItem(KEY_INPUT);
  else window.localStorage.setItem(KEY_INPUT, JSON.stringify(value));
}
