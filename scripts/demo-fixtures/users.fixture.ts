import { DEMO_USER_IDS } from './ids';
import { daysAgo } from './helpers';

export type DemoUserSeed = {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isLocked: boolean;
  oauthProvider: string | null;
  avatarUrl: string | null;
  withPassword: boolean;
  createdAt: Date;
};

export const DEMO_USERS: DemoUserSeed[] = [
  {
    id: DEMO_USER_IDS.ALICE,
    email: 'alice@example.com',
    fullName: 'Alice Nguyen',
    role: 'user',
    isVerified: true,
    isLocked: false,
    oauthProvider: null,
    avatarUrl: 'https://i.pravatar.cc/150?u=alice',
    withPassword: true,
    createdAt: daysAgo(95),
  },
  {
    id: DEMO_USER_IDS.BOB,
    email: 'bob@example.com',
    fullName: 'Bob Tran',
    role: 'user',
    isVerified: true,
    isLocked: false,
    oauthProvider: null,
    avatarUrl: 'https://i.pravatar.cc/150?u=bob',
    withPassword: true,
    createdAt: daysAgo(60),
  },
  {
    id: DEMO_USER_IDS.CAROL,
    email: 'carol@example.com',
    fullName: 'Carol Le',
    role: 'user',
    isVerified: true,
    isLocked: false,
    oauthProvider: null,
    avatarUrl: 'https://i.pravatar.cc/150?u=carol',
    withPassword: true,
    createdAt: daysAgo(45),
  },
  {
    id: DEMO_USER_IDS.DAVID,
    email: 'david@example.com',
    fullName: 'David Pham',
    role: 'user',
    isVerified: true,
    isLocked: false,
    oauthProvider: null,
    avatarUrl: 'https://i.pravatar.cc/150?u=david',
    withPassword: true,
    createdAt: daysAgo(15),
  },
  {
    id: DEMO_USER_IDS.OAUTH,
    email: 'oauth.user@example.com',
    fullName: 'Oanh Vu (Google)',
    role: 'user',
    isVerified: true,
    isLocked: false,
    oauthProvider: 'google',
    avatarUrl: 'https://i.pravatar.cc/150?u=oanh',
    withPassword: false,
    createdAt: daysAgo(30),
  },
  {
    id: DEMO_USER_IDS.PENDING,
    email: 'pending@example.com',
    fullName: 'Pending Verification',
    role: 'user',
    isVerified: false,
    isLocked: false,
    oauthProvider: null,
    avatarUrl: null,
    withPassword: true,
    createdAt: daysAgo(2),
  },
  {
    id: DEMO_USER_IDS.LOCKED,
    email: 'locked@example.com',
    fullName: 'Locked Account',
    role: 'user',
    isVerified: true,
    isLocked: true,
    oauthProvider: null,
    avatarUrl: null,
    withPassword: true,
    createdAt: daysAgo(40),
  },
  {
    id: DEMO_USER_IDS.DEMO_ADMIN,
    email: 'demo-admin@seo-analyst.com',
    fullName: 'Demo Admin',
    role: 'admin',
    isVerified: true,
    isLocked: false,
    oauthProvider: null,
    avatarUrl: 'https://i.pravatar.cc/150?u=demoadmin',
    withPassword: true,
    createdAt: daysAgo(90),
  },
];
