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

  it('returns issues with category + severity + audiences + evidence + doc_ref', async () => {
    const res = await ctrl.analyzeContent({
      request_id: 'r1',
      html: '<title>Short</title>',
      target_keyword: 'seo',
      secondary_keywords: [],
      language: 'vi',
      mode: 1, // CONTENT_ONLY
      resolved_url: '',
    });
    expect(res.rule_version).toBeTruthy();
    expect(res.issues).toHaveLength(1);
    const issue = res.issues[0];
    expect(issue.rule_id).toBe('title_tag');
    expect(issue.category).toBe(IssueCategory.META);
    expect(issue.severity).toBe('warning');
    expect(issue.audiences).toEqual(expect.arrayContaining(['writer', 'dev']));
    expect(issue.message).toBe('Title short');
    expect(issue.template_suggestion).toBe('Make longer');
    expect(issue.evidence).toEqual({ currentLength: 10 });
    expect(issue.doc_ref).toContain('/rules/title_tag');
  });

  it('populates content_stats from PageData', async () => {
    const res = await ctrl.analyzeContent({
      request_id: 'r1',
      html: '<p>one two three four five six seven eight nine ten</p>',
      target_keyword: '',
      secondary_keywords: [],
      language: 'vi',
      mode: 1,
      resolved_url: '',
    });
    expect(res.content_stats.word_count).toBeGreaterThanOrEqual(10);
    expect(res.content_stats.character_count).toBeGreaterThan(0);
    expect(res.content_stats.paragraph_count).toBe(1);
  });

  it('passes mode=FULL through to runner', async () => {
    registry.register({
      id: 'http_only',
      category: IssueCategory.TECHNICAL,
      requires: ['http_metadata'],
      check: () => ({ status: CheckStatus.PASS, score: 100, message: 'ok', suggestion: null, metadata: {} }),
    });

    const contentOnly = await ctrl.analyzeContent({
      request_id: 'r1', html: '<p>x</p>', target_keyword: '', secondary_keywords: [],
      language: 'vi', mode: 1, resolved_url: '',
    });
    expect(contentOnly.issues.map((i) => i.rule_id).sort()).toEqual(['title_tag']);

    const full = await ctrl.analyzeContent({
      request_id: 'r1', html: '<p>x</p>', target_keyword: '', secondary_keywords: [],
      language: 'vi', mode: 2, resolved_url: '',
    });
    expect(full.issues.map((i) => i.rule_id).sort()).toEqual(['http_only', 'title_tag']);
  });
});
