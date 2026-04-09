import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PlaywrightFetcher } from '../../src/crawler/playwright-fetcher';

describe('PlaywrightFetcher', () => {
  let fetcher: PlaywrightFetcher;
  const fakeResponse = {
    status: vi.fn().mockReturnValue(200),
    url: vi.fn().mockReturnValue('https://example.com/final'),
    headers: vi.fn().mockReturnValue({
      'content-encoding': 'br',
      'cache-control': 'no-cache',
    }),
  };
  const fakePage = {
    goto: vi.fn().mockResolvedValue(fakeResponse),
    content: vi.fn().mockResolvedValue('<html><body>Rendered content</body></html>'),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const fakeContext = {
    newPage: vi.fn().mockResolvedValue(fakePage),
  };
  const fakePool = {
    acquire: vi.fn().mockResolvedValue(fakeContext),
    release: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fakePool.acquire.mockResolvedValue(fakeContext);
    fakeContext.newPage.mockResolvedValue(fakePage);
    fakePage.goto.mockResolvedValue(fakeResponse);
    fakePage.content.mockResolvedValue('<html><body>Rendered content body that is long enough to not look like a SPA placeholder for testing.</body></html>');
    fetcher = new PlaywrightFetcher(fakePool as any);
  });

  it('renders a URL and returns the rendered HTML', async () => {
    const result = await fetcher.fetch('https://example.com/');
    expect(fakePool.acquire).toHaveBeenCalled();
    expect(fakePage.goto).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ waitUntil: 'networkidle', timeout: 30_000 }),
    );
    expect(result.statusCode).toBe(200);
    expect(result.finalUrl).toBe('https://example.com/final');
    expect(result.html).toContain('Rendered content');
    expect(result.fetcherType).toBe('playwright');
    expect(result.contentEncoding).toBe('br');
  });

  it('releases the context even if goto throws', async () => {
    fakePage.goto.mockRejectedValueOnce(new Error('navigation timeout'));
    await expect(fetcher.fetch('https://example.com/')).rejects.toThrow('navigation timeout');
    expect(fakePool.release).toHaveBeenCalledWith(fakeContext);
  });

  it('records redirect chain when final URL differs', async () => {
    const result = await fetcher.fetch('https://example.com/');
    expect(result.redirectChain).toEqual(['https://example.com/', 'https://example.com/final']);
  });
});
