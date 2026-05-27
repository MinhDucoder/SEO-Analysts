import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseExpression } from 'cron-parser';
import { UserRole } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SubscriptionService } from './subscription.service';
import { PLAN_FEATURES, FeatureFlag, PlanCode } from '../domain/plan-features';

export interface EntitlementDecision {
  allowed: boolean;
  code: string;
  reason: string;
}

const ALLOWED = (): EntitlementDecision => ({ allowed: true, code: 'OK', reason: '' });

@Injectable()
export class EntitlementService {
  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Master billing switch. When BILLING_FEATURE_ENABLED !== 'true' the whole
   * plan/quota system is OFF and every entitlement check must allow. The
   * PlanGuard/QuotaGuard already honor this flag, but these check methods are
   * also called directly from services (scheduled-audits, site audits) — so
   * the flag MUST be enforced here too, otherwise free-plan limits (e.g.
   * scheduled_audits_max=0) silently block everyone while billing is disabled.
   */
  private billingEnforced(): boolean {
    return this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
  }

  /**
   * Admin god-mode: an admin account bypasses every plan, quota and rate limit
   * across the app (web + public API). This is the single source of truth for
   * that bypass — guards check `req.user.role` directly, but services that only
   * hold a `userId` (audits, scheduled-audits, tools, public-check, api-keys)
   * call this instead of re-querying the role themselves.
   */
  async isAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  }

  /** Effective plan: any non-active sub falls back to Free. */
  async getEffectivePlan(userId: string): Promise<PlanCode> {
    const sub = await this.subscriptions.getCurrent(userId);
    if (!sub) return 'free';
    if (sub.status !== 'active') return 'free';
    if (sub.expiresAt && sub.expiresAt < new Date()) return 'free';
    return sub.planCode as PlanCode;
  }

  async hasFeature(userId: string, flag: FeatureFlag): Promise<EntitlementDecision> {
    if (!this.billingEnforced()) return ALLOWED();
    if (await this.isAdmin(userId)) return ALLOWED();
    const plan = await this.getEffectivePlan(userId);
    if (PLAN_FEATURES[plan].features.includes(flag)) return ALLOWED();
    return {
      allowed: false,
      code: 'FEATURE_NOT_AVAILABLE',
      reason: `Plan "${plan}" lacks feature "${flag}"`,
    };
  }

  async checkSiteAuditPageCount(userId: string, requestedPages: number): Promise<EntitlementDecision> {
    if (!this.billingEnforced()) return ALLOWED();
    if (await this.isAdmin(userId)) return ALLOWED();
    const plan = await this.getEffectivePlan(userId);
    const max = PLAN_FEATURES[plan].site_audit_max_pages;
    if (requestedPages <= max) return ALLOWED();
    return {
      allowed: false,
      code: 'PAGE_LIMIT_EXCEEDED',
      reason: `Plan "${plan}" cho phép tối đa ${max} trang/audit`,
    };
  }

  async checkScheduledAuditCount(userId: string, currentCount: number): Promise<EntitlementDecision> {
    if (!this.billingEnforced()) return ALLOWED();
    if (await this.isAdmin(userId)) return ALLOWED();
    const plan = await this.getEffectivePlan(userId);
    const max = PLAN_FEATURES[plan].scheduled_audits_max;
    if (currentCount < max) return ALLOWED();
    return {
      allowed: false,
      code: 'SCHEDULE_LIMIT_EXCEEDED',
      reason: `Plan "${plan}" cho phép tối đa ${max} lịch định kỳ`,
    };
  }

  async checkScheduledAuditCron(userId: string, cron: string): Promise<EntitlementDecision> {
    if (!this.billingEnforced()) return ALLOWED();
    if (await this.isAdmin(userId)) return ALLOWED();
    const plan = await this.getEffectivePlan(userId);
    const minMinutes = PLAN_FEATURES[plan].scheduled_audit_min_interval_min;
    const interval = this.minIntervalMinutes(cron);
    if (interval >= minMinutes) return ALLOWED();
    return {
      allowed: false,
      code: 'CRON_TOO_FREQUENT',
      reason: `Plan "${plan}" yêu cầu khoảng cách ≥ ${minMinutes} phút`,
    };
  }

  private minIntervalMinutes(cron: string): number {
    // cron-parser is pinned to 4.9.0 because BullMQ requires exactly that
    // version (it calls the v4 `parseExpression` API internally). Use the
    // same v4 API here so the gateway resolves a single cron-parser copy —
    // a v5 dep would hoist over BullMQ's and break its job scheduler.
    const iter = parseExpression(cron);
    const first = iter.next().toDate();
    const second = iter.next().toDate();
    return Math.round((second.getTime() - first.getTime()) / 60_000);
  }
}
