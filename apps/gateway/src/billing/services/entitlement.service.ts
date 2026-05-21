import { Injectable } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
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
  constructor(private readonly subscriptions: SubscriptionService) {}

  /** Effective plan: any non-active sub falls back to Free. */
  async getEffectivePlan(userId: string): Promise<PlanCode> {
    const sub = await this.subscriptions.getCurrent(userId);
    if (!sub) return 'free';
    if (sub.status !== 'active') return 'free';
    if (sub.expiresAt && sub.expiresAt < new Date()) return 'free';
    return sub.planCode as PlanCode;
  }

  async hasFeature(userId: string, flag: FeatureFlag): Promise<EntitlementDecision> {
    const plan = await this.getEffectivePlan(userId);
    if (PLAN_FEATURES[plan].features.includes(flag)) return ALLOWED();
    return {
      allowed: false,
      code: 'FEATURE_NOT_AVAILABLE',
      reason: `Plan "${plan}" lacks feature "${flag}"`,
    };
  }

  async checkSiteAuditPageCount(userId: string, requestedPages: number): Promise<EntitlementDecision> {
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
    const iter = CronExpressionParser.parse(cron);
    const first = iter.next().toDate();
    const second = iter.next().toDate();
    return Math.round((second.getTime() - first.getTime()) / 60_000);
  }
}
