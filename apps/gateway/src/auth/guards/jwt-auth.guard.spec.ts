import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { OPTIONAL_AUTH_KEY } from '../../common/decorators/optional-auth.decorator';

describe('JwtAuthGuard with @OptionalAuth', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    guard = new JwtAuthGuard(reflector);
    // Stub super.canActivate (the passport AuthGuard) so we don't run real strategy.
    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)),
      'canActivate',
    ).mockResolvedValue(true);
  });

  const mockCtx = (headers: Record<string, string> = {}) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as any;

  // canActivate returns a sync boolean for short-circuits (Public / optional+no-header)
  // and a Promise for passport delegation; `await` normalizes both.
  it('returns true when @Public()', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((k: string) =>
      k === IS_PUBLIC_KEY ? true : undefined,
    );
    expect(await guard.canActivate(mockCtx())).toBe(true);
  });

  it('with @OptionalAuth, returns true when no Authorization header', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((k: string) =>
      k === OPTIONAL_AUTH_KEY ? true : undefined,
    );
    expect(await guard.canActivate(mockCtx())).toBe(true);
  });

  it('with @OptionalAuth and Authorization header, delegates to passport', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((k: string) =>
      k === OPTIONAL_AUTH_KEY ? true : undefined,
    );
    expect(await guard.canActivate(mockCtx({ authorization: 'Bearer xyz' }))).toBe(true);
  });

  it('without any decorator, requires JWT (delegates to passport)', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    expect(await guard.canActivate(mockCtx())).toBe(true);
  });

  describe('handleRequest', () => {
    const optionalCtx = () =>
      ({ getHandler: () => ({}), getClass: () => ({}) }) as any;

    it('returns undefined under @OptionalAuth when no user / token error', () => {
      (reflector.getAllAndOverride as any).mockImplementation((k: string) =>
        k === OPTIONAL_AUTH_KEY ? true : undefined,
      );
      expect(guard.handleRequest(null, null, null, optionalCtx())).toBeUndefined();
      expect(
        guard.handleRequest(new Error('bad token'), null, null, optionalCtx()),
      ).toBeUndefined();
    });

    it('returns the user when present under @OptionalAuth', () => {
      (reflector.getAllAndOverride as any).mockImplementation((k: string) =>
        k === OPTIONAL_AUTH_KEY ? true : undefined,
      );
      const user = { id: 'u1' };
      expect(guard.handleRequest(null, user, null, optionalCtx())).toBe(user);
    });

    it('throws when no user and route is NOT optional', () => {
      (reflector.getAllAndOverride as any).mockReturnValue(undefined);
      expect(() => guard.handleRequest(null, null, null, optionalCtx())).toThrow();
    });
  });
});
