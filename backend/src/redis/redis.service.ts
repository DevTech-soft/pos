import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private connected = false;

  async onModuleInit() {
    const retryStrategy = (times: number) => {
      if (times >= 3) {
        this.logger.warn('Redis no disponible — operando sin caché');
        return null;
      }
      return Math.min(times * 200, 1000);
    };

    const redisUrl = process.env.REDIS_URL;
    this.client = redisUrl
      ? new Redis(redisUrl, {
          tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          retryStrategy,
          lazyConnect: true,
          enableOfflineQueue: false,
        })
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          retryStrategy,
          lazyConnect: true,
          enableOfflineQueue: false,
        });

    this.client.on('connect', () => { this.connected = true; });
    this.client.on('close', () => { this.connected = false; });
    this.client.on('error', (err) => {
      if (this.connected) {
        this.logger.error('Error Redis:', err.message);
        this.connected = false;
      }
    });

    try { await this.client.connect(); } catch {
      this.logger.warn('Redis no disponible — el servidor continúa sin caché');
    }
  }

  async onModuleDestroy() {
    if (this.connected) await this.client.quit();
    else this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.connected) return;
    if (ttl) await this.client.setex(key, ttl, value);
    else await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }
}
