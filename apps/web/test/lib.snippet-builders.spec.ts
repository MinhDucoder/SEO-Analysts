import { describe, it, expect } from 'vitest';
import { buildCurl, buildJs, buildResponseCopy } from '../src/lib/snippet-builders';

const req = {
  input: { type: 'url' as const, url: 'https://x.y/z' },
  targetKeyword: 'seo 2026',
  options: { enrichMode: 'llm' as const, language: 'vi' as const },
};

describe('buildCurl', () => {
  it('renders a single-line cURL with Bearer + JSON body', () => {
    const out = buildCurl('http://localhost:3000/api/v1', 'sk_live_AAA', req);
    expect(out).toContain(`curl -X POST 'http://localhost:3000/api/v1/public/check'`);
    expect(out).toContain(`-H 'authorization: Bearer sk_live_AAA'`);
    expect(out).toContain(`-H 'content-type: application/json'`);
    expect(out).toContain(`--data`);
    expect(out).toContain('"targetKeyword":"seo 2026"');
  });

  it('redacts the key when passed empty', () => {
    const out = buildCurl('http://x/y', '', req);
    expect(out).toContain(`Bearer <YOUR_API_KEY>`);
  });
});

describe('buildJs', () => {
  it('emits a fetch snippet with Bearer + JSON body', () => {
    const out = buildJs('http://localhost:3000/api/v1', 'sk_live_B', req);
    expect(out).toContain(`fetch('http://localhost:3000/api/v1/public/check'`);
    expect(out).toContain(`Authorization: 'Bearer sk_live_B'`);
    expect(out).toContain(`'Content-Type': 'application/json'`);
    expect(out).toContain(`body: JSON.stringify(`);
  });
});

describe('buildResponseCopy', () => {
  it('pretty-prints JSON', () => {
    const out = buildResponseCopy({ score: 80, meta: { ruleVersion: '1.2.0' } });
    expect(out).toContain('"score": 80');
    expect(out).toContain('"ruleVersion": "1.2.0"');
  });
});
