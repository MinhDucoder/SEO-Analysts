import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve } from 'node:path';

// Spy on the core-lib boundary. We assert the factory routes the
// CONFIGURED provider into createLLM (it used to hardcode 'anthropic').
// createBaseChain / parseStructured / FileSystemPromptLoader stay REAL so
// the llmOverride-driven chain.invoke() tests still exercise real wiring.
const { createLLMMock } = vi.hoisted(() => ({ createLLMMock: vi.fn() }));
vi.mock('@repo/seo-ai-core', async (importActual) => {
  const actual = await importActual<typeof import('@repo/seo-ai-core')>();
  return { ...actual, createLLM: createLLMMock };
});

import {
  SeoSuggestChainFactory,
  type SuggestInput,
  type SuggestOutput,
} from '../../src/public-api/services/seo-suggest-chain.factory';

const promptsDir = resolve(__dirname, '../../src/public-api/prompts');

function llmStub(invoke = vi.fn()) {
  return { providerId: 'gemini', modelId: 'stub', invoke };
}

describe('SeoSuggestChainFactory', () => {
  beforeEach(() => {
    createLLMMock.mockReset();
    createLLMMock.mockReturnValue(llmStub());
  });

  describe('SEO_AI_ENABLED kill switch', () => {
    it('returns null and never builds an LLM when disabled, even with a key present', async () => {
      const f = new SeoSuggestChainFactory({
        promptsDir,
        enabled: false,
        provider: 'gemini',
        apiKey: 'gem-key',
        model: 'gemini-2.5-flash',
      });
      await expect(f.getOrNull()).resolves.toBeNull();
      expect(createLLMMock).not.toHaveBeenCalled();
    });
  });

  describe('provider routing (config-driven, default Gemini)', () => {
    it('routes the configured provider + model + key into createLLM', async () => {
      const f = new SeoSuggestChainFactory({
        promptsDir,
        enabled: true,
        provider: 'gemini',
        apiKey: 'gem-key',
        model: 'gemini-2.5-flash',
      });
      const chain = await f.getOrNull();
      expect(chain).not.toBeNull();
      expect(createLLMMock).toHaveBeenCalledOnce();
      expect(createLLMMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          apiKey: 'gem-key',
        }),
      );
    });

    it('degrades to null (does not throw) when LLM construction fails', async () => {
      createLLMMock.mockImplementation(() => {
        throw new Error('GeminiAdapter: missing apiKey');
      });
      const f = new SeoSuggestChainFactory({
        promptsDir,
        enabled: true,
        provider: 'gemini',
        apiKey: undefined,
        model: 'gemini-2.5-flash',
      });
      await expect(f.getOrNull()).resolves.toBeNull();
    });
  });

  describe('chain behaviour (with injected llm override)', () => {
    const baseOpts = {
      promptsDir,
      enabled: true,
      provider: 'gemini' as const,
      apiKey: 'stub',
      model: 'gemini-2.5-flash',
    };

    it('constructs an IChain when enabled and an llm is available', async () => {
      const f = new SeoSuggestChainFactory({ ...baseOpts, llmOverride: llmStub() });
      const chain = await f.getOrNull();
      expect(chain).not.toBeNull();
      expect(typeof chain!.invoke).toBe('function');
      expect(chain!.name).toBe('seo-suggest');
      expect(createLLMMock).not.toHaveBeenCalled();
    });

    it('chain.invoke() invokes ILLM.invoke with rendered messages and parses output', async () => {
      const invokeMock = vi.fn().mockResolvedValue({
        content:
          '[{"ruleId":"title_tag","type":"rewrite","text":"SEO 2026: hướng dẫn chi tiết cho beginner","rationale":"thêm từ khóa + năm"}]',
        finishReason: 'stop',
        usage: { inputTokens: 50, outputTokens: 20 },
      });
      const f = new SeoSuggestChainFactory({ ...baseOpts, llmOverride: llmStub(invokeMock) });
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
      const out: SuggestOutput = await chain.invoke(input, { traceId: 't1' });
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({ ruleId: 'title_tag', type: 'rewrite' });
      expect(invokeMock).toHaveBeenCalledOnce();
    });

    it('chain.invoke() surfaces GuardrailError when LLM returns invalid JSON', async () => {
      const f = new SeoSuggestChainFactory({
        ...baseOpts,
        llmOverride: llmStub(
          vi.fn().mockResolvedValue({
            content: 'not-json-at-all',
            finishReason: 'stop',
            usage: { inputTokens: 5, outputTokens: 3 },
          }),
        ),
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
        await chain.invoke(input);
      } catch (e) {
        caught = e;
      }
      // createBaseChain rethrows AiCoreError subclasses (GuardrailError) as-is;
      // only unexpected errors get wrapped in ChainError.
      expect((caught as Error).name).toBe('GuardrailError');
    });
  });
});
