import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import { ApiKeyService } from '../../src/public-api/services/api-key.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { EntitlementService } from '../../src/billing/services/entitlement.service';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
// Any valid-format key: sk_(live|test)_ + 43 base64url chars.
const VALID_KEY = 'sk_test_' + 'a'.repeat(43);

describe('ApiKeyService', () => {
  let svc: ApiKeyService;
  const prisma = {
    apiKey: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;
  const client = { get: vi.fn(), setex: vi.fn() };
  const redis = { client } as unknown as RedisService;
  const entitlement = { isAdmin: vi.fn(), getEffectivePlan: vi.fn() } as unknown as EntitlementService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new ApiKeyService(prisma, redis, entitlement);
  });

  describe('create', () => {
    it('issues a key with sk_<env>_ plaintext, a 16-char prefix, and stores only the sha256 hash', async () => {
      (entitlement.isAdmin as any).mockResolvedValue(false);
      (entitlement.getEffectivePlan as any).mockResolvedValue('pro'); // api_keys_max = 1
      (prisma.apiKey.count as any).mockResolvedValue(0);
      (prisma.apiKey.create as any).mockImplementation(({ data }: any) => ({ id: 'k1', ...data }));

      const { plaintext, record } = await svc.create('u1', 'My key', 'test');

      expect(plaintext).toMatch(/^sk_test_[A-Za-z0-9_-]{43}$/);
      const createArg = (prisma.apiKey.create as any).mock.calls[0][0].data;
      expect(createArg.prefix).toBe(plaintext.slice(0, 16));
      expect(createArg.hashedKey).toBe(sha256(plaintext));
      expect(createArg.hashedKey).not.toContain(plaintext.slice(8)); // never the raw secret
      expect(record.id).toBe('k1');
    });

    it('blocks creation once the plan API-key cap is reached', async () => {
      (entitlement.isAdmin as any).mockResolvedValue(false);
      (entitlement.getEffectivePlan as any).mockResolvedValue('pro'); // max 1
      (prisma.apiKey.count as any).mockResolvedValue(1);

      await expect(svc.create('u1', 'second', 'test')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.apiKey.create).not.toHaveBeenCalled();
    });

    it('lets an admin bypass the cap entirely (god-mode)', async () => {
      (entitlement.isAdmin as any).mockResolvedValue(true);
      (prisma.apiKey.create as any).mockImplementation(({ data }: any) => ({ id: 'k2', ...data }));

      await svc.create('admin-1', 'unlimited', 'live');

      expect(prisma.apiKey.count).not.toHaveBeenCalled();
      expect(entitlement.getEffectivePlan).not.toHaveBeenCalled();
      expect(prisma.apiKey.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('verify', () => {
    const VALID_INSTALL = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';

    it('rejects a missing Authorization header as invalid_format', async () => {
      expect(await svc.verify(undefined, VALID_INSTALL)).toEqual({ valid: false, reason: 'invalid_format' });
    });

    it('rejects a malformed key without hitting cache or DB', async () => {
      const res = await svc.verify('Bearer not-a-real-key', VALID_INSTALL);
      expect(res).toEqual({ valid: false, reason: 'invalid_format' });
      expect(client.get).not.toHaveBeenCalled();
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('returns the cached payload on a cache hit without touching the DB', async () => {
      const payload = { apiKeyId: 'k1', userId: 'u1', environment: 'test' };
      client.get.mockResolvedValue(JSON.stringify(payload));

      const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL);

      expect(res).toEqual({ valid: true, ...payload });
      expect(client.get).toHaveBeenCalledWith(`apikey:${sha256(VALID_KEY)}`);
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('treats a cached null (known-missing) as not_found', async () => {
      client.get.mockResolvedValue('null');
      expect(await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL)).toEqual({ valid: false, reason: 'not_found' });
    });

    it('on cache miss + DB miss: caches the negative result and returns not_found', async () => {
      client.get.mockResolvedValue(null);
      (prisma.apiKey.findUnique as any).mockResolvedValue(null);

      const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL);

      expect(res).toEqual({ valid: false, reason: 'not_found' });
      expect(client.setex).toHaveBeenCalledWith(`apikey:${sha256(VALID_KEY)}`, 60, 'null');
    });

    it('reports a revoked key as revoked', async () => {
      client.get.mockResolvedValue(null);
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'test', revokedAt: new Date(), user: { isLocked: false },
      });
      expect(await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL)).toEqual({ valid: false, reason: 'revoked' });
    });

    it('reports a locked user as user_disabled', async () => {
      client.get.mockResolvedValue(null);
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'test', revokedAt: null, user: { isLocked: true },
      });
      expect(await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL)).toEqual({ valid: false, reason: 'user_disabled' });
    });

    it('validates a live key, caches the payload, and returns it', async () => {
      client.get.mockResolvedValue(null);
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'test', revokedAt: null, user: { isLocked: false },
      });

      const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL);

      expect(res).toEqual({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
      expect(client.setex).toHaveBeenCalledWith(
        `apikey:${sha256(VALID_KEY)}`,
        60,
        JSON.stringify({ apiKeyId: 'k1', userId: 'u1', environment: 'test' }),
      );
    });

    it('falls through to the DB when the cache read throws', async () => {
      client.get.mockRejectedValue(new Error('redis down'));
      (prisma.apiKey.findUnique as any).mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'test', revokedAt: null, user: { isLocked: false },
      });
      const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL);
      expect(res).toEqual({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    });

    describe('install id input', () => {
      it('rejects a missing X-Install-Id header as missing_install_id', async () => {
        expect(await svc.verify(`Bearer ${VALID_KEY}`, undefined)).toEqual({
          valid: false,
          reason: 'missing_install_id',
        });
        expect(client.get).not.toHaveBeenCalled();
      });

      it('rejects a non-UUIDv4 install id as missing_install_id', async () => {
        expect(await svc.verify(`Bearer ${VALID_KEY}`, 'not-a-uuid')).toEqual({
          valid: false,
          reason: 'missing_install_id',
        });
        // Even a UUID v1 must be rejected — only v4 is allowed.
        expect(await svc.verify(`Bearer ${VALID_KEY}`, '550e8400-e29b-11d4-a716-446655440000')).toEqual({
          valid: false,
          reason: 'missing_install_id',
        });
      });

      it('rejects a malformed KEY before checking install id (install_id error must not leak for bad keys)', async () => {
        expect(await svc.verify('Bearer not-a-real-key', VALID_INSTALL)).toEqual({
          valid: false,
          reason: 'invalid_format',
        });
      });
    });
  });

  describe('revoke', () => {
    it('throws when nothing was revoked (wrong owner or already revoked)', async () => {
      (prisma.apiKey.updateMany as any).mockResolvedValue({ count: 0 });
      await expect(svc.revoke('k1', 'u1')).rejects.toThrow(/not found or already revoked/i);
    });

    it('resolves when exactly one row is revoked', async () => {
      (prisma.apiKey.updateMany as any).mockResolvedValue({ count: 1 });
      await expect(svc.revoke('k1', 'u1')).resolves.toBeUndefined();
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: { id: 'k1', userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('recordUsage', () => {
    it('persists once then throttles repeat writes within 60s', () => {
      (prisma.apiKey.update as any).mockResolvedValue(undefined);
      svc.recordUsage('k1', '1.2.3.4');
      svc.recordUsage('k1', '1.2.3.4');
      expect(prisma.apiKey.update).toHaveBeenCalledTimes(1);
    });
  });
});
