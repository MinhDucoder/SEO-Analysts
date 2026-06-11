import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';
import { GeminiClientService } from '../../../services/gemini-client.service';

interface LlmOut { direct: boolean; reason: string }

function buildPrompt(h1: string, intro: string, lang: string): string {
  if (lang.startsWith('vi')) {
    return `Bạn là chuyên gia SEO. Đoạn văn dưới đây có trả lời TRỰC TIẾP câu hỏi ngụ ý từ tiêu đề "${h1}" trong 1-2 câu đầu không?
Trả lời JSON: { "direct": boolean, "reason": string (≤20 từ) }

Tiêu đề: ${h1}
Đoạn văn: ${intro}`;
  }
  return `You are an SEO expert. Does the paragraph below directly answer the implied question from the title "${h1}" in its first 1-2 sentences?
Respond JSON: { "direct": boolean, "reason": string (≤20 words) }

Title: ${h1}
Paragraph: ${intro}`;
}

export class DirectAnswerIntroRule implements ISeoRule {
  readonly id = 'geo_direct_answer_intro';
  readonly category = IssueCategory.GEO;

  constructor(private readonly llm: GeminiClientService) {}

  async check(pageData: PageData): Promise<RuleCheckOutput> {
    const h1 = pageData.h1Tags?.[0] ?? '';
    if (!h1) return { status: CheckStatus.WARN, score: 50, message: 'No H1 to evaluate', suggestion: 'Add an H1.', metadata: {} };
    const intro = (pageData.textContent ?? '').split(/\s+/).slice(0, 200).join(' ');
    const lang = (pageData.language ?? 'en').toLowerCase();
    try {
      const out = await this.llm.completeJson<LlmOut>(buildPrompt(h1, intro, lang));
      if (out.direct) {
        return { status: CheckStatus.PASS, score: 100, message: 'Intro directly answers the page topic', suggestion: null, metadata: { h1, reason: out.reason, intro } };
      }
      return { status: CheckStatus.FAIL, score: 0, message: 'Intro does not directly answer the page topic', suggestion: 'Rewrite the first sentence to directly answer the question implied by the H1.', metadata: { h1, reason: out.reason, intro } };
    } catch (err) {
      return { status: CheckStatus.WARN, score: 50, message: 'GEO LLM check could not complete', suggestion: null, metadata: { error: (err as Error).message, h1 } };
    }
  }
}
