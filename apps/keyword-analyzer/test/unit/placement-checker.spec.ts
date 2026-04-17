import { describe, expect, it } from 'vitest';
import { checkPlacement, extractFirstParagraph } from '../../src/keyword/domain/placement-checker';

describe('extractFirstParagraph', () => {
  it('returns the first 100 words of the text', () => {
    const text = Array.from({ length: 250 }, (_, i) => `word${i}`).join(' ');
    const fp = extractFirstParagraph(text);
    expect(fp.split(/\s+/).length).toBe(100);
    expect(fp.startsWith('word0')).toBe(true);
    expect(fp.endsWith('word99')).toBe(true);
  });

  it('returns the whole text when shorter than 100 words', () => {
    expect(extractFirstParagraph('only a few words here')).toBe('only a few words here');
  });

  it('returns empty string for empty input', () => {
    expect(extractFirstParagraph('')).toBe('');
  });
});

describe('checkPlacement', () => {
  const ctx = {
    title: 'Best SEO Audit Tools',
    h1: 'SEO Audit Guide',
    firstParagraph: 'An seo audit is the process of evaluating a website.',
    metaDescription: 'A comprehensive guide to SEO audits and website analysis.',
  };

  it('detects keyword in title (case-insensitive)', () => {
    const p = checkPlacement('seo', ctx);
    expect(p.inTitle).toBe(true);
  });

  it('detects keyword in h1', () => {
    const p = checkPlacement('audit', ctx);
    expect(p.inH1).toBe(true);
  });

  it('detects keyword in first paragraph', () => {
    const p = checkPlacement('process', ctx);
    expect(p.inFirstParagraph).toBe(true);
  });

  it('detects keyword in meta description', () => {
    const p = checkPlacement('comprehensive', ctx);
    expect(p.inMetaDescription).toBe(true);
  });

  it('returns all-false when keyword appears nowhere', () => {
    const p = checkPlacement('elephant', ctx);
    expect(p).toEqual({
      inTitle: false,
      inH1: false,
      inFirstParagraph: false,
      inMetaDescription: false,
    });
  });

  it('handles missing optional fields gracefully', () => {
    const p = checkPlacement('seo', {
      title: undefined,
      h1: undefined,
      firstParagraph: 'seo is important',
      metaDescription: undefined,
    });
    expect(p.inTitle).toBe(false);
    expect(p.inH1).toBe(false);
    expect(p.inFirstParagraph).toBe(true);
    expect(p.inMetaDescription).toBe(false);
  });

  it('matches whole-word only (does not match "seo" inside "season")', () => {
    const p = checkPlacement('seo', {
      title: 'Summer season tips',
      h1: undefined,
      firstParagraph: undefined,
      metaDescription: undefined,
    });
    expect(p.inTitle).toBe(false);
  });
});
