import { Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

const LITERAL_BLOCKLIST = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
]);

@Injectable()
export class UrlValidator {
  async validate(rawUrl: string): Promise<void> {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new UrlValidationError('URL is required and must be a string');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new UrlValidationError(`Malformed URL: ${rawUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UrlValidationError(`Unsupported protocol: ${parsed.protocol}`);
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (LITERAL_BLOCKLIST.has(hostname)) {
      throw new UrlValidationError(`SSRF: blocked loopback/literal host ${hostname}`);
    }

    // If hostname is itself an IP literal, validate directly
    if (isIP(hostname)) {
      this.assertPublicIp(hostname);
      return;
    }

    // Resolve DNS and check every returned IP (rebinding defense)
    const ips = await this.resolveHost(hostname);
    if (ips.length === 0) {
      throw new UrlValidationError(`DNS resolution failed for ${hostname}`);
    }
    for (const ip of ips) {
      this.assertPublicIp(ip);
    }
  }

  protected async resolveHost(hostname: string): Promise<string[]> {
    try {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      return records.map((r) => r.address);
    } catch {
      return [];
    }
  }

  private assertPublicIp(ip: string): void {
    const v = isIP(ip);
    if (v === 4) {
      const parts = ip.split('.').map(Number);
      const a = parts[0] ?? 0;
      const b = parts[1] ?? 0;
      // 10.0.0.0/8
      if (a === 10) throw new UrlValidationError(`SSRF: private IPv4 ${ip}`);
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) throw new UrlValidationError(`SSRF: private IPv4 ${ip}`);
      // 192.168.0.0/16
      if (a === 192 && b === 168) throw new UrlValidationError(`SSRF: private IPv4 ${ip}`);
      // 127.0.0.0/8 loopback
      if (a === 127) throw new UrlValidationError(`SSRF: loopback IPv4 ${ip}`);
      // 169.254.0.0/16 link-local
      if (a === 169 && b === 254) throw new UrlValidationError(`SSRF: link-local IPv4 ${ip}`);
      // 0.0.0.0/8
      if (a === 0) throw new UrlValidationError(`SSRF: invalid IPv4 ${ip}`);
      return;
    }
    if (v === 6) {
      const lower = ip.toLowerCase();
      if (lower === '::1' || lower === '::') {
        throw new UrlValidationError(`SSRF: loopback IPv6 ${ip}`);
      }
      // fc00::/7 (unique local) → first byte 0xfc or 0xfd
      if (/^f[cd][0-9a-f]{2}:/.test(lower)) {
        throw new UrlValidationError(`SSRF: private IPv6 ${ip}`);
      }
      // fe80::/10 (link-local)
      if (/^fe[89ab][0-9a-f]:/.test(lower)) {
        throw new UrlValidationError(`SSRF: link-local IPv6 ${ip}`);
      }
      return;
    }
    throw new UrlValidationError(`Invalid IP address: ${ip}`);
  }
}
