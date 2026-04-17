import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { CanonicalUrlRule } from '../../../src/analyzer/domain/rules/technical/canonical-url.rule';
import { RobotsMetaRule } from '../../../src/analyzer/domain/rules/technical/robots-meta.rule';
import { ViewportMetaRule } from '../../../src/analyzer/domain/rules/technical/viewport-meta.rule';
import { HttpsCheckRule } from '../../../src/analyzer/domain/rules/technical/https-check.rule';
import { makePageData } from '../../fixtures/page-data.fixture';

describe('CanonicalUrlRule', () => {
  const rule = new CanonicalUrlRule();
  it('PASS same domain', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/a', canonicalUrl: 'https://example.com/a' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN different domain', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/a', canonicalUrl: 'https://other.com/a' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL missing', () => {
    expect(rule.check(makePageData({ canonicalUrl: undefined })).status).toBe(CheckStatus.FAIL);
  });
});

describe('RobotsMetaRule', () => {
  const rule = new RobotsMetaRule();
  it('PASS when absent or index', () => {
    expect(rule.check(makePageData({ metaRobots: undefined })).status).toBe(CheckStatus.PASS);
    expect(rule.check(makePageData({ metaRobots: 'index,follow' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when nofollow only', () => {
    expect(rule.check(makePageData({ metaRobots: 'index,nofollow' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when noindex', () => {
    expect(rule.check(makePageData({ metaRobots: 'noindex,follow' })).status).toBe(CheckStatus.FAIL);
  });
});

describe('ViewportMetaRule', () => {
  const rule = new ViewportMetaRule();
  it('PASS width=device-width', () => {
    expect(rule.check(makePageData({ viewportContent: 'width=device-width, initial-scale=1' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN present without device-width', () => {
    expect(rule.check(makePageData({ viewportContent: 'width=1024' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL missing', () => {
    expect(rule.check(makePageData({ viewportContent: undefined })).status).toBe(CheckStatus.FAIL);
  });
});

describe('HttpsCheckRule', () => {
  const rule = new HttpsCheckRule();
  it('PASS when HTTPS', () => {
    expect(rule.check(makePageData({ isHttps: true })).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when HTTP', () => {
    expect(rule.check(makePageData({ isHttps: false })).status).toBe(CheckStatus.FAIL);
  });
});

import { SchemaOrgRule } from '../../../src/analyzer/domain/rules/technical/schema-org.rule';
import { HttpStatusRule } from '../../../src/analyzer/domain/rules/technical/http-status.rule';
import { UrlStructureRule } from '../../../src/analyzer/domain/rules/technical/url-structure.rule';
import { LanguageTagRule } from '../../../src/analyzer/domain/rules/technical/language-tag.rule';
import { FaviconRule } from '../../../src/analyzer/domain/rules/technical/favicon.rule';

describe('SchemaOrgRule', () => {
  const rule = new SchemaOrgRule();
  it('PASS when JSON-LD present', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when absent', () => {
    expect(rule.check(makePageData({ schemaJsonLd: [] })).status).toBe(CheckStatus.FAIL);
  });
});

describe('HttpStatusRule', () => {
  const rule = new HttpStatusRule();
  it('PASS 200', () => {
    expect(rule.check(makePageData({ statusCode: 200 })).status).toBe(CheckStatus.PASS);
  });
  it('WARN 301/302', () => {
    expect(rule.check(makePageData({ statusCode: 301 })).status).toBe(CheckStatus.WARN);
    expect(rule.check(makePageData({ statusCode: 302 })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL 4xx/5xx', () => {
    expect(rule.check(makePageData({ statusCode: 404 })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ statusCode: 500 })).status).toBe(CheckStatus.FAIL);
  });
});

describe('UrlStructureRule', () => {
  const rule = new UrlStructureRule();
  it('PASS short lowercase clean', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/best-laptops' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN long or query params', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/search?q=laptops&sort=asc' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL uppercase + underscores + long', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/Some_VERY_Long_Path_' + 'x'.repeat(120) })).status).toBe(CheckStatus.FAIL);
  });
});

describe('LanguageTagRule', () => {
  const rule = new LanguageTagRule();
  it('PASS when present', () => {
    expect(rule.check(makePageData({ language: 'en' })).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ language: undefined })).status).toBe(CheckStatus.FAIL);
  });
});

describe('FaviconRule', () => {
  const rule = new FaviconRule();
  it('PASS when present', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ faviconUrl: undefined })).status).toBe(CheckStatus.FAIL);
  });
});
