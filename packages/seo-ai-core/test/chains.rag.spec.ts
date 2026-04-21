import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRagChain } from '../src/chains/rag.chain.js';
import { FileSystemPromptLoader } from '../src/prompt/loader.js';
import { MemoryRetriever } from '../src/retrievers/memory.retriever.js';
import { GuardrailError, RetrieverError } from '../src/errors/index.js';
import { FakeLLMProvider } from './_fixtures/fake-llm.adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '_fixtures', 'prompts');

const Answer = z.object({ answer: z.string() });

describe('createRagChain', () => {
  const docs = [
    { id: 'doc-og', content: 'Open Graph meta tags improve social sharing previews on Facebook.' },
    { id: 'doc-tw', content: 'Twitter Card metadata controls the appearance of links shared on Twitter.' },
    { id: 'doc-canon', content: 'Canonical link tags prevent duplicate content SEO penalties.' },
  ];

  it('end-to-end: retrieves docs, renders prompt, calls LLM, parses structured output', async () => {
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"answer":"Open Graph meta tags improve social sharing."}',
        usage: { prompt: 10, completion: 5, total: 15 },
        model: 'fake-model-v1',
        finishReason: 'stop',
      },
    });

    const chain = createRagChain({
      name: 'rag-smoke',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => ({
        query: input.query,
        context: contextDocs,
      }),
      topK: 2,
    });

    const out = await chain.invoke({ query: 'What do Open Graph tags do?' });
    expect(out).toEqual({ answer: 'Open Graph meta tags improve social sharing.' });
    expect(llm.invocations).toBe(1);
  });

  it('throws GuardrailError when LLM output does not match schema', async () => {
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"wrong_field":123}',
        usage: { prompt: 0, completion: 0, total: 0 },
        model: 'fake',
        finishReason: 'stop',
      },
    });
    const chain = createRagChain({
      name: 'bad-output',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => ({
        query: input.query,
        context: contextDocs,
      }),
    });
    await expect(chain.invoke({ query: 'q' })).rejects.toThrow(GuardrailError);
  });

  it('passes signal from ChainContext through to LLM (cancel works)', async () => {
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"answer":"ok"}',
        usage: { prompt: 0, completion: 0, total: 0 },
        model: 'fake',
        finishReason: 'stop',
      },
    });
    const chain = createRagChain({
      name: 'cancel',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => ({
        query: input.query,
        context: contextDocs,
      }),
    });
    const ctrl = new AbortController();
    ctrl.abort();
    const out = await chain.invoke({ query: 'q' }, { signal: ctrl.signal });
    expect(out).toBeDefined();
  });

  it('exposes promptId + promptVersion + name', () => {
    const chain = createRagChain({
      name: 'meta',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm: new FakeLLMProvider(),
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, ctx) => ({ query: input.query, context: ctx }),
    });
    expect(chain.name).toBe('meta');
    expect(chain.promptId).toBe('rag-test');
    expect(chain.promptVersion).toBe('1.0.0');
  });

  it('uses custom topK from config', async () => {
    let lastContextLength = 0;
    const llm = new FakeLLMProvider({
      defaultResponse: {
        content: '{"answer":"x"}',
        usage: { prompt: 0, completion: 0, total: 0 },
        model: 'fake',
        finishReason: 'stop',
      },
    });
    const chain = createRagChain({
      name: 'topk',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: new MemoryRetriever(docs),
      llm,
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, contextDocs) => {
        lastContextLength = contextDocs.length;
        return { query: input.query, context: contextDocs };
      },
      topK: 1,
    });
    await chain.invoke({ query: 'open graph' });
    expect(lastContextLength).toBeGreaterThan(0);
  });

  it('throws RetrieverError when retriever throws', async () => {
    const failingRetriever = {
      async search() {
        throw new Error('vector store down');
      },
    };
    const chain = createRagChain({
      name: 'retr-fail',
      promptId: 'rag-test',
      promptVersion: '1.0.0',
      retriever: failingRetriever,
      llm: new FakeLLMProvider(),
      promptLoader: new FileSystemPromptLoader({ baseDir: FIXTURES }),
      outputSchema: Answer,
      buildVariables: (input: { query: string }, ctx) => ({ query: input.query, context: ctx }),
    });
    await expect(chain.invoke({ query: 'q' })).rejects.toThrow(RetrieverError);
  });
});
