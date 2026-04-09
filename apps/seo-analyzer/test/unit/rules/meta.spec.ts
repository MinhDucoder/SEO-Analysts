import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { TitleTagRule } from '../../../src/analyzer/rules/meta/title-tag.rule';
import { MetaDescriptionRule } from '../../../src/analyzer/rules/meta/meta-description.rule';
import { OpenGraphRule } from '../../../src/analyzer/rules/meta/open-graph.rule';
import { TwitterCardRule } from '../../../src/analyzer/rules/meta/twitter-card.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

describe('TitleTagRule', () => {
  const rule = new TitleTagRule();
  it('PASS for 50-60 chars', () => {
    const title = 'x'.repeat(55);
    expect(rule.check(makePageData({ title })).status).toBe(CheckStatus.PASS);
  });
  it('WARN for 30-49 chars', () => {
    expect(rule.check(makePageData({ title: 'x'.repeat(40) })).status).toBe(CheckStatus.WARN);
  });
  it('WARN for 61-70 chars', () => {
    expect(rule.check(makePageData({ title: 'x'.repeat(65) })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ title: undefined })).status).toBe(CheckStatus.FAIL);
  });
  it('FAIL when <30 or >70', () => {
    expect(rule.check(makePageData({ title: 'short' })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ title: 'x'.repeat(80) })).status).toBe(CheckStatus.FAIL);
  });
});

describe('MetaDescriptionRule', () => {
  const rule = new MetaDescriptionRule();
  it('PASS for 120-160', () => {
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(140) })).status).toBe(CheckStatus.PASS);
  });
  it('WARN for 80-119 or 161-200', () => {
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(100) })).status).toBe(CheckStatus.WARN);
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(180) })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when missing or out of bounds', () => {
    expect(rule.check(makePageData({ metaDescription: undefined })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(50) })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(250) })).status).toBe(CheckStatus.FAIL);
  });
});

describe('OpenGraphRule', () => {
  const rule = new OpenGraphRule();
  it('PASS when all 3 present', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('WARN when 1-2 present', () => {
    expect(rule.check(makePageData({ openGraph: { 'og:title': 't' } })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when none present', () => {
    expect(rule.check(makePageData({ openGraph: {} })).status).toBe(CheckStatus.FAIL);
  });
});

describe('TwitterCardRule', () => {
  const rule = new TwitterCardRule();
  it('PASS when twitter:card is set', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ twitterCard: {} })).status).toBe(CheckStatus.FAIL);
  });
});
