import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from '../../src/public-api/guards/api-key.guard';
import { ApiKeyService } from '../../src/public-api/services/api-key.service';

function ctx(headers: Record<string, string | undefined>, ip = '1.2.3.4'): ExecutionContext {
  const req: any = { headers, ip };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const svc = {
    verify: vi.fn(),
    recordUsage: vi.fn(),
  } as unknown as ApiKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws MISSING_API_KEY when Authorization header is absent', async () => {
    const guard = new ApiKeyGuard(svc, 'enforce');
    await expect(guard.canActivate(ctx({}))).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MISSING_API_KEY' }),
    });
  });

  it('mode=enforce: passes when verify returns valid and stamps req.apiKey', async () => {
    (svc.verify as any).mockResolvedValue({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'enforce');
    const c = ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' });
    await expect(guard.canActivate(c)).resolves.toBe(true);
  });

  it('mode=enforce: throws KEY_INSTALL_MISMATCH on install_mismatch', async () => {
    (svc.verify as any).mockResolvedValue({ valid: false, reason: 'install_mismatch' });
    const guard = new ApiKeyGuard(svc, 'enforce');
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' })),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'KEY_INSTALL_MISMATCH' }) });
  });

  it('mode=enforce: throws MISSING_INSTALL_ID when verify returns missing_install_id', async () => {
    (svc.verify as any).mockResolvedValue({ valid: false, reason: 'missing_install_id' });
    const guard = new ApiKeyGuard(svc, 'enforce');
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa' })),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'MISSING_INSTALL_ID' }) });
  });

  it('mode=log: missing_install_id is logged and request passes via skipInstallCheck retry', async () => {
    (svc.verify as any)
      // first call without install header → missing_install_id
      .mockResolvedValueOnce({ valid: false, reason: 'missing_install_id' })
      // retry with skipInstallCheck → valid
      .mockResolvedValueOnce({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'log');
    const result = await guard.canActivate(
      ctx({ authorization: 'Bearer sk_test_aaa' /* no install header */ }),
    );
    expect(result).toBe(true);
    expect(svc.verify).toHaveBeenCalledTimes(2);
    expect((svc.verify as any).mock.calls[0]).toEqual(['Bearer sk_test_aaa', undefined]);
    expect((svc.verify as any).mock.calls[1]).toEqual(['Bearer sk_test_aaa', undefined, { skipInstallCheck: true }]);
  });

  it('mode=log: install_mismatch is logged and request passes via skipInstallCheck retry', async () => {
    (svc.verify as any)
      .mockResolvedValueOnce({ valid: false, reason: 'install_mismatch' })
      .mockResolvedValueOnce({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'log');
    const result = await guard.canActivate(
      ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' }),
    );
    expect(result).toBe(true);
    expect(svc.verify).toHaveBeenCalledTimes(2);
  });

  it('mode=off: install header is not read; verify is called with undefined installId', async () => {
    (svc.verify as any).mockResolvedValue({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'off');
    await guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': 'whatever' }));
    expect(svc.verify).toHaveBeenCalledWith('Bearer sk_test_aaa', undefined, { skipInstallCheck: true });
  });
});
