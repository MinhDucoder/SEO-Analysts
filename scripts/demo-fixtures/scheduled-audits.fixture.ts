import {
  DEMO_AUDIT_ALERT_IDS,
  DEMO_AUDIT_IDS,
  DEMO_SCHEDULED_AUDIT_IDS,
  DEMO_USER_IDS,
} from './ids';
import { daysAgo } from './helpers';

export type DemoScheduledAuditSeed = {
  id: string;
  userId: string;
  url: string;
  cron: string;
  mode: 'single' | 'site';
  maxUrls: number | null;
  targetKeyword: string | null;
  lastRunAt: Date | null;
  lastScore: number | null;
  isActive: boolean;
  createdAt: Date;
};

export const DEMO_SCHEDULED_AUDITS: DemoScheduledAuditSeed[] = [
  {
    id: DEMO_SCHEDULED_AUDIT_IDS.ALICE_DAILY,
    userId: DEMO_USER_IDS.ALICE,
    url: 'https://vnexpress.net/',
    cron: '0 9 * * *',
    mode: 'single',
    maxUrls: null,
    targetKeyword: 'tin tức',
    lastRunAt: daysAgo(1),
    lastScore: 95,
    isActive: true,
    createdAt: daysAgo(60),
  },
  {
    id: DEMO_SCHEDULED_AUDIT_IDS.BOB_WEEKLY,
    userId: DEMO_USER_IDS.BOB,
    url: 'https://bobs-blog.example.com/',
    cron: '0 0 * * 1',
    mode: 'single',
    maxUrls: null,
    targetKeyword: 'personal blog',
    lastRunAt: daysAgo(7),
    lastScore: 64,
    isActive: true,
    createdAt: daysAgo(40),
  },
  {
    id: DEMO_SCHEDULED_AUDIT_IDS.CAROL_PAUSED,
    userId: DEMO_USER_IDS.CAROL,
    url: 'https://travel-blog.example.com/',
    cron: '0 0 1 * *',
    mode: 'single',
    maxUrls: null,
    targetKeyword: 'du lịch',
    lastRunAt: daysAgo(35),
    lastScore: 75,
    isActive: false,
    createdAt: daysAgo(45),
  },
  {
    id: DEMO_SCHEDULED_AUDIT_IDS.ALICE_SITE_WEEKLY,
    userId: DEMO_USER_IDS.ALICE,
    url: 'https://my-portfolio.example.com/',
    cron: '0 3 * * 0',
    mode: 'site',
    maxUrls: 24,
    targetKeyword: 'portfolio dev',
    lastRunAt: daysAgo(2),
    lastScore: 84,
    isActive: true,
    createdAt: daysAgo(70),
  },
];

// ── Audit Alerts (4 — cover all 3 AlertType) ───────────────────────────────
export type DemoAuditAlertSeed = {
  id: string;
  auditId: string;
  scheduleId: string | null;
  type: 'score_drop' | 'new_issues' | 'site_down';
  deltaScore: number | null;
  message: string;
  sentAt: Date | null;
  createdAt: Date;
};

export const DEMO_AUDIT_ALERTS: DemoAuditAlertSeed[] = [
  {
    id: DEMO_AUDIT_ALERT_IDS.ALICE_SCORE_DROP,
    auditId: DEMO_AUDIT_IDS.ALICE_A10,
    scheduleId: DEMO_SCHEDULED_AUDIT_IDS.ALICE_DAILY,
    type: 'score_drop',
    deltaScore: -22,
    message: 'SEO score giảm 22 điểm so với lần audit trước (95 → 73)',
    sentAt: daysAgo(29),
    createdAt: daysAgo(30),
  },
  {
    id: DEMO_AUDIT_ALERT_IDS.ALICE_SITE_NEW_ISSUES,
    auditId: DEMO_AUDIT_IDS.ALICE_SITE_03,
    scheduleId: DEMO_SCHEDULED_AUDIT_IDS.ALICE_SITE_WEEKLY,
    type: 'new_issues',
    deltaScore: null,
    message: '5 issue mới xuất hiện trên site-wide audit (broken_links, image_alt)',
    sentAt: daysAgo(21),
    createdAt: daysAgo(22),
  },
  {
    id: DEMO_AUDIT_ALERT_IDS.ALICE_SITE_DOWN,
    auditId: DEMO_AUDIT_IDS.ALICE_FAILED_TIMEOUT,
    scheduleId: null, // one-off audit, no schedule
    type: 'site_down',
    deltaScore: null,
    message: 'Site không phản hồi trong 30s — có thể đang downtime',
    sentAt: daysAgo(1),
    createdAt: daysAgo(2),
  },
  {
    id: DEMO_AUDIT_ALERT_IDS.BOB_SCORE_DROP,
    auditId: DEMO_AUDIT_IDS.BOB_B07,
    scheduleId: DEMO_SCHEDULED_AUDIT_IDS.BOB_WEEKLY,
    type: 'score_drop',
    deltaScore: -9,
    message: 'SEO score giảm 9 điểm (73 → 64) — meta description rỗng',
    sentAt: daysAgo(7),
    createdAt: daysAgo(8),
  },
];
