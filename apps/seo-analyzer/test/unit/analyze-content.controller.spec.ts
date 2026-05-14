import { describe, expect, it, beforeEach } from 'vitest';
import { AnalyzeContentController } from '../../src/analyzer/controllers/analyze-content.controller';
import { PageDataBuilderService } from '../../src/analyzer/services/page-data-builder.service';
import { RuleRunner } from '../../src/analyzer/services/rule-runner';
import { RuleRegistry } from '../../src/analyzer/services/rule-registry';
import { RuleMetadataService } from '../../src/analyzer/services/rule-metadata.service';
import { CheckStatus, IssueCategory } from '@repo/shared';

describe('AnalyzeContentController', () => {
  let ctrl: AnalyzeContentController;
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
    registry.register({
      id: 'title_tag',
      category: IssueCategory.META,
      check: () => ({
        status: CheckStatus.WARN,
        score: 50,
        message: 'Title short',
        suggestion: 'Make longer',
        metadata: { currentLength: 10 },
      }),
    });
    ctrl = new AnalyzeContentController(
      new PageDataBuilderService(),
      new RuleRunner(registry),
      new RuleMetadataService(),
    );
  });

  it('returns issues with category + severity + audiences + evidence + docRef', async () => {
    const res = await ctrl.analyzeContent({
      requestId: 'r1',
      html: '<title>Short</title>',
      targetKeyword: 'seo',
      secondaryKeywords: [],
      language: 'vi',
      mode: 1, // CONTENT_ONLY
      resolvedUrl: '',
    });
    expect(res.ruleVersion).toBeTruthy();
    expect(res.issues).toHaveLength(1);
    const issue = res.issues[0];
    expect(issue.ruleId).toBe('title_tag');
    expect(issue.category).toBe(IssueCategory.META);
    expect(issue.severity).toBe('warning');
    expect(issue.audiences).toEqual(expect.arrayContaining(['writer', 'dev']));
    expect(issue.message).toBe('Title short');
    expect(issue.templateSuggestion).toBe('Make longer');
    expect(issue.evidence).toEqual({ currentLength: 10 });
    expect(issue.docRef).toContain('/rules/title_tag');
  });

  it('populates contentStats from PageData', async () => {
    const res = await ctrl.analyzeContent({
      requestId: 'r1',
      html: '<p>one two three four five six seven eight nine ten</p>',
      targetKeyword: '',
      secondaryKeywords: [],
      language: 'vi',
      mode: 1,
      resolvedUrl: '',
    });
    expect(res.contentStats.wordCount).toBeGreaterThanOrEqual(10);
    expect(res.contentStats.characterCount).toBeGreaterThan(0);
    expect(res.contentStats.paragraphCount).toBe(1);
  });

  it('passes mode=FULL through to runner', async () => {
    registry.register({
      id: 'http_only',
      category: IssueCategory.TECHNICAL,
      requires: ['http_metadata'],
      check: () => ({ status: CheckStatus.PASS, score: 100, message: 'ok', suggestion: null, metadata: {} }),
    });

    const contentOnly = await ctrl.analyzeContent({
      requestId: 'r1', html: '<p>x</p>', targetKeyword: '', secondaryKeywords: [],
      language: 'vi', mode: 1, resolvedUrl: '',
    });
    expect(contentOnly.issues.map((i) => i.ruleId).sort()).toEqual(['title_tag']);

    const full = await ctrl.analyzeContent({
      requestId: 'r1', html: '<p>x</p>', targetKeyword: '', secondaryKeywords: [],
      language: 'vi', mode: 2, resolvedUrl: '',
    });
    expect(full.issues.map((i) => i.ruleId).sort()).toEqual(['http_only', 'title_tag']);
  });
});
