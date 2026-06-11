import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LlmsTxtFetcherService } from '../../src/crawler/infra/fetchers/llms-txt-fetcher.service';

const mockFetch = vi.fn();

describe('LlmsTxtFetcherService', () => {
  let svc: LlmsTxtFetcherService;
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    svc = new LlmsTxtFetcherService();
  });

  it('returns status 404 when file missing', async () => {
    mockFetch.mockResolvedValue({ status: 404, ok: false, text: async () => '' });
    const out = await svc.fetch('https://example.com');
    expect(out.status).toBe(404);
    expect(out.h1).toBeUndefined();
  });

  it('parses H1 and blockquote summary from valid llms.txt', async () => {
    const body = `# Example Site\n\n> Brief summary of the site.\n\n## Docs\n- [Start](https://example.com/start)\n`;
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => body,
      headers: new Map([['content-length', String(body.length)]]),
    });
    const out = await svc.fetch('https://example.com');
    expect(out.status).toBe(200);
    expect(out.h1).toBe('Example Site');
    expect(out.summary).toBe('Brief summary of the site.');
    expect(out.sectionCount).toBe(1);
    expect(out.sizeBytes).toBe(body.length);
  });

  it('flags warning when body > 1MB', async () => {
    const huge = '# Site\n\n' + 'x'.repeat(1_100_000);
    mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => huge, headers: new Map() });
    const out = await svc.fetch('https://example.com');
    expect(out.sizeBytes).toBeGreaterThan(1_000_000);
  });

  it('returns status -1 when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const out = await svc.fetch('https://example.com');
    expect(out.status).toBe(-1);
  });

  it('returns no h1 if file lacks one', async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true, text: async () => '## Just a heading\n', headers: new Map() });
    const out = await svc.fetch('https://example.com');
    expect(out.h1).toBeUndefined();
  });
});
