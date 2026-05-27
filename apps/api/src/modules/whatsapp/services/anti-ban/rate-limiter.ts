import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

@Injectable()
export class AntiBanRateLimiter {
  private readonly logger = new Logger(AntiBanRateLimiter.name);
  private readonly store = new Map<string, RateLimitEntry>();

  private readonly defaultConfig: RateLimitConfig = {
    maxPerMinute: 15,
    maxPerHour: 200,
    maxPerDay: 2000,
  };

  private readonly configs = new Map<string, RateLimitConfig>();

  setConfig(sessionId: string, config: Partial<RateLimitConfig>) {
    const existing = this.configs.get(sessionId) ?? { ...this.defaultConfig };
    this.configs.set(sessionId, { ...existing, ...config });
  }

  getConfig(sessionId: string): RateLimitConfig {
    return this.configs.get(sessionId) ?? { ...this.defaultConfig };
  }

  canProceed(sessionId: string): boolean {
    const now = Date.now();
    const config = this.getConfig(sessionId);
    let entry = this.store.get(sessionId);

    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(sessionId, entry);
    }

    // Prune timestamps older than 1 day
    const oneDayAgo = now - 86_400_000;
    entry.timestamps = entry.timestamps.filter((t) => t > oneDayAgo);
    entry.timestamps.push(now);

    const lastMinute = entry.timestamps.filter((t) => t > now - 60_000).length;
    const lastHour = entry.timestamps.filter((t) => t > now - 3_600_000).length;
    const lastDay = entry.timestamps.length;

    if (lastMinute > config.maxPerMinute) {
      this.logger.warn(`[${sessionId}] Rate limit hit: ${lastMinute}/min (max ${config.maxPerMinute})`);
      return false;
    }

    if (lastHour > config.maxPerHour) {
      this.logger.warn(`[${sessionId}] Rate limit hit: ${lastHour}/hour (max ${config.maxPerHour})`);
      return false;
    }

    if (lastDay > config.maxPerDay) {
      this.logger.warn(`[${sessionId}] Rate limit hit: ${lastDay}/day (max ${config.maxPerDay})`);
      return false;
    }

    return true;
  }

  getWaitTime(sessionId: string): number {
    const entry = this.store.get(sessionId);
    if (!entry) return 0;

    const now = Date.now();
    const config = this.getConfig(sessionId);

    // If minute limit hit, wait until oldest timestamp in that window expires
    const minuteTimestamps = entry.timestamps.filter((t) => t > now - 60_000);
    if (minuteTimestamps.length >= config.maxPerMinute) {
      const oldest = minuteTimestamps.sort((a, b) => a - b)[0];
      return Math.max(0, oldest + 60_000 - now);
    }

    return 0;
  }

  reset(sessionId: string) {
    this.store.delete(sessionId);
    this.configs.delete(sessionId);
  }
}
