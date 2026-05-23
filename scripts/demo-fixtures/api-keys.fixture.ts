import { DEMO_API_KEY_IDS, DEMO_USER_IDS } from './ids';
import { daysAgo, daysFromNow, randomApiKeyPlaintext } from './helpers';

export type DemoApiKeySeed = {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  hashedKey: string;
  plaintext: string; // only for log output; not stored in DB
  environment: 'live' | 'test';
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

function build(
  id: string,
  userId: string,
  name: string,
  env: 'live' | 'test',
  seed: string,
  createdDaysAgo: number,
  state: 'active' | 'revoked' | 'expired',
  lastUsedDaysAgo: number | null,
): DemoApiKeySeed {
  const { plaintext, prefix, hashed } = randomApiKeyPlaintext(env, seed);
  return {
    id,
    userId,
    name,
    prefix,
    hashedKey: hashed,
    plaintext,
    environment: env,
    lastUsedAt: lastUsedDaysAgo !== null ? daysAgo(lastUsedDaysAgo) : null,
    lastUsedIp: lastUsedDaysAgo !== null ? '203.0.113.42' : null,
    revokedAt: state === 'revoked' ? daysAgo(5) : null,
    expiresAt: state === 'expired' ? daysAgo(7) : null,
    createdAt: daysAgo(createdDaysAgo),
  };
}

export const DEMO_API_KEYS: DemoApiKeySeed[] = [
  build(DEMO_API_KEY_IDS.ALICE_PROD,     DEMO_USER_IDS.ALICE, 'Production Dashboard', 'live', 'alice-prod',     80, 'active',  0),
  build(DEMO_API_KEY_IDS.ALICE_EXT_TEST, DEMO_USER_IDS.ALICE, 'Extension Test',       'test', 'alice-ext',      60, 'active',  1),
  build(DEMO_API_KEY_IDS.BOB_REVOKED,    DEMO_USER_IDS.BOB,   'Old Integration',      'live', 'bob-old',        50, 'revoked', 15),
  build(DEMO_API_KEY_IDS.CAROL_EXPIRED,  DEMO_USER_IDS.CAROL, 'Beta Trial',           'live', 'carol-beta',     40, 'expired', 20),
  build(DEMO_API_KEY_IDS.DAVID_PERSONAL, DEMO_USER_IDS.DAVID, 'Personal',             'live', 'david-personal', 14, 'active',  2),
  build(DEMO_API_KEY_IDS.OAUTH_NOTION,   DEMO_USER_IDS.OAUTH, 'Notion Bot',           'test', 'oauth-notion',   28, 'active',  0),
];

// ── UsageDaily — 7 days for each active key (4 active × 7 = 28 rows) ─────
export type DemoUsageDailySeed = {
  apiKeyId: string;
  date: Date;
  requests: number;
  llmCalls: number;
  llmTokensIn: number;
  llmTokensOut: number;
  bytesIn: number;
  bytesOut: number;
  errors: number;
  cacheHits: number;
};

function pattern(apiKeyId: string, daily: { req: number; llm: number; err: number; cache: number; spikeOnDay?: number }): DemoUsageDailySeed[] {
  const rows: DemoUsageDailySeed[] = [];
  for (let d = 6; d >= 0; d--) {
    const isSpike = daily.spikeOnDay === d;
    const mult = isSpike ? 5 : 1;
    const reqs = daily.req * mult + Math.floor(d * 3);
    rows.push({
      apiKeyId,
      date: daysAgo(d),
      requests: reqs,
      llmCalls: daily.llm * mult,
      llmTokensIn: daily.llm * mult * 1200,
      llmTokensOut: daily.llm * mult * 380,
      bytesIn: reqs * 2400,
      bytesOut: reqs * 18000,
      errors: isSpike ? daily.err * 8 : daily.err,
      cacheHits: daily.cache * mult,
    });
  }
  return rows;
}

export const DEMO_USAGE_DAILY: DemoUsageDailySeed[] = [
  ...pattern(DEMO_API_KEY_IDS.ALICE_PROD,     { req: 120, llm: 18, err: 2, cache: 95, spikeOnDay: 3 }),
  ...pattern(DEMO_API_KEY_IDS.ALICE_EXT_TEST, { req: 30,  llm: 0,  err: 1, cache: 12 }),
  ...pattern(DEMO_API_KEY_IDS.DAVID_PERSONAL, { req: 8,   llm: 1,  err: 0, cache: 6 }),
  ...pattern(DEMO_API_KEY_IDS.OAUTH_NOTION,   { req: 45,  llm: 6,  err: 1, cache: 40 }),
];
