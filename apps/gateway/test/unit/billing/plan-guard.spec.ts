import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanGuard } from '../../../src/common/guards/plan.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { FeatureFlag } from '@repo/shared';

function ctx(user: any): ExecutionContext {
  const req = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PlanGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
  const ent = { hasFeature: vi.fn(), getEffectivePlan: vi.fn() } as any;
  // config mock with BILLING_FEATURE_ENABLED=true so enforcement path is exercised
  const configMock = { get: vi.fn().mockReturnValue('true') } as any;
  let guard: PlanGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new PlanGuard(reflector as any, ent, configMock);
  });

  it('allows when no @RequireFeature metadata', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    expect(await guard.canActivate(ctx({ id: 'u1' }))).toBe(true);
  });

  it('throws FeatureNotAvailable when entitlement.hasFeature returns false', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(FeatureFlag.SITE_AUDIT);
    ent.hasFeature.mockResolvedValue({ allowed: false, code: 'FEATURE_NOT_AVAILABLE' });
    ent.getEffectivePlan.mockResolvedValue('free');
    await expect(guard.canActivate(ctx({ id: 'u1' }))).rejects.toThrow(/FEATURE_NOT_AVAILABLE/);
  });

  it('allows when feature is granted', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(FeatureFlag.SITE_AUDIT);
    ent.hasFeature.mockResolvedValue({ allowed: true });
    expect(await guard.canActivate(ctx({ id: 'u1' }))).toBe(true);
  });

  it('allows everything when BILLING_FEATURE_ENABLED=false regardless of entitlement', async () => {
    const disabledConfig = { get: vi.fn().mockReturnValue('false') } as any;
    const disabledGuard = new PlanGuard(reflector as any, ent, disabledConfig);
    (reflector.getAllAndOverride as any).mockReturnValue(FeatureFlag.SITE_AUDIT);
    // hasFeature is never called when flag is off
    expect(await disabledGuard.canActivate(ctx({ id: 'u1' }))).toBe(true);
    expect(ent.hasFeature).not.toHaveBeenCalled();
  });
});
