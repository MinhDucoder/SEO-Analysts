import { describe, it, expect } from 'vitest';
import { evaluateGate, type GateInput } from '../src/formatter';
import type { PublicCheckResponse } from '../src/client';

function resp(extras: Partial<PublicCheckResponse> = {}): PublicCheckResponse {
  return {
    score: 80,
    scoreBreakdown: { meta: 80, content: 80 },
    issues: [],
    meta: {
      inputType: 'html',
      contentStats: { words: 1, characters: 1, readingTimeSec: 1 },
      processingTimeMs: 100,
      ruleVersion: '1.2.0',
      enrichMode: 'template',
      suggestionSource: 'template',
      degraded: false,
      cached: false,
      requestId: 'req_1',
      usage: {
        remaining: { minute: 19, day: 499 },
        resetAt: { minute: '', day: '' },
      },
    },
    ...extras,
  };
}

const issue = (severity: 'info' | 'warning' | 'error') => ({
  ruleId: 'x',
  severity,
  category: 'meta',
  audience: ['writer' as const],
  title: 't',
  description: 'd',
  evidence: {},
  suggestion: null,
});

describe('evaluateGate', () => {
  it('pass when no gates set', () => {
    const g: GateInput = { response: resp(), failOn: undefined, minScore: undefined };
    const r = evaluateGate(g);
    expect(r.pass).toBe(true);
  });

  it('fails on --min-score when score below', () => {
    const g: GateInput = { response: resp({ score: 50 }), failOn: undefined, minScore: 70 };
    const r = evaluateGate(g);
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.reason).toMatch(/min-score/i);
  });

  it('passes when score >= --min-score', () => {
    const g: GateInput = { response: resp({ score: 80 }), failOn: undefined, minScore: 70 };
    expect(evaluateGate(g).pass).toBe(true);
  });

  it('fails on --fail-on=error when any error issue exists', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('warning'), issue('error')] }),
      failOn: 'error',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(false);
  });

  it('passes --fail-on=error when only warnings', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('warning'), issue('info')] }),
      failOn: 'error',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(true);
  });

  it('--fail-on=warning catches warnings + errors', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('warning')] }),
      failOn: 'warning',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(false);
  });

  it('--fail-on=info catches everything including info', () => {
    const g: GateInput = {
      response: resp({ issues: [issue('info')] }),
      failOn: 'info',
      minScore: undefined,
    };
    expect(evaluateGate(g).pass).toBe(false);
  });
});
