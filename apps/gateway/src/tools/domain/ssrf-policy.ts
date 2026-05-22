import { Address4, Address6 } from 'ip-address';

export const ALLOWED_PORTS = [80, 443, 8080, 8443] as const;
export const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const;

const IPV4_BLOCKED_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '224.0.0.0/4',
];

const IPV6_BLOCKED_CIDRS = ['::1/128', 'fc00::/7', 'fe80::/10', 'ff00::/8'];

export function isAllowedPort(port: number): boolean {
  return (ALLOWED_PORTS as readonly number[]).includes(port);
}

export function isAllowedProtocol(protocol: string): boolean {
  return (ALLOWED_PROTOCOLS as readonly string[]).includes(protocol);
}

/**
 * Returns true if the given IP literal is in a private / reserved / link-local
 * range (and therefore must NOT be fetched). Unparseable input is blocked.
 */
export function isBlockedIp(ip: string): boolean {
  if (Address4.isValid(ip)) {
    const addr = new Address4(ip);
    return IPV4_BLOCKED_CIDRS.some((cidr) => addr.isInSubnet(new Address4(cidr)));
  }
  if (Address6.isValid(ip)) {
    const addr = new Address6(ip);
    return IPV6_BLOCKED_CIDRS.some((cidr) => addr.isInSubnet(new Address6(cidr)));
  }
  // Unparseable → safest to block.
  return true;
}
