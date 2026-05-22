import { describe, it, expect } from 'vitest';
import { validate as article } from './article.validator';
import { validate as product } from './product.validator';
import { validate as faq } from './faq.validator';
import { validate as breadcrumb } from './breadcrumb.validator';
import { validate as organization } from './organization.validator';
import { validate as localBusiness } from './local-business.validator';

describe('article validator', () => {
  it('passes a complete Article', () => {
    const r = article({
      '@type': 'Article',
      headline: 'A headline',
      image: 'x.png',
      datePublished: '2026-01-01',
      author: { name: 'A' },
    });
    expect(r.errors).toHaveLength(0);
  });
  it('errors when headline missing', () => {
    expect(article({ '@type': 'Article' }).errors).toContainEqual(
      expect.stringContaining('headline'),
    );
  });
  it('warns on overly long headline', () => {
    const r = article({ headline: 'h'.repeat(120), image: 'x', datePublished: 'd', author: 'a' });
    expect(r.warnings.some((w) => w.includes('headline'))).toBe(true);
  });
});

describe('product validator', () => {
  it('errors when name missing', () => {
    expect(product({ '@type': 'Product' }).errors).toContainEqual(expect.stringContaining('name'));
  });
  it('warns when offers has no price', () => {
    const r = product({ name: 'P', image: 'i', offers: { '@type': 'Offer' } });
    expect(r.warnings.some((w) => w.includes('price'))).toBe(true);
  });
});

describe('faq validator', () => {
  it('errors when mainEntity is not a non-empty array', () => {
    expect(faq({ '@type': 'FAQPage' }).errors.length).toBeGreaterThan(0);
  });
  it('errors when a question lacks acceptedAnswer.text', () => {
    const r = faq({ mainEntity: [{ name: 'Q1' }] });
    expect(r.errors.some((e) => e.includes('acceptedAnswer'))).toBe(true);
  });
  it('passes a valid FAQPage', () => {
    const r = faq({ mainEntity: [{ name: 'Q1', acceptedAnswer: { text: 'A1' } }] });
    expect(r.errors).toHaveLength(0);
  });
});

describe('breadcrumb validator', () => {
  it('errors when itemListElement empty', () => {
    expect(breadcrumb({ itemListElement: [] }).errors.length).toBeGreaterThan(0);
  });
  it('warns when an item lacks position', () => {
    const r = breadcrumb({ itemListElement: [{ name: 'Home' }] });
    expect(r.warnings.some((w) => w.includes('position'))).toBe(true);
  });
});

describe('organization validator', () => {
  it('errors when name missing', () => {
    expect(organization({}).errors).toContainEqual(expect.stringContaining('name'));
  });
  it('warns when logo missing', () => {
    expect(organization({ name: 'Org', url: 'x' }).warnings.some((w) => w.includes('logo'))).toBe(
      true,
    );
  });
});

describe('local-business validator', () => {
  it('errors when name + address missing', () => {
    const r = localBusiness({});
    expect(r.errors.length).toBe(2);
  });
  it('warns when telephone missing', () => {
    const r = localBusiness({ name: 'B', address: '1 St' });
    expect(r.warnings.some((w) => w.includes('telephone'))).toBe(true);
  });
});
