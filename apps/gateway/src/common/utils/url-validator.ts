import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const PRIVATE_CIDRS_V4: Array<[bigint, bigint]> = [
  ipRange('10.0.0.0', '10.255.255.255'),
  ipRange('172.16.0.0', '172.31.255.255'),
  ipRange('192.168.0.0', '192.168.255.255'),
  ipRange('127.0.0.0', '127.255.255.255'),
  ipRange('169.254.0.0', '169.254.255.255'),
  ipRange('0.0.0.0', '0.255.255.255'),
];

function ipv4ToBigInt(ip: string): bigint {
  return ip
    .split('.')
    .reduce((acc, oct) => (acc << 8n) + BigInt(parseInt(oct, 10)), 0n);
}

function ipRange(start: string, end: string): [bigint, bigint] {
  return [ipv4ToBigInt(start), ipv4ToBigInt(end)];
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToBigInt(ip);
  return PRIVATE_CIDRS_V4.some(([s, e]) => n >= s && n <= e);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower === '::'
  );
}

export interface ValidatedUrl {
  href: string;
  domain: string;
}

export async function validateUrlSafety(rawUrl: string): Promise<ValidatedUrl> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL khong hop le');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Chi ho tro http hoac https');
  }

  const host = parsed.hostname;
  if (!host) throw new BadRequestException('URL thieu hostname');

  const blockedHosts = ['localhost', 'metadata.google.internal'];
  if (blockedHosts.includes(host.toLowerCase())) {
    throw new BadRequestException('Host nay khong duoc phep');
  }

  // Resolve hostname to IP and check against private ranges
  try {
    const records = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true });
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address)) {
        throw new BadRequestException('IP private/loopback khong duoc phep');
      }
      if (r.family === 6 && isPrivateIPv6(r.address)) {
        throw new BadRequestException('IPv6 private khong duoc phep');
      }
    }
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException('Khong the resolve hostname');
  }

  return { href: parsed.href, domain: parsed.hostname };
}
