import { DEMO_REFRESH_TOKEN_IDS, DEMO_USER_IDS } from './ids';
import { daysAgo, daysFromNow, deterministicTokenBytes, hashRefreshToken } from './helpers';

export type DemoRefreshTokenSeed = {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
};

function build(
  id: string,
  userId: string,
  seed: string,
  userAgent: string,
  ip: string,
  state: 'active' | 'expired' | 'revoked',
  createdDaysAgo: number,
): DemoRefreshTokenSeed {
  const plaintext = deterministicTokenBytes(seed);
  const tokenHash = hashRefreshToken(plaintext);
  let expiresAt: Date;
  let isRevoked = false;
  if (state === 'expired') {
    expiresAt = daysAgo(1);
  } else if (state === 'revoked') {
    expiresAt = daysFromNow(20);
    isRevoked = true;
  } else {
    expiresAt = daysFromNow(28);
  }
  return {
    id,
    userId,
    tokenHash,
    userAgent,
    ipAddress: ip,
    expiresAt,
    isRevoked,
    createdAt: daysAgo(createdDaysAgo),
  };
}

export const DEMO_REFRESH_TOKENS: DemoRefreshTokenSeed[] = [
  build(DEMO_REFRESH_TOKEN_IDS.ALICE_CHROME, DEMO_USER_IDS.ALICE, 'alice-chrome',
    'Mozilla/5.0 (Macintosh) Chrome/120 Safari/537', '203.0.113.10', 'active', 2),
  build(DEMO_REFRESH_TOKEN_IDS.ALICE_MOBILE, DEMO_USER_IDS.ALICE, 'alice-mobile',
    'Mozilla/5.0 (iPhone; iOS 17) Mobile/15E148', '203.0.113.11', 'active', 1),
  build(DEMO_REFRESH_TOKEN_IDS.BOB_EXPIRED, DEMO_USER_IDS.BOB, 'bob-expired',
    'Mozilla/5.0 (Windows NT 10) Edge/121', '198.51.100.20', 'expired', 31),
  build(DEMO_REFRESH_TOKEN_IDS.CAROL_REVOKED, DEMO_USER_IDS.CAROL, 'carol-revoked',
    'Mozilla/5.0 (Linux) Firefox/124', '198.51.100.30', 'revoked', 10),
];
