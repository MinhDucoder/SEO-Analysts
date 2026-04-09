import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client!: Redis;
  private _subscriber!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this._client = new Redis(url, { maxRetriesPerRequest: null });
    this._subscriber = new Redis(url, { maxRetriesPerRequest: null });
    this._client.on('error', (e) => this.logger.error(`Redis client error: ${e.message}`));
    this._subscriber.on('error', (e) => this.logger.error(`Redis subscriber error: ${e.message}`));
  }

  async onModuleDestroy() {
    await this._client?.quit();
    await this._subscriber?.quit();
  }

  get client(): Redis {
    return this._client;
  }

  get subscriber(): Redis {
    return this._subscriber;
  }

  async publish(channel: string, payload: unknown): Promise<number> {
    return this._client.publish(channel, JSON.stringify(payload));
  }

  async subscribe(channel: string, handler: (data: unknown) => void): Promise<void> {
    await this._subscriber.subscribe(channel);
    this._subscriber.on('message', (ch, msg) => {
      if (ch !== channel) return;
      try {
        handler(JSON.parse(msg));
      } catch (e) {
        this.logger.error(`Failed to parse Redis message on ${channel}: ${(e as Error).message}`);
      }
    });
  }
}
