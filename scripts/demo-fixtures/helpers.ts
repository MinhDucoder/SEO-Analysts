import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

export const DEMO_PASSWORD_PLAIN = 'Demo@123';

let cachedHash: string | null = null;
export async function hashDemoPassword(): Promise<string> {
  if (!cachedHash) {
    cachedHash = await bcrypt.hash(DEMO_PASSWORD_PLAIN, 12);
  }
  return cachedHash;
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function hashRefreshToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function shareToken(seed: string): string {
  return createHash('sha256').update(`demo-share-${seed}`).digest('hex').slice(0, 48);
}

// ── Time helpers ─────────────────────────────────────────────────────────
// All "now" references resolved once per script run so a single seed
// invocation yields self-consistent timestamps.
export const NOW = new Date('2026-05-19T10:00:00Z');

export function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
}

export function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

export function daysFromNow(d: number): Date {
  return new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000);
}

// Deterministic pseudo-random in [0,1) seeded by string. Used to pick
// RuleResult distributions per-audit without depending on Math.random().
export function seededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function randomApiKeyPlaintext(env: 'live' | 'test', seed: string): {
  plaintext: string;
  prefix: string;
  hashed: string;
} {
  const random = createHash('sha256').update(`demo-key-${seed}`).digest('base64url').slice(0, 32);
  const plaintext = `sk_${env}_${random}`;
  const prefix = plaintext.slice(0, 16);
  return { plaintext, prefix, hashed: hashApiKey(plaintext) };
}

// Random byte for refresh tokens — deterministic by seed
export function deterministicTokenBytes(seed: string, bytes = 48): string {
  let buf = createHash('sha512').update(`refresh-${seed}`).digest();
  while (buf.length < bytes) {
    buf = Buffer.concat([buf, createHash('sha512').update(buf).digest()]);
  }
  return buf.slice(0, bytes).toString('base64url');
}
