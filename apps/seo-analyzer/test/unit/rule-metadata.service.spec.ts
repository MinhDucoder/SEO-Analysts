import { describe, expect, it } from 'vitest';
import { RuleMetadataService } from '../../src/analyzer/services/rule-metadata.service';

describe('RuleMetadataService', () => {
  const svc = new RuleMetadataService();

  it('returns writer audience for content rules', () => {
    expect(svc.get('readability').audiences).toContain('writer');
    expect(svc.get('readability').severity).toBe('warning');
  });

  it('returns dev audience for technical rules', () => {
    expect(svc.get('canonical_url').audiences).toContain('dev');
  });

  it('returns both audiences for h1_tag', () => {
    expect(svc.get('h1_tag').audiences).toEqual(expect.arrayContaining(['writer', 'dev']));
  });

  it('assigns error severity to blocker rules', () => {
    expect(svc.get('http_status').severity).toBe('error');
    expect(svc.get('h1_tag').severity).toBe('error');
    expect(svc.get('image_alt').severity).toBe('error');
    expect(svc.get('broken_links').severity).toBe('error');
  });

  it('falls back to info/dev for unknown rule ids (no crash)', () => {
    const m = svc.get('unknown_rule_xyz');
    expect(m.severity).toBe('info');
    expect(m.audiences).toEqual(['dev']);
    expect(m.docRef).toBeUndefined();
  });

  it('builds docRef URL for known rules', () => {
    expect(svc.get('title_tag').docRef).toMatch(/\/rules\/title_tag$/);
  });
});
