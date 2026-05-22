import { describe, it, expect } from 'vitest';
import { isBlockedIp, ALLOWED_PORTS, isAllowedPort, isAllowedProtocol } from './ssrf-policy';

describe('SSRF policy — isBlockedIp', () => {
  describe('IPv4 blocks', () => {
    it.each([
      ['127.0.0.1', '127.0.0.0/8 loopback'],
      ['127.255.255.255', '127.0.0.0/8 broadcast'],
      ['10.0.0.1', '10.0.0.0/8 private'],
      ['10.255.255.255', '10.0.0.0/8 edge'],
      ['172.16.0.1', '172.16.0.0/12 private'],
      ['172.31.255.255', '172.16.0.0/12 edge'],
      ['192.168.0.1', '192.168.0.0/16 private'],
      ['192.168.255.255', '192.168.0.0/16 edge'],
      ['169.254.169.254', 'AWS metadata'],
      ['169.254.0.1', '169.254.0.0/16 link-local'],
      ['224.0.0.1', '224.0.0.0/4 multicast'],
      ['0.0.0.0', '0.0.0.0/8'],
    ])('blocks %s (%s)', (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    });

    it.each([
      ['8.8.8.8'],
      ['1.1.1.1'],
      ['172.15.255.255'], // just outside 172.16/12
      ['172.32.0.0'], // just outside 172.16/12
      ['11.0.0.1'], // outside 10/8
    ])('allows public %s', (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    });
  });

  describe('IPv6 blocks', () => {
    it.each([
      ['::1', 'loopback'],
      ['fc00::1', 'unique local'],
      ['fd00::1', 'unique local'],
      ['fe80::1', 'link-local'],
      ['ff00::1', 'multicast'],
    ])('blocks %s (%s)', (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    });

    it('allows public IPv6 2606:4700::1111 (Cloudflare)', () => {
      expect(isBlockedIp('2606:4700::1111')).toBe(false);
    });
  });

  it('blocks unparseable input', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
    expect(isBlockedIp('')).toBe(true);
  });
});

describe('SSRF policy — port whitelist', () => {
  it.each([80, 443, 8080, 8443])('allows port %i', (p) => {
    expect(isAllowedPort(p)).toBe(true);
  });

  it.each([22, 25, 3306, 5432, 6379, 9200, 11211, 27017])('blocks port %i', (p) => {
    expect(isAllowedPort(p)).toBe(false);
  });

  it('ALLOWED_PORTS contains exactly 4 ports', () => {
    expect(ALLOWED_PORTS).toEqual([80, 443, 8080, 8443]);
  });
});

describe('SSRF policy — protocol whitelist', () => {
  it.each(['http:', 'https:'])('allows %s', (p) => {
    expect(isAllowedProtocol(p)).toBe(true);
  });
  it.each(['file:', 'ftp:', 'gopher:', 'data:', 'dict:', 'ws:', 'wss:'])('blocks %s', (p) => {
    expect(isAllowedProtocol(p)).toBe(false);
  });
});
