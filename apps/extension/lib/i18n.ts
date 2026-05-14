/**
 * Runtime i18n dict + storage helper. Manual dict (not chrome.i18n)
 * because the popup/sidepanel must switch language without an
 * extension reload — `chrome.i18n.getMessage` resolves at install
 * time only.
 *
 * `chrome.i18n` is still used for the static manifest fields
 * (extName/extDesc) via _locales/ — see spec § 2.4.
 */
import { vi } from './messages.vi';
import { en } from './messages.en';

export type Locale = 'vi' | 'en';
export type Messages = typeof vi;

const DICT: Record<Locale, Messages> = { vi, en };
const STORAGE_KEY = 'uiLocale';

function detectFromBrowser(): Locale {
  if (typeof navigator === 'undefined') return 'vi';
  const lang = (navigator.language || 'vi').toLowerCase();
  return lang.startsWith('vi') ? 'vi' : 'en';
}

export function getDict(locale: Locale): Messages {
  return DICT[locale];
}

export async function loadUiLocale(): Promise<Locale> {
  try {
    const out = (await chrome.storage.local.get(STORAGE_KEY)) as Record<
      string,
      unknown
    >;
    const v = out[STORAGE_KEY];
    if (v === 'vi' || v === 'en') return v;
  } catch {
    // Storage unavailable — fall back to browser locale.
  }
  return detectFromBrowser();
}

export async function saveUiLocale(locale: Locale): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: locale });
}
