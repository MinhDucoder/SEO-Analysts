import type { LanguageCode } from './language-detector';
import { getStopwords } from './stopwords';

/**
 * Tokenizes a block of text into normalized keyword candidates.
 *
 * Steps:
 *   1. Lowercase
 *   2. Replace any non-letter / non-digit / non-Vietnamese-diacritic character with a space
 *   3. Split on whitespace
 *   4. Drop tokens shorter than 2 characters
 *   5. Drop stopwords for the given language
 *
 * Unicode-letter class `\p{L}` is required to keep Vietnamese diacritics
 * intact — `\w` would strip them.
 */
const NON_WORD = /[^\p{L}\p{N}]+/gu;

export function tokenize(text: string, language: LanguageCode): string[] {
  if (!text) return [];

  const stopwords = getStopwords(language);
  const lower = text.toLowerCase();
  const cleaned = lower.replace(NON_WORD, ' ');

  return cleaned
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

/**
 * Lightweight total-word counter used for density calculation.
 * Counts ALL words (including stopwords) after basic normalization — this is
 * the denominator spec: "density = frequency / total_words * 100".
 */
export function countTotalWords(text: string): number {
  if (!text) return 0;
  return text
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0).length;
}
