/**
 * @file Lifecycle of a user-owned API key. Plaintext is generated with
 * 32 bytes of random entropy + env prefix (sk_live_ / sk_test_), stored
 * only as sha256(plaintext). Verify-path is cached in Redis with a
 * short TTL (60s) so revoke propagates quickly. Cache-null for missing
 * keys blocks timing-based brute force on nonexistent tokens.
 */
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { ApiKeyEnvironment, PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL, PLAN_FEATURES } from '@repo/shared';
import { EntitlementService } from '../../billing/services/entitlement.service';

export type ApiKeyVerifyResult =
  | { valid: true; apiKeyId: string; userId: string; environment: ApiKeyEnvironment }
  | {
      valid: false;
      reason:
        | 'invalid_format'
        | 'not_found'
        | 'revoked'
        | 'user_disabled'
        | 'missing_install_id'
        | 'install_mismatch';
    };

const API_KEY_REGEX = /^sk_(live|test)_[A-Za-z0-9_-]{43}$/;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly lastUsedUpdates = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly entitlement: EntitlementService,
  ) {}

  async create(userId: string, name: string, environment: ApiKeyEnvironment) {
    // Admin god-mode: no cap on number of API keys.
    if (!(await this.entitlement.isAdmin(userId))) {
      const current = await this.prisma.apiKey.count({ where: { userId, revokedAt: null } });
      const plan = await this.entitlement.getEffectivePlan(userId);
      const max = PLAN_FEATURES[plan].api_keys_max;
      if (current >= max) {
        throw new ForbiddenException({ code: 'API_KEY_LIMIT_EXCEEDED', message: `Plan "${plan}" cho phép tối đa ${max} API keys` });
      }
    }

    const randomPart = randomBytes(32).toString('base64url');
    const plaintext = `sk_${environment}_${randomPart}`;
    const hashedKey = this.hash(plaintext);
    const prefix = plaintext.slice(0, 16);

    const record = await this.prisma.apiKey.create({
      data: { userId, name, prefix, hashedKey, environment },
    });

    this.logger.log(`ApiKey created id=${record.id} user=${userId} env=${environment}`);
    return { plaintext, record };
  }

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  }

  async rebind(id: string, userId: string): Promise<void> {
    const row = await this.prisma.apiKey.findUnique({
      where: { id },
      select: { id: true, userId: true, hashedKey: true, revokedAt: true },
    });
    if (!row || row.userId !== userId || row.revokedAt != null) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'API key not found or already revoked',
      });
    }
    await this.prisma.apiKey.update({
      where: { id },
      data: { installId: null, installBoundAt: null },
    });
    try {
      await this.redis.client.del(PUBLIC_API_REDIS_KEYS.apiKeyVerify(row.hashedKey));
    } catch (e) {
      this.logger.warn({ err: e }, 'apikey cache invalidation after rebind failed');
    }
  }

  async revoke(id: string, userId: string): Promise<void> {
    const r = await this.prisma.apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (r.count === 0) {
      throw new Error('API key not found or already revoked');
    }
  }

  async verify(
    authorizationHeader: string | undefined,
    installId: string | undefined,
    opts?: { skipInstallCheck?: boolean },
  ): Promise<ApiKeyVerifyResult> {
    if (!authorizationHeader) return { valid: false, reason: 'invalid_format' };
    const bearer = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
    if (!API_KEY_REGEX.test(bearer)) return { valid: false, reason: 'invalid_format' };

    const skipInstall = opts?.skipInstallCheck === true;
    if (!skipInstall) {
      if (!installId || !UUID_V4_REGEX.test(installId)) {
        return { valid: false, reason: 'missing_install_id' };
      }
    }

    const hash = this.hash(bearer);
    const cacheKey = PUBLIC_API_REDIS_KEYS.apiKeyVerify(hash);

    // Cache path
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as
          | null
          | { apiKeyId: string; userId: string; environment: ApiKeyEnvironment; installId: string | null };
        if (parsed === null) return { valid: false, reason: 'not_found' };
        if (skipInstall) {
          return {
            valid: true,
            apiKeyId: parsed.apiKeyId,
            userId: parsed.userId,
            environment: parsed.environment,
          };
        }
        // Cannot bind from cache — cache might be stale relative to a concurrent rebind.
        // Fall through to DB whenever the cached installId is null.
        if (parsed.installId !== null) {
          if (parsed.installId === installId) {
            return {
              valid: true,
              apiKeyId: parsed.apiKeyId,
              userId: parsed.userId,
              environment: parsed.environment,
            };
          }
          return { valid: false, reason: 'install_mismatch' };
        }
      }
    } catch (e) {
      this.logger.warn({ err: e }, 'apikey cache read failed, falling through to DB');
    }

    // DB path
    const row = await this.prisma.apiKey.findUnique({
      where: { hashedKey: hash },
      include: { user: { select: { isLocked: true } } },
    });

    if (!row) {
      await this.trySet(cacheKey, null);
      return { valid: false, reason: 'not_found' };
    }
    if (row.revokedAt) return { valid: false, reason: 'revoked' };
    if (row.user.isLocked) return { valid: false, reason: 'user_disabled' };

    if (skipInstall) {
      return {
        valid: true,
        apiKeyId: row.id,
        userId: row.userId,
        environment: row.environment as ApiKeyEnvironment,
      };
    }

    // Bind / match
    if (row.installId === null) {
      await this.prisma.apiKey.update({
        where: { id: row.id },
        data: { installId, installBoundAt: new Date() },
      });
      const payload = {
        apiKeyId: row.id,
        userId: row.userId,
        environment: row.environment as ApiKeyEnvironment,
        installId,
      };
      await this.trySet(cacheKey, payload);
      return {
        valid: true,
        apiKeyId: row.id,
        userId: row.userId,
        environment: row.environment as ApiKeyEnvironment,
      };
    }

    if (row.installId !== installId) {
      // Cache the *stored* binding so the next mismatch returns from cache without a DB hit.
      await this.trySet(cacheKey, {
        apiKeyId: row.id,
        userId: row.userId,
        environment: row.environment as ApiKeyEnvironment,
        installId: row.installId,
      });
      return { valid: false, reason: 'install_mismatch' };
    }

    // Match — cache + return
    const payload = {
      apiKeyId: row.id,
      userId: row.userId,
      environment: row.environment as ApiKeyEnvironment,
      installId: row.installId,
    };
    await this.trySet(cacheKey, payload);
    return {
      valid: true,
      apiKeyId: row.id,
      userId: row.userId,
      environment: row.environment as ApiKeyEnvironment,
    };
  }

  recordUsage(apiKeyId: string, ip: string | undefined): void {
    // Throttle: only persist if last update > 60s ago. Fire-and-forget —
    // never block the request on this write.
    const now = Date.now();
    const last = this.lastUsedUpdates.get(apiKeyId) ?? 0;
    if (now - last < 60_000) return;
    this.lastUsedUpdates.set(apiKeyId, now);
    this.prisma.apiKey
      .update({
        where: { id: apiKeyId },
        data: { lastUsedAt: new Date(), lastUsedIp: ip ?? null },
      })
      .catch((e) => this.logger.warn({ err: e }, 'recordUsage update failed'));
  }

  private hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  private async trySet(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.client.setex(
        key,
        PUBLIC_API_CACHE_TTL.API_KEY_VERIFY_SECONDS,
        JSON.stringify(value),
      );
    } catch (e) {
      this.logger.warn({ err: e, key }, 'apikey cache write failed');
    }
  }
}
