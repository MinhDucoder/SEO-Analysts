import { describe, expect, it } from 'vitest';
import { calculateTermFrequency, topNKeywords } from '../keyword/core/term-frequency';

describe('calculateTermFrequency', () => {
  it('counts occurrences of each token', () => {
    const tf = calculateTermFrequency(['seo', 'audit', 'seo', 'tool', 'seo', 'audit']);
    expect(tf.get('seo')).toBe(3);
    expect(tf.get('audit')).toBe(2);
    expect(tf.get('tool')).toBe(1);
  });

  it('returns empty map for empty token list', () => {
    expect(calculateTermFrequency([]).size).toBe(0);
  });

  it('is case-sensitive at this stage (tokenizer lowercases upstream)', () => {
    const tf = calculateTermFrequency(['SEO', 'seo']);
    expect(tf.size).toBe(2);
  });
});

describe('topNKeywords', () => {
  it('returns keywords sorted by frequency descending', () => {
    const tf = new Map<string, number>([
      ['seo', 5],
      ['audit', 2],
      ['tool', 8],
      ['meta', 1],
    ]);
    const top = topNKeywords(tf, 3);
    expect(top).toEqual([
      { keyword: 'tool', frequency: 8 },
      { keyword: 'seo', frequency: 5 },
      { keyword: 'audit', frequency: 2 },
    ]);
  });

  it('caps result at the requested limit', () => {
    const tf = new Map<string, number>();
    for (let i = 0; i < 50; i++) tf.set(`word${i}`, i);
    expect(topNKeywords(tf, 20).length).toBe(20);
  });

  it('breaks ties alphabetically for stable ordering', () => {
    const tf = new Map<string, number>([
      ['banana', 3],
      ['apple', 3],
      ['cherry', 3],
    ]);
    const top = topNKeywords(tf, 3);
    expect(top.map((t) => t.keyword)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('returns empty array when map is empty', () => {
    expect(topNKeywords(new Map(), 20)).toEqual([]);
  });
});
