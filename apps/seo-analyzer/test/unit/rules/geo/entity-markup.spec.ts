import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { EntityMarkupRule } from '../../../../src/analyzer/domain/rules/geo/entity-markup.rule';
import { PageData } from '../../../../src/analyzer/domain/page-data.interface';

const base: PageData = { url: 'https://example.com', jsonLdBlocks: [] } as any;
const now = new Date('2026-05-28');

describe('EntityMarkupRule', () => {
  const rule = new EntityMarkupRule(() => now);

  it('fails when no author', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'Article' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.FAIL);
  });

  it('fails when author present but no publisher', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'Article', author: { '@type': 'Person', name: 'A', url: 'u' } }] };
    expect(rule.check(pd).status).toBe(CheckStatus.FAIL);
  });

  it('warns when dateModified older than 180 days', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'Article', author: { '@type': 'Person', name: 'A', url: 'u' }, publisher: { '@type': 'Organization', name: 'O' }, dateModified: '2025-01-01' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.WARN);
  });

  it('passes when entity markup complete and fresh', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'Article', author: { '@type': 'Person', name: 'A', url: 'u' }, publisher: { '@type': 'Organization', name: 'O' }, dateModified: '2026-05-01' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.PASS);
  });
});
