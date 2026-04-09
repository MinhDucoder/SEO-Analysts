import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private commandClient!: Redis;
  private subscriberClient!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.commandClient = new Redis(url, { maxRetriesPerRequest: null });
    this.subscriberClient = new Redis(url, { maxRetriesPerRequest: null });
    this.logger.log(`Redis connected: ${url}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.commandClient?.quit();
    await this.subscriberClient?.quit();
  }

  client(): Redis {
    return this.commandClient;
  }

  subscriber(): Redis {
    return this.subscriberClient;
  }
}
