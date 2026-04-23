import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import {
  SeoSuggestChainFactory,
  type SuggestInput,
  type SuggestOutput,
} from '../../src/public-api/services/seo-suggest-chain.factory';
import { BaseChain } from '@repo/seo-ai-core';

describe('SeoSuggestChainFactory', () => {
  const promptsDir = resolve(__dirname, '../../src/public-api/prompts');

  it('returns null chain when ANTHROPIC_API_KEY is missing', async () => {
    const f = new SeoSuggestChainFactory({
      promptsDir,
      apiKey: undefined,
      model: 'claude-sonnet-4-6',
    });
    await expect(f.getOrNull()).resolves.toBeNull();
  });

  it('constructs a BaseChain when API key present', async () => {
    const llmStub = {
      providerId: 'anthropic',
      modelId: 'stub',
      invoke: vi.fn(),
    };
    const f = new SeoSuggestChainFactory({
      promptsDir,
      apiKey: 'sk-stub',
      model: 'claude-sonnet-4-6',
      llmOverride: llmStub,
    });
    const chain = await f.getOrNull();
    expect(chain).toBeInstanceOf(BaseChain);
    expect(chain!.name).toBe('seo-suggest');
  });

  it('chain.run() invokes ILLM.invoke with rendered messages and parses output', async () => {
    const invokeMock = vi.fn().mockResolvedValue({
      content:
        '[{"ruleId":"title_tag","type":"rewrite","text":"SEO 2026: hướng dẫn chi tiết cho beginner","rationale":"thêm từ khóa + năm"}]',
      finishReason: 'stop',
      usage: { inputTokens: 50, outputTokens: 20 },
    });
    const llmStub = { providerId: 'anthropic', modelId: 'stub', invoke: invokeMock };
    const f = new SeoSuggestChainFactory({
      promptsDir,
      apiKey: 'stub',
      model: 'stub',
      llmOverride: llmStub,
    });
    const chain = (await f.getOrNull())!;
    const input: SuggestInput = {
      targetKeyword: 'seo 2026',
      language: 'vi',
      contentExcerpt: 'Bài viết SEO về 2026.',
      issues: [
        {
          ruleId: 'title_tag',
          category: 'meta',
          severity: 'warning',
          message: 'Title quá ngắn',
          templateSuggestion: 'Hãy viết dài hơn',
          evidence: { currentLength: 10 },
        },
      ],
    };
    const out: SuggestOutput = await chain.run(input, { timeoutMs: 8000, traceId: 't1' });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ruleId: 'title_tag', type: 'rewrite' });
    expect(invokeMock).toHaveBeenCalledOnce();
  });

  it('chain.run() wraps GuardrailError in ChainError when LLM returns invalid JSON', async () => {
    const llmStub = {
      providerId: 'anthropic',
      modelId: 'stub',
      invoke: vi.fn().mockResolvedValue({
        content: 'not-json-at-all',
        finishReason: 'stop',
        usage: { inputTokens: 5, outputTokens: 3 },
      }),
    };
    const f = new SeoSuggestChainFactory({
      promptsDir,
      apiKey: 'stub',
      model: 'stub',
      llmOverride: llmStub,
    });
    const chain = (await f.getOrNull())!;
    const input: SuggestInput = {
      targetKeyword: 'k',
      language: 'vi',
      contentExcerpt: 'c',
      issues: [
        {
          ruleId: 'x',
          category: 'meta',
          severity: 'info',
          message: 'm',
          templateSuggestion: 't',
          evidence: {},
        },
      ],
    };
    let caught: unknown;
    try {
      await chain.run(input);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).name).toBe('ChainError');
  });
});
