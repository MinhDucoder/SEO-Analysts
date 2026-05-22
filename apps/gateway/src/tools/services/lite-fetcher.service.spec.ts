import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteFetcherService } from './lite-fetcher.service';

// Mock DNS resolver
vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(),
  },
  lookup: vi.fn(),
}));

import dns from 'node:dns/promises';

describe('LiteFetcherService — SSRF gates', () => {
  let svc: LiteFetcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new LiteFetcherService();
  });

  it('rejects non-http(s) protocol', async () => {
    await expect(svc.get('file:///etc/passwd')).rejects.toMatchObject({
      code: 'INVALID_PROTOCOL',
    });
    await expect(svc.get('gopher://x')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
    await expect(svc.get('ftp://x')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
  });

  it('rejects non-whitelisted port', async () => {
    await expect(svc.get('http://example.com:22/')).rejects.toMatchObject({
      code: 'INVALID_PORT',
    });
    await expect(svc.get('http://example.com:5432/')).rejects.toMatchObject({
      code: 'INVALID_PORT',
    });
  });

  it('accepts implicit port (80, 443)', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    // We don't care about response here — only that the port gate didn't throw early.
    await expect(svc.get('http://example.com/')).rejects.not.toMatchObject({
      code: 'INVALID_PORT',
    });
  });

  it('rejects when DNS resolves to private IPv4', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as any);
    await expect(svc.get('http://internal.example.com/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('rejects when DNS resolves to AWS metadata 169.254.169.254', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([
      { address: '169.254.169.254', family: 4 },
    ] as any);
    await expect(svc.get('http://rebound.example.com/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('rejects when DNS resolves to private IPv6 (fc00::/7)', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: 'fc00::1', family: 6 }] as any);
    await expect(svc.get('http://v6.example.com/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('rejects on DNS failure', async () => {
    vi.mocked(dns.lookup).mockRejectedValue(new Error('ENOTFOUND'));
    await expect(svc.get('http://does-not-exist.example.com/')).rejects.toMatchObject({
      code: 'DNS_FAIL',
    });
  });
});
