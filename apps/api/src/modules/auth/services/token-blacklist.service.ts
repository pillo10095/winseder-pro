import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly client: Redis;
  private readonly prefix = 'blacklist:';

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
          this.logger.warn('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
    const key = `${this.prefix}${jti}`;

    try {
      await this.client.setex(key, expiresInSeconds, '1');
    } catch (err) {
      this.logger.error(`Failed to blacklist token: ${err}`);
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.prefix}${jti}`;

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (err) {
      this.logger.error(`Failed to check blacklist: ${err}`);
      return false;
    }
  }

  extractJtiFromToken(token: string): string {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return this.hashToken(token);
      }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      return payload.jti ?? this.hashToken(token);
    } catch {
      return this.hashToken(token);
    }
  }

  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `hash:${Math.abs(hash).toString(36)}`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
