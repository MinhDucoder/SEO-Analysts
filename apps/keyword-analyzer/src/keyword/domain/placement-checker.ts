/**
 * @file Keyword placement detection — flags whether a keyword appears in
 * title / H1 / first paragraph / meta description of the crawled page.
 * Whole-word matching is Unicode-aware to support Vietnamese diacritics.
 */
export interface PlacementContext {
  title?: string;
  h1?: string;
  firstParagraph?: string;
  metaDescription?: string;
}

export interface PlacementResult {
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
}

const FIRST_PARAGRAPH_WORD_LIMIT = 100;

/**
 * Pulls the "first paragraph" of the body — defined here as the first
 * 100 whitespace-delimited words. Using a word count (rather than \n\n)
 * is resilient to crawled content where paragraph tags have already been
 * stripped to plain text.
 */
export function extractFirstParagraph(text: string): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  return words.slice(0, FIRST_PARAGRAPH_WORD_LIMIT).join(' ');
}

/**
 * Escapes regex metacharacters so a keyword can be safely embedded
 * in a dynamically-built RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a case-insensitive, Unicode-aware whole-word regex for a keyword.
 * Using `(?<![\\p{L}\\p{N}])` and `(?![\\p{L}\\p{N}])` instead of `\b` so
 * that Vietnamese diacritics count as word characters.
 */
function wordRegex(keyword: string): RegExp {
  const escaped = escapeRegex(keyword);
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
}

/**
 * Returns a flag-set indicating where in the document the keyword appears.
 * Whole-word, case-insensitive match.
 */
export function checkPlacement(keyword: string, ctx: PlacementContext): PlacementResult {
  const re = wordRegex(keyword);
  return {
    inTitle: !!ctx.title && re.test(ctx.title),
    inH1: !!ctx.h1 && re.test(ctx.h1),
    inFirstParagraph: !!ctx.firstParagraph && re.test(ctx.firstParagraph),
    inMetaDescription: !!ctx.metaDescription && re.test(ctx.metaDescription),
  };
}
