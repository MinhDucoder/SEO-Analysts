/**
 * @file Pure URL canonicalization for site-wide crawl dedup.
 * Rules, in order:
 *   1. scheme must be http or https (blocks javascript:, file:, ftp:, …)
 *   2. host lower-cased, default port removed
 *   3. fragment removed
 *   4. tracking + session-id query params dropped
 *   5. remaining params sorted alphabetically for stable string-equality dedup
 *   6. root path empty → "/"
 * `sameRegistrableDomain` compares eTLD+1 via a simple last-two-label
 * heuristic; good enough for staying inside one site during a crawl.
 */

const STRIP_QUERY_PARAMS = new Set([
  'gclid', 'fbclid', 'msclkid', 'yclid', 'dclid',
  'jsessionid', 'phpsessid', 'sid', 'sessionid',
  '_ga', '_gl', 'mc_cid', 'mc_eid',
]);

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

export function canonicalizeUrl(input: string): string | null {
  if (!input) return null;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (!ALLOWED_SCHEMES.has(u.protocol)) return null;

  u.hostname = u.hostname.toLowerCase();
  u.hash = '';

  if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) {
    u.port = '';
  }

  const paramsToKeep: Array<[string, string]> = [];
  for (const [k, v] of u.searchParams.entries()) {
    const lower = k.toLowerCase();
    if (STRIP_QUERY_PARAMS.has(lower)) continue;
    if (lower.startsWith('utm_')) continue;
    paramsToKeep.push([k, v]);
  }
  paramsToKeep.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = '';
  for (const [k, v] of paramsToKeep) u.searchParams.append(k, v);

  if (u.pathname === '') u.pathname = '/';
  return u.toString();
}

export function dedupeUrls(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const canon = canonicalizeUrl(raw);
    if (!canon || seen.has(canon)) continue;
    seen.add(canon);
    out.push(canon);
  }
  return out;
}

/**
 * Cheap eTLD+1 comparison: takes the last two labels of each hostname.
 * Fails on multi-label public suffixes like `co.uk`, but for Tier 1
 * (personal tool, no multi-country SEO) this is sufficient. Upgrade to
 * the full Public Suffix List when users complain.
 */
export function sameRegistrableDomain(a: string, b: string): boolean {
  const hostA = safeHost(a);
  const hostB = safeHost(b);
  if (!hostA || !hostB) return false;
  return registrable(hostA) === registrable(hostB);
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function registrable(host: string): string {
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  return parts.slice(-2).join('.');
}
