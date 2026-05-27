import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VerificationService } from '../../src/auth/services/verification.service';
import { RedisService } from '../../src/infra/redis/redis.service';

describe('VerificationService', () => {
  let svc: VerificationService;
  const client = { set: vi.fn(), get: vi.fn(), del: vi.fn() };
  const redis = { client } as unknown as RedisService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new VerificationService(redis);
  });

  describe('verification tokens (24h TTL)', () => {
    it('stores the token under verify:<token> with a 24h TTL and returns it', async () => {
      const token = await svc.createVerificationToken('user-1');

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(client.set).toHaveBeenCalledWith(`verify:${token}`, 'user-1', 'EX', 60 * 60 * 24);
    });

    it('generates a unique token per call', async () => {
      const a = await svc.createVerificationToken('user-1');
      const b = await svc.createVerificationToken('user-1');
      expect(a).not.toBe(b);
    });

    it('consumes a valid token: returns the userId and deletes the key', async () => {
      client.get.mockResolvedValue('user-1');
      const userId = await svc.consumeVerificationToken('tok');
      expect(userId).toBe('user-1');
      expect(client.del).toHaveBeenCalledWith('verify:tok');
    });

    it('returns null for an unknown/expired token and does not delete', async () => {
      client.get.mockResolvedValue(null);
      const userId = await svc.consumeVerificationToken('missing');
      expect(userId).toBeNull();
      expect(client.del).not.toHaveBeenCalled();
    });
  });

  describe('reset tokens (1h TTL)', () => {
    it('stores the token under reset:<token> with a 1h TTL', async () => {
      const token = await svc.createResetToken('user-2');
      expect(client.set).toHaveBeenCalledWith(`reset:${token}`, 'user-2', 'EX', 60 * 60);
    });

    it('consumes a valid reset token once', async () => {
      client.get.mockResolvedValue('user-2');
      const userId = await svc.consumeResetToken('rtok');
      expect(userId).toBe('user-2');
      expect(client.del).toHaveBeenCalledWith('reset:rtok');
    });

    it('returns null for an invalid reset token', async () => {
      client.get.mockResolvedValue(null);
      expect(await svc.consumeResetToken('nope')).toBeNull();
      expect(client.del).not.toHaveBeenCalled();
    });
  });
});
