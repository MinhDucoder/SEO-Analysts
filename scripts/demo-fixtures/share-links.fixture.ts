import { DEMO_AUDIT_IDS, DEMO_SHARE_LINK_IDS, deriveReportId } from './ids';
import { daysAgo, shareToken } from './helpers';

export type DemoShareLinkSeed = {
  id: string;
  reportId: string;
  auditId: string;
  token: string;
  isActive: boolean;
  accessedCount: number;
  lastAccessedAt: Date | null;
  createdAt: Date;
};

function build(
  id: string,
  auditId: string,
  state: 'active' | 'revoked',
  accessedCount: number,
  lastAccessedDaysAgo: number | null,
  createdDaysAgo: number,
): DemoShareLinkSeed {
  return {
    id,
    auditId,
    reportId: deriveReportId(auditId),
    token: shareToken(auditId),
    isActive: state === 'active',
    accessedCount,
    lastAccessedAt: lastAccessedDaysAgo !== null ? daysAgo(lastAccessedDaysAgo) : null,
    createdAt: daysAgo(createdDaysAgo),
  };
}

export const DEMO_SHARE_LINKS: DemoShareLinkSeed[] = [
  // 5 active never accessed
  build(DEMO_SHARE_LINK_IDS.ALICE_A01,  DEMO_AUDIT_IDS.ALICE_A01,  'active', 0,   null, 30),
  build(DEMO_SHARE_LINK_IDS.ALICE_A05,  DEMO_AUDIT_IDS.ALICE_A05,  'active', 0,   null, 20),
  build(DEMO_SHARE_LINK_IDS.BOB_B02,    DEMO_AUDIT_IDS.BOB_B02,    'active', 0,   null, 14),
  build(DEMO_SHARE_LINK_IDS.DAVID_D01,  DEMO_AUDIT_IDS.DAVID_D01,  'active', 0,   null, 9),
  build(DEMO_SHARE_LINK_IDS.CAROL_C02,  DEMO_AUDIT_IDS.CAROL_C02,  'active', 0,   null, 7),

  // 3 active accessed moderately
  build(DEMO_SHARE_LINK_IDS.ALICE_A10,  DEMO_AUDIT_IDS.ALICE_A10,  'active', 7,   2,   15),
  build(DEMO_SHARE_LINK_IDS.ALICE_A14,  DEMO_AUDIT_IDS.ALICE_A14,  'active', 18,  1,   8),
  build(DEMO_SHARE_LINK_IDS.BOB_B05,    DEMO_AUDIT_IDS.BOB_B05,    'active', 12,  3,   12),

  // 1 viral
  build(DEMO_SHARE_LINK_IDS.ALICE_VIRAL, DEMO_AUDIT_IDS.ALICE_SITE_01, 'active', 154, 0, 60),

  // 1 revoked
  build(DEMO_SHARE_LINK_IDS.CAROL_REVOKED, DEMO_AUDIT_IDS.CAROL_C03, 'revoked', 3, 4, 9),
];
