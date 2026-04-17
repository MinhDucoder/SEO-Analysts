/**
 * @file Orchestrates the keyword-analysis pipeline:
 * language detect → tokenize → term frequency → top-N → density & placement
 * → optional target-keyword verdict. Pure in-memory; no DB or I/O.
 */
import { Injectable, Logger } from '@nestjs/common';
import { detectLanguage, type LanguageCode } from '../domain/language-detector';
import { tokenize, countTotalWords } from '../domain/tokenizer';
import { calculateTermFrequency, topNKeywords } from '../domain/term-frequency';
import { checkPlacement, extractFirstParagraph } from '../domain/placement-checker';
import { calculateDensity } from '../domain/density-calculator';
import { getVerdict, isStuffing } from '../domain/target-verdict';
import type { KeywordAnalyzeInput } from '../dto/keyword-request.dto';
import type {
  KeywordAnalyzeOutput,
  KeywordResultDto,
  TargetKeywordAnalysisDto,
} from '../dto/keyword-response.dto';

const TOP_N = 20;

/**
 * Core keyword-analysis service — invoked by both the gRPC controller
 * (sync API) and the BullMQ worker (async pipeline step).
 */
@Injectable()
export class KeywordAnalyzerService {
  private readonly logger = new Logger(KeywordAnalyzerService.name);

  /**
   * Runs the full keyword pipeline on a single page's extracted text.
   *
   * @param input Page text + placement context + optional target keyword.
   * @returns Top-20 keywords + density/placement + optional target verdict.
   */
  async analyze(input: KeywordAnalyzeInput): Promise<KeywordAnalyzeOutput> {
    const start = Date.now();

    // 1. Detect language (respect caller override if provided & valid)
    const language: LanguageCode =
      input.language === 'vi' || input.language === 'en'
        ? (input.language as LanguageCode)
        : detectLanguage(input.textContent);

    // 2-3. Tokenize + stopword removal
    const tokens = tokenize(input.textContent, language);

    // Total words for density (count BEFORE stopword removal)
    const totalWords = countTotalWords(input.textContent);

    // 4. Term frequency
    const tf = calculateTermFrequency(tokens);

    // 5. Top-N
    const top = topNKeywords(tf, TOP_N);

    // Placement context — computed once, reused per keyword
    const firstParagraph = extractFirstParagraph(input.textContent);
    const ctx = {
      title: input.title,
      h1: input.h1Text,
      firstParagraph,
      metaDescription: input.metaDescription,
    };

    // 6. For each keyword: density + placement
    const keywords: KeywordResultDto[] = top.map((row, idx) => {
      const placement = checkPlacement(row.keyword, ctx);
      return {
        keyword: row.keyword,
        frequency: row.frequency,
        densityPercent: calculateDensity(row.frequency, totalWords),
        inTitle: placement.inTitle,
        inH1: placement.inH1,
        inFirstParagraph: placement.inFirstParagraph,
        inMetaDescription: placement.inMetaDescription,
        rank: idx + 1,
      };
    });

    // 7. Target keyword analysis (optional)
    let targetAnalysis: TargetKeywordAnalysisDto | undefined;
    if (input.targetKeyword && input.targetKeyword.trim().length > 0) {
      const target = input.targetKeyword.trim().toLowerCase();
      // Count occurrences in RAW lowercased text using the same whole-word rule
      const frequency = this.countOccurrences(input.textContent, target);
      const density = calculateDensity(frequency, totalWords);
      const placement = checkPlacement(target, ctx);
      targetAnalysis = {
        keyword: target,
        frequency,
        densityPercent: density,
        inTitle: placement.inTitle,
        inH1: placement.inH1,
        inFirstParagraph: placement.inFirstParagraph,
        inMetaDescription: placement.inMetaDescription,
        isStuffing: isStuffing(density),
        verdict: getVerdict(density),
      };
    }

    const output: KeywordAnalyzeOutput = {
      auditId: input.auditId,
      keywords,
      totalWords,
      uniqueWords: tf.size,
      targetAnalysis,
    };

    this.logger.log(
      `Analyzed audit=${input.auditId} lang=${language} totalWords=${totalWords} unique=${tf.size} top=${keywords.length} durationMs=${Date.now() - start}`,
    );
    return output;
  }

  /**
   * Whole-word, case-insensitive, unicode-aware count. Supports multi-word
   * target keywords (e.g. "seo audit") by escaping the phrase as-is.
   */
  private countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu');
    const matches = haystack.match(re);
    return matches ? matches.length : 0;
  }
}
