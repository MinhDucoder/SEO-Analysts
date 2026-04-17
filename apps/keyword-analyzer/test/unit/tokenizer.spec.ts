import { describe, expect, it } from 'vitest';
import { tokenize } from '../../src/keyword/domain/tokenizer';

describe('tokenize', () => {
  it('lowercases all tokens', () => {
    const result = tokenize('Hello WORLD Foo', 'en');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('foo');
  });

  it('removes punctuation', () => {
    const result = tokenize('hello, world! foo. bar? baz;', 'en');
    expect(result).toEqual(expect.arrayContaining(['hello', 'world', 'foo', 'bar', 'baz']));
    expect(result.join(' ')).not.toMatch(/[,.!?;]/);
  });

  it('filters out tokens shorter than 2 characters', () => {
    const result = tokenize('a big car I own now', 'en');
    expect(result).not.toContain('a');
    expect(result).not.toContain('i');
    expect(result).toContain('big');
    expect(result).toContain('car');
    expect(result).toContain('own');
    expect(result).toContain('now');
  });

  it('removes English stopwords', () => {
    const result = tokenize('the quick brown fox jumps over the lazy dog', 'en');
    expect(result).not.toContain('the');
    expect(result).not.toContain('over');
    expect(result).toEqual(['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog']);
  });

  it('removes Vietnamese stopwords', () => {
    const result = tokenize('tôi đang học lập trình web', 'vi');
    expect(result).not.toContain('tôi');
    expect(result).not.toContain('đang');
    expect(result).toContain('học');
    expect(result).toContain('lập');
    expect(result).toContain('trình');
    expect(result).toContain('web');
  });

  it('preserves Vietnamese diacritics during tokenization', () => {
    const result = tokenize('Công nghệ phần mềm', 'vi');
    expect(result).toEqual(['công', 'nghệ', 'phần', 'mềm']);
  });

  it('handles multiple whitespace types', () => {
    const result = tokenize('hello\tworld\nfoo   bar', 'en');
    expect(result).toEqual(['hello', 'world', 'foo', 'bar']);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('', 'en')).toEqual([]);
    expect(tokenize('   ', 'en')).toEqual([]);
  });

  it('strips HTML-like leftovers (numbers retained)', () => {
    const result = tokenize('Top 10 SEO tips for 2026', 'en');
    expect(result).toContain('top');
    expect(result).toContain('10');
    expect(result).toContain('seo');
    expect(result).toContain('tips');
    expect(result).toContain('2026');
  });
});
