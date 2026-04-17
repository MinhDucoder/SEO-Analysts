import { describe, expect, it } from 'vitest';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ReadabilityRule } from '../../../src/analyzer/domain/rules/content/readability.rule';
import { makePageData } from '../../fixtures/page-data.fixture';

describe('ReadabilityRule', () => {
  const rule = new ReadabilityRule();

  it('has stable id and CONTENT category', () => {
    expect(rule.id).toBe('readability');
    expect(rule.category).toBe(IssueCategory.CONTENT);
  });

  it('PASS for simple English text with high FRE', () => {
    const text =
      'The cat sits on the mat. The dog runs fast. Birds sing in trees. ' +
      'Kids play games. The sun is warm. Sky is blue. Life is good. ' +
      'Fish swim deep. Trees grow well. Green grass feels soft here.';
    const res = rule.check(makePageData({ language: 'en', textContent: text }));
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.score).toBe(100);
    expect(res.metadata.applicable).toBe(true);
    expect(res.metadata.fre as number).toBeGreaterThanOrEqual(60);
  });

  it('WARN for moderately difficult text (30 <= FRE < 60)', () => {
    const text =
      'Most people want good health and happy families. They work hard to provide for their loved ones. ' +
      'Parents teach children important lessons about life. Schools prepare students for future careers in many fields. ' +
      'Cities offer many opportunities for young professionals.';
    const res = rule.check(makePageData({ language: 'en', textContent: text }));
    expect(res.status).toBe(CheckStatus.WARN);
    expect(res.score).toBe(50);
    expect(res.metadata.fre as number).toBeGreaterThanOrEqual(30);
    expect(res.metadata.fre as number).toBeLessThan(60);
  });

  it('FAIL for very difficult text (FRE < 30)', () => {
    const text =
      'Epistemological presuppositions underlying phenomenological investigations necessitate exhaustive methodological reconsiderations encompassing transdisciplinary heuristics. ' +
      'Philosophical hermeneutics predominantly interrogates intersubjective constitutionality through ontological deconstruction. ' +
      'Anthropological structuralism systematically problematizes sociocultural intersectionality via post-modernist epistemes.';
    const res = rule.check(makePageData({ language: 'en', textContent: text }));
    expect(res.status).toBe(CheckStatus.FAIL);
    expect(res.score).toBe(0);
    expect(res.metadata.fre as number).toBeLessThan(30);
  });

  it('PASS (skipped) when lang is Vietnamese', () => {
    const text =
      'Toi rat thich hoc tieng Viet vi no la mot ngon ngu thu vi co nhieu dieu can kham pha moi ngay trong cuoc song hang ngay cua chung ta.';
    const res = rule.check(makePageData({ language: 'vi', textContent: text }));
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.score).toBe(100);
    expect(res.metadata.applicable).toBe(false);
    expect(res.metadata.language).toBe('vi');
  });

  it('PASS (skipped) when lang attribute is missing', () => {
    const res = rule.check(
      makePageData({
        language: undefined,
        textContent:
          'Some decent English text here for testing purposes only if the language were detected correctly by the rule.',
      }),
    );
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.metadata.applicable).toBe(false);
  });

  it('PASS (skipped) when text has fewer than 30 words', () => {
    const res = rule.check(makePageData({ language: 'en', textContent: 'Too short for readability check.' }));
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.metadata.applicable).toBe(false);
  });

  it('PASS (skipped) when textContent is empty', () => {
    const res = rule.check(makePageData({ language: 'en', textContent: '' }));
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.metadata.applicable).toBe(false);
  });

  it('includes grade level and counts in metadata', () => {
    const text =
      'The quick brown fox jumps over the lazy dog. Simple sentences make text easy to read. ' +
      'People like reading clear words. This paragraph uses common English. Writers learn to simplify over time with practice.';
    const res = rule.check(makePageData({ language: 'en', textContent: text }));
    expect(res.metadata.grade).toBeDefined();
    expect(typeof res.metadata.grade).toBe('number');
    expect(typeof res.metadata.words).toBe('number');
    expect(typeof res.metadata.sentences).toBe('number');
  });

  it('normalizes lang tag "en-US" to "en"', () => {
    const text =
      'The cat sits on the mat. The dog runs fast. Birds sing in trees. ' +
      'Kids play games. The sun is warm. Sky is blue. Life is good. ' +
      'Fish swim deep. Trees grow well here. Green grass feels soft.';
    const res = rule.check(makePageData({ language: 'en-US', textContent: text }));
    expect(res.metadata.applicable).toBe(true);
    expect(res.metadata.language).toBe('en');
  });

  it('suggestion is null on PASS, non-null on WARN and FAIL', () => {
    const easy =
      'The cat sits on the mat. The dog runs fast. Birds sing in trees. ' +
      'Kids play games. The sun is warm. Sky is blue. Life is good. ' +
      'Fish swim deep. Trees grow well. Green grass feels soft here.';
    const hard =
      'Epistemological presuppositions underlying phenomenological investigations necessitate exhaustive methodological reconsiderations encompassing transdisciplinary heuristics. ' +
      'Philosophical hermeneutics predominantly interrogates intersubjective constitutionality through ontological deconstruction. ' +
      'Anthropological structuralism systematically problematizes sociocultural intersectionality via post-modernist epistemes.';
    expect(rule.check(makePageData({ language: 'en', textContent: easy })).suggestion).toBeNull();
    expect(rule.check(makePageData({ language: 'en', textContent: hard })).suggestion).not.toBeNull();
  });
});
