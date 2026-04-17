import { describe, expect, it } from 'vitest';
import { CheckStatus, ImageInfo } from '@repo/shared';
import { ImageAltRule } from '../../../src/analyzer/domain/rules/images/image-alt.rule';
import { ImageOptimizationRule } from '../../../src/analyzer/domain/rules/images/image-optimization.rule';
import { makePageData } from '../../fixtures/page-data.fixture';

const img = (alt: string | null, sizeBytes = 50_000, format = 'webp'): ImageInfo => ({
  src: '/img.webp', alt, sizeBytes, format,
});

describe('ImageAltRule', () => {
  const rule = new ImageAltRule();
  it('PASS when no images (nothing to check)', () => {
    expect(rule.check(makePageData({ images: [] })).status).toBe(CheckStatus.PASS);
  });
  it('PASS when >90% have alt', () => {
    const images = [img('a'), img('b'), img('c'), img('d'), img('e'), img('f'), img('g'), img('h'), img('i'), img('j')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when 70-90% have alt', () => {
    const images = [img('a'), img('b'), img('c'), img('d'), img('e'), img('f'), img('g'), img('h'), img(null), img(null)];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when <70% have alt', () => {
    const images = [img('a'), img(null), img(null), img(null)];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.FAIL);
  });
});

describe('ImageOptimizationRule', () => {
  const rule = new ImageOptimizationRule();
  it('PASS when all <200KB and modern formats', () => {
    const images = [img('a', 150_000, 'webp'), img('b', 180_000, 'avif')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when some oversized or legacy format', () => {
    const images = [img('a', 150_000, 'webp'), img('b', 300_000, 'jpeg')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when majority oversized or legacy', () => {
    const images = [img('a', 400_000, 'jpeg'), img('b', 500_000, 'png'), img('c', 600_000, 'gif')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.FAIL);
  });
});
