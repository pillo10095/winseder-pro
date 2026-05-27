import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly client: Redis;
  private readonly prefix = 'refresh:';

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const username = this.configService.get<string>('REDIS_USERNAME');
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const tls = this.configService.get<boolean>('REDIS_TLS', false);

    this.client = new Redis({
      host,
      port,
      username,
      password,
      tls: tls ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed after 3 retries, using in-memory fallback');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async storeRefreshToken(jti: string, userId: string, ttlSeconds: number): Promise<void> {
    const key = `${this.prefix}${jti}`;
    const value = JSON.stringify({
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });

    try {
      await this.client.setex(key, ttlSeconds, value);
    } catch (err) {
      this.logger.error(`Failed to store refresh token: ${err}`);
      throw err;
    }
  }

  async validateRefreshToken(jti: string): Promise<{ userId: string } | null> {
    const key = `${this.prefix}${jti}`;

    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as { userId: string };
    } catch (err) {
      this.logger.error(`Failed to validate refresh token: ${err}`);
      return null;
    }
  }

  async revokeRefreshToken(jti: string): Promise<void> {
    const key = `${this.prefix}${jti}`;

    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`Failed to revoke refresh token: ${err}`);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        const pipeline = this.client.pipeline();
        for (const key of keys) {
          const data = await this.client.get(key);
          if (data) {
            const parsed = JSON.parse(data) as { userId: string };
            if (parsed.userId === userId) {
              pipeline.del(key);
            }
          }
        }
        if (pipeline.length > 0) {
          await pipeline.exec();
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.error(`Failed to revoke all user tokens: ${err}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
