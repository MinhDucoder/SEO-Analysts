import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UrlValidator, UrlValidationError } from '../../src/crawler/url-validator';

describe('UrlValidator', () => {
  let validator: UrlValidator;

  beforeEach(() => {
    validator = new UrlValidator();
  });

  describe('syntactic checks', () => {
    it('accepts a valid https URL', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['93.184.216.34']);
      await expect(validator.validate('https://example.com/page')).resolves.toBeUndefined();
    });

    it('rejects non-http(s) protocols', async () => {
      await expect(validator.validate('ftp://example.com')).rejects.toThrow(UrlValidationError);
      await expect(validator.validate('file:///etc/passwd')).rejects.toThrow(UrlValidationError);
      await expect(validator.validate('javascript:alert(1)')).rejects.toThrow(UrlValidationError);
    });

    it('rejects malformed URLs', async () => {
      await expect(validator.validate('not-a-url')).rejects.toThrow(UrlValidationError);
      await expect(validator.validate('')).rejects.toThrow(UrlValidationError);
    });
  });

  describe('SSRF blocklist (literal hostnames)', () => {
    it.each([
      'http://localhost/admin',
      'http://127.0.0.1/',
      'http://127.0.0.5/',
      'http://[::1]/',
      'http://0.0.0.0/',
    ])('blocks literal blocklisted hostname: %s', async (url) => {
      await expect(validator.validate(url)).rejects.toThrow(/SSRF|private|loopback/i);
    });
  });

  describe('SSRF blocklist (private IP ranges after DNS resolution)', () => {
    it('blocks 10.0.0.0/8 after DNS resolution', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['10.1.2.3']);
      await expect(validator.validate('http://internal.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks 172.16.0.0/12', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['172.20.30.40']);
      await expect(validator.validate('http://internal.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks 192.168.0.0/16', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['192.168.1.1']);
      await expect(validator.validate('http://internal.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks 169.254.0.0/16 link-local', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['169.254.169.254']);
      await expect(validator.validate('http://metadata.example.com/')).rejects.toThrow(/link-local|private/i);
    });

    it('allows public IPv4', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['8.8.8.8']);
      await expect(validator.validate('http://dns.google/')).resolves.toBeUndefined();
    });
  });

  describe('SSRF blocklist (IPv6)', () => {
    it('blocks fc00::/7 unique-local', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['fc00::1']);
      await expect(validator.validate('http://v6.example.com/')).rejects.toThrow(/private/i);
    });

    it('blocks fe80::/10 link-local', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['fe80::1']);
      await expect(validator.validate('http://v6.example.com/')).rejects.toThrow(/link-local|private/i);
    });
  });

  describe('DNS rebinding defense', () => {
    it('rejects when DNS resolves to multiple IPs and any one is private', async () => {
      vi.spyOn(validator as any, 'resolveHost').mockResolvedValue(['8.8.8.8', '10.0.0.1']);
      await expect(validator.validate('http://attacker.example.com/')).rejects.toThrow(/private/i);
    });
  });
});
