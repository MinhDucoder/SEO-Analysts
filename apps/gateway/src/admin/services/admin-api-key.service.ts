/**
 * @file Admin-scope queries over ApiKey rows. Distinct from the
 * user-scoped `ApiKeyService` — no userId filter, returns joined user
 * info for moderation.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface AdminApiKeyListFilter {
  userId?: string;
  environment?: 'live' | 'test';
  onlyActive?: boolean;
}

@Injectable()
export class AdminApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: AdminApiKeyListFilter) {
    return this.prisma.apiKey.findMany({
      where: {
        userId: filter.userId,
        environment: filter.environment,
        revokedAt: filter.onlyActive ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        lastUsedAt: true,
        lastUsedIp: true,
        createdAt: true,
        revokedAt: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async revoke(id: string): Promise<void> {
    const r = await this.prisma.apiKey.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (r.count === 0) {
      throw new Error('API key not found or already revoked');
    }
  }
}
