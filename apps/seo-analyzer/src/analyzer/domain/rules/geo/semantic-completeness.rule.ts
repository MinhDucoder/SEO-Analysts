import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';
import { GeminiClientService } from '../../../services/gemini-client.service';

const MAX_CHUNKS = 5;
const MIN_WORD_COUNT = 134;

function prompt(h: string, text: string, lang: string): string {
  if (lang.startsWith('vi')) {
    return `Đoạn dưới có tự đủ trả lời ý của heading không (không cần đọc trang khác)?
Trả lời JSON: { "complete": boolean, "wordCount": int }
Heading: ${h}
Đoạn: ${text}`;
  }
  return `Does the passage below self-contain its answer to the heading (no external reading required)?
Respond JSON: { "complete": boolean, "wordCount": int }
Heading: ${h}
Passage: ${text}`;
}

export class SemanticCompletenessRule implements ISeoRule {
  readonly id = 'geo_semantic_completeness';
  readonly category = IssueCategory.GEO;

  constructor(private readonly llm: GeminiClientService) {}

  async check(pageData: PageData): Promise<RuleCheckOutput> {
    const sections = ((pageData as any).sections ?? []).slice(0, MAX_CHUNKS) as Array<{ heading: string; text: string }>;
    if (sections.length === 0) {
      return { status: CheckStatus.WARN, score: 50, message: 'No H2 sections found', suggestion: 'Add structured H2 sections.', metadata: {} };
    }
    const lang = (pageData.language ?? 'en').toLowerCase();
    const results: Array<{ heading: string; complete: boolean; wordCount: number }> = [];
    for (const s of sections) {
      try {
        const out = await this.llm.completeJson<{ complete: boolean; wordCount: number }>(prompt(s.heading, s.text.slice(0, 2500), lang));
        results.push({ heading: s.heading, complete: out.complete, wordCount: out.wordCount });
      } catch (err) {
        results.push({ heading: s.heading, complete: false, wordCount: 0 });
      }
    }
    const completionRate = results.filter((r) => r.complete).length / results.length;
    const avgWords = results.reduce((a, r) => a + r.wordCount, 0) / results.length;
    const meta = { chunkResults: results, completionRate: Number(completionRate.toFixed(2)), avgWordCount: Math.round(avgWords) };
    if (completionRate >= 0.8 && avgWords >= MIN_WORD_COUNT) {
      return { status: CheckStatus.PASS, score: 100, message: `${Math.round(completionRate * 100)}% of sections are self-contained`, suggestion: null, metadata: meta };
    }
    if (completionRate >= 0.5) {
      return { status: CheckStatus.WARN, score: 50, message: `${Math.round(completionRate * 100)}% complete; aim for ≥80%`, suggestion: 'Expand sections so each can be quoted standalone.', metadata: meta };
    }
    return { status: CheckStatus.FAIL, score: 0, message: `Only ${Math.round(completionRate * 100)}% of sections are self-contained`, suggestion: 'Rewrite sections so each fully answers its heading in 134+ words.', metadata: meta };
  }
}
