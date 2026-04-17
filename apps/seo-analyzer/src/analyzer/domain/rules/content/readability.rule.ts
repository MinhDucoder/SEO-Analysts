/**
 * @file Rule: Flesch-Kincaid readability. Computes Flesch Reading Ease
 * (FRE) and Flesch-Kincaid grade level from page text. Skips gracefully
 * for non-English pages (formula is English-specific) and for pages
 * with too little prose to yield a stable score.
 */
import { syllable } from 'syllable';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const MIN_WORDS = 30;

export class ReadabilityRule implements ISeoRule {
  readonly id = 'readability';
  readonly category = IssueCategory.CONTENT;

  check(pageData: PageData): RuleCheckOutput {
    const lang = (pageData.language ?? '').toLowerCase().split('-')[0];
    const text = (pageData.textContent ?? '').trim();

    if (lang !== 'en') {
      return this.skip(
        `Readability check skipped (lang="${lang || 'unknown'}", Flesch-Kincaid is English-specific)`,
        { language: lang || null },
      );
    }

    const words = this.countWords(text);
    if (words < MIN_WORDS) {
      return this.skip(
        `Readability check skipped (only ${words} words, need at least ${MIN_WORDS})`,
        { language: lang, words },
      );
    }

    const sentences = Math.max(1, this.countSentences(text));
    const syllables = this.countSyllables(text);
    const wordsPerSentence = words / sentences;
    const syllablesPerWord = syllables / words;
    const fre = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
    const grade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

    const metadata: Record<string, unknown> = {
      applicable: true,
      language: lang,
      fre: Math.round(fre * 10) / 10,
      grade: Math.round(grade * 10) / 10,
      wordsPerSentence: Math.round(wordsPerSentence * 10) / 10,
      syllablesPerWord: Math.round(syllablesPerWord * 100) / 100,
      words,
      sentences,
    };

    if (fre >= 60) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Readability is good (FRE ${metadata.fre}, grade ${metadata.grade})`,
        suggestion: null,
        metadata,
      };
    }
    if (fre >= 30) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Readability is fairly difficult (FRE ${metadata.fre}, grade ${metadata.grade})`,
        suggestion:
          'Shorten sentences and use simpler words. Target Flesch Reading Ease 60-70 for general web audiences.',
        metadata,
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `Readability is very difficult (FRE ${metadata.fre}, grade ${metadata.grade})`,
      suggestion:
        'Rewrite with shorter sentences (under 15 words) and simpler vocabulary. Target FRE >= 60.',
      metadata,
    };
  }

  private skip(message: string, extra: Record<string, unknown>): RuleCheckOutput {
    return {
      status: CheckStatus.PASS,
      score: 100,
      message,
      suggestion: null,
      metadata: { applicable: false, ...extra },
    };
  }

  private countSentences(text: string): number {
    const matches = text.match(/[.!?]+(?=\s|$)/g);
    return matches?.length ?? 0;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
  }

  private countSyllables(text: string): number {
    return text.split(/\s+/).reduce((sum, word) => {
      const clean = word.replace(/[^a-zA-Z]/g, '');
      return clean ? sum + syllable(clean) : sum;
    }, 0);
  }
}
