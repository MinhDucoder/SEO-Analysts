import { describe, it, expect } from 'vitest';
import { MemoryRetriever } from '../src/retrievers/memory.retriever.js';

describe('MemoryRetriever', () => {
  const docs = [
    { id: 'd1', content: 'open graph meta tags improve social sharing previews' },
    { id: 'd2', content: 'twitter card metadata for tweet previews' },
    { id: 'd3', content: 'canonical link tag prevents duplicate content seo issues' },
    { id: 'd4', content: 'image alt text accessibility and seo ranking' },
  ];

  it('returns docs ranked by cosine similarity to query', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('open graph social', { topK: 2 });
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe('d1');
    expect(out[0]?.score).toBeGreaterThan(out[1]?.score ?? 1);
  });

  it('clamps topK to available doc count', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('seo', { topK: 100 });
    expect(out).toHaveLength(docs.length);
  });

  it('defaults topK to 5', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('seo');
    expect(out).toHaveLength(4);
  });

  it('returns empty array when store is empty', async () => {
    const r = new MemoryRetriever([]);
    const out = await r.search('anything');
    expect(out).toEqual([]);
  });

  it('honors minScore filter', async () => {
    const r = new MemoryRetriever(docs);
    const out = await r.search('zzz totally unrelated nonsense', { topK: 10, minScore: 0.99 });
    expect(out).toEqual([]);
  });

  it('search results are deterministic across calls', async () => {
    const r = new MemoryRetriever(docs);
    const a = await r.search('twitter card', { topK: 4 });
    const b = await r.search('twitter card', { topK: 4 });
    expect(a.map((d) => d.id)).toEqual(b.map((d) => d.id));
    expect(a.map((d) => d.score)).toEqual(b.map((d) => d.score));
  });

  it('preserves doc metadata', async () => {
    const r = new MemoryRetriever([
      { id: 'm1', content: 'hello', metadata: { source: 'test', tag: 'x' } },
    ]);
    const out = await r.search('hello');
    expect(out[0]?.metadata).toEqual({ source: 'test', tag: 'x' });
  });
});
