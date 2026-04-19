import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  ILLMProvider, LLMRequest, LLMResponse, Message, TokenUsage, LLMChunk, FinishReason,
} from '../src/llm/types';
import type {
  IPromptLoader, PromptTemplate, RenderedPrompt, PromptListEntry,
} from '../src/prompt/types';
import type { IChain, ChainContext } from '../src/chains/types';
import type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from '../src/retrievers/types';
import type { Policy, PolicyResult, OutputParseResult } from '../src/guardrails/types';
import type { Logger } from '../src/observability/logger';

describe('public type surface compiles', () => {
  it('ILLMProvider has invoke/stream/countTokens', () => {
    expectTypeOf<ILLMProvider['invoke']>().parameters.toMatchTypeOf<[LLMRequest, AbortSignal?]>();
    expectTypeOf<ILLMProvider['invoke']>().returns.toMatchTypeOf<Promise<LLMResponse>>();
    expectTypeOf<ILLMProvider['stream']>().returns.toMatchTypeOf<AsyncIterable<LLMChunk>>();
    expectTypeOf<ILLMProvider['countTokens']>().returns.toMatchTypeOf<Promise<number>>();
  });

  it('RenderedPrompt.messages reuses Message from llm/types', () => {
    expectTypeOf<RenderedPrompt['messages']>().toMatchTypeOf<Message[]>();
  });

  it('IChain is generic over input/output', () => {
    type C = IChain<{ q: string }, { a: string }>;
    expectTypeOf<C['invoke']>().parameters.toMatchTypeOf<
      [{ q: string }, ChainContext?]
    >();
  });

  it('IRetriever returns scored docs', () => {
    expectTypeOf<IRetriever['search']>().returns.toMatchTypeOf<Promise<RetrievedDoc[]>>();
    expectTypeOf<RetrievedDoc['score']>().toBeNumber();
    expectTypeOf<IRetriever['search']>().parameters.toMatchTypeOf<[string, RetrieverSearchOptions?]>();
  });

  it('OutputParseResult is a discriminated union', () => {
    const r: OutputParseResult<{ x: number }> = { ok: true, value: { x: 1 } };
    if (r.ok) {
      expectTypeOf(r.value).toMatchTypeOf<{ x: number }>();
    }
  });

  it('Policy + PolicyResult + Logger surface compiles', () => {
    expectTypeOf<Policy['maxTokens']>().toMatchTypeOf<number | undefined>();
    expectTypeOf<PolicyResult['changes']>().toMatchTypeOf<string[]>();
    expectTypeOf<Logger['info']>().parameters.toMatchTypeOf<[string, Record<string, unknown>?]>();
  });

  it('TokenUsage + FinishReason + PromptListEntry exist', () => {
    expectTypeOf<TokenUsage>().toHaveProperty('total');
    const fr: FinishReason = 'stop';
    expect(fr).toBe('stop');
    expectTypeOf<PromptListEntry>().toHaveProperty('metadata');
    expectTypeOf<IPromptLoader['load']>().returns.toMatchTypeOf<Promise<PromptTemplate>>();
  });
});
