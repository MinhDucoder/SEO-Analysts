import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly verifyTtl = 60 * 60 * 24; // 24h
  private readonly resetTtl = 60 * 60; // 1h

  constructor(private readonly redis: RedisService) {}

  private genToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async createVerificationToken(userId: string): Promise<string> {
    const token = this.genToken();
    await this.redis.client.set(`verify:${token}`, userId, 'EX', this.verifyTtl);
    this.logger.log(`Verification token created for user ${userId}`);
    return token;
  }

  async consumeVerificationToken(token: string): Promise<string | null> {
    const userId = await this.redis.client.get(`verify:${token}`);
    if (!userId) return null;
    await this.redis.client.del(`verify:${token}`);
    return userId;
  }

  async createResetToken(userId: string): Promise<string> {
    const token = this.genToken();
    await this.redis.client.set(`reset:${token}`, userId, 'EX', this.resetTtl);
    return token;
  }

  async consumeResetToken(token: string): Promise<string | null> {
    const userId = await this.redis.client.get(`reset:${token}`);
    if (!userId) return null;
    await this.redis.client.del(`reset:${token}`);
    return userId;
  }
}
