/**
 * Wire-level reply shape between the service worker and the UI
 * entrypoints (popup, sidepanel). Hoisted out of `background.ts` so
 * components can type their props without pulling the entire
 * background module — which would drag in chrome APIs that fail to
 * load under vitest's node env.
 */
import type { PublicCheckResponse } from './api-types';

export interface AuditOk {
  ok: true;
  result: PublicCheckResponse;
}

export interface AuditErr {
  ok: false;
  code: string;
  message: string;
  status: number;
  requestId?: string;
  retryAfterSeconds?: number;
}

export type AuditReply = AuditOk | AuditErr;
