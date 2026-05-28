import { Injectable, Logger } from '@nestjs/common';

export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'other';

interface TypeLimits {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

export interface RateLimitV2Config {
  perType: Record<MessageType, TypeLimits>;
  tighteningFactor: number;
  tighteningRecoveryMs: number;
}

interface TypeEntry {
  timestamps: number[];
}

interface SessionState {
  entries: Record<MessageType, TypeEntry>;
  violations: number[];
  lastViolationAt: number | null;
  tighteningLevel: number; // 0 = no tightening, 1 = 1st violation, etc
}

const DEFAULT_CONFIG: RateLimitV2Config = {
  perType: {
    text: { maxPerMinute: 15, maxPerHour: 200, maxPerDay: 2000 },
    image: { maxPerMinute: 5, maxPerHour: 60, maxPerDay: 500 },
    video: { maxPerMinute: 2, maxPerHour: 20, maxPerDay: 100 },
    document: { maxPerMinute: 3, maxPerHour: 30, maxPerDay: 200 },
    audio: { maxPerMinute: 4, maxPerHour: 40, maxPerDay: 300 },
    sticker: { maxPerMinute: 8, maxPerHour: 80, maxPerDay: 600 },
    other: { maxPerMinute: 10, maxPerHour: 100, maxPerDay: 1000 },
  },
  tighteningFactor: 0.8,
  tighteningRecoveryMs: 3_600_000,
};

@Injectable()
export class RateLimiterV2Service {
  private readonly logger = new Logger(RateLimiterV2Service.name);

  private readonly store = new Map<string, SessionState>();
  private readonly configs = new Map<string, Partial<RateLimitV2Config>>();

  private getEffectiveConfig(sessionId: string): RateLimitV2Config {
    const overrides = this.configs.get(sessionId);
    if (!overrides) return DEFAULT_CONFIG;

    const merged: RateLimitV2Config = {
      perType: { ...DEFAULT_CONFIG.perType },
      tighteningFactor: overrides.tighteningFactor ?? DEFAULT_CONFIG.tighteningFactor,
      tighteningRecoveryMs: overrides.tighteningRecoveryMs ?? DEFAULT_CONFIG.tighteningRecoveryMs,
    };

    if (overrides.perType) {
      for (const key of Object.keys(overrides.perType) as MessageType[]) {
        merged.perType[key] = { ...merged.perType[key], ...overrides.perType[key] };
      }
    }

    return merged;
  }

  private getState(sessionId: string): SessionState {
    let state = this.store.get(sessionId);
    if (!state) {
      const emptyEntry = (): TypeEntry => ({ timestamps: [] });
      state = {
        entries: {
          text: emptyEntry(),
          image: emptyEntry(),
          video: emptyEntry(),
          document: emptyEntry(),
          audio: emptyEntry(),
          sticker: emptyEntry(),
          other: emptyEntry(),
        },
        violations: [],
        lastViolationAt: null,
        tighteningLevel: 0,
      };
      this.store.set(sessionId, state);
    }
    return state;
  }

  setConfig(sessionId: string, config: Partial<RateLimitV2Config>) {
    this.configs.set(sessionId, config);
  }

  getConfig(sessionId: string): RateLimitV2Config {
    return this.getEffectiveConfig(sessionId);
  }

  canProceed(sessionId: string, messageType: MessageType = 'text'): boolean {
    const now = Date.now();
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);

    // Check if tightening has recovered
    this.maybeRecoverTightening(state, config);

    const effectiveFactor = Math.pow(config.tighteningFactor, state.tighteningLevel);
    const limits = config.perType[messageType];

    const effectiveLimits: TypeLimits = {
      maxPerMinute: Math.max(1, Math.floor(limits.maxPerMinute * effectiveFactor)),
      maxPerHour: Math.max(1, Math.floor(limits.maxPerHour * effectiveFactor)),
      maxPerDay: Math.max(1, Math.floor(limits.maxPerDay * effectiveFactor)),
    };

    const entry = state.entries[messageType];
    this.pruneEntries(entry, now);

    // Also check total across all types
    const totalEntries = Object.values(state.entries).flatMap((e) => e.timestamps);
    const totalLastMinute = totalEntries.filter((t) => t > now - 60_000).length;
    const totalLastHour = totalEntries.filter((t) => t > now - 3_600_000).length;
    const totalLastDay = totalEntries.length;

    // Total limits (sum of all type limits, capped)
    const totalMinLimit = Math.min(
      Object.values(config.perType).reduce((s, l) => s + l.maxPerMinute, 0),
      50,
    );
    const totalHourLimit = Math.min(
      Object.values(config.perType).reduce((s, l) => s + l.maxPerHour, 0),
      500,
    );
    const totalDayLimit = Math.min(
      Object.values(config.perType).reduce((s, l) => s + l.maxPerDay, 0),
      5000,
    );

    if (totalLastMinute > totalMinLimit) {
      this.logger.warn(
        `[${sessionId}] Total rate limit hit: ${totalLastMinute}/min (max ${totalMinLimit})`,
      );
      return false;
    }
    if (totalLastHour > totalHourLimit) {
      this.logger.warn(
        `[${sessionId}] Total rate limit hit: ${totalLastHour}/hour (max ${totalHourLimit})`,
      );
      return false;
    }
    if (totalLastDay > totalDayLimit) {
      this.logger.warn(
        `[${sessionId}] Total rate limit hit: ${totalLastDay}/day (max ${totalDayLimit})`,
      );
      return false;
    }

    // Per-type limits
    const lastMinute = entry.timestamps.filter((t) => t > now - 60_000).length;
    const lastHour = entry.timestamps.filter((t) => t > now - 3_600_000).length;
    const lastDay = entry.timestamps.length;

    if (lastMinute > effectiveLimits.maxPerMinute) {
      this.logger.warn(
        `[${sessionId}] ${messageType} rate limit hit: ${lastMinute}/min (eff ${effectiveLimits.maxPerMinute})`,
      );
      return false;
    }
    if (lastHour > effectiveLimits.maxPerHour) {
      this.logger.warn(
        `[${sessionId}] ${messageType} rate limit hit: ${lastHour}/hour (eff ${effectiveLimits.maxPerHour})`,
      );
      return false;
    }
    if (lastDay > effectiveLimits.maxPerDay) {
      this.logger.warn(
        `[${sessionId}] ${messageType} rate limit hit: ${lastDay}/day (eff ${effectiveLimits.maxPerDay})`,
      );
      return false;
    }

    return true;
  }

  recordAction(sessionId: string, messageType: MessageType = 'text') {
    const state = this.getState(sessionId);
    state.entries[messageType].timestamps.push(Date.now());
  }

  recordViolation(sessionId: string) {
    const state = this.getState(sessionId);
    const now = Date.now();

    // Prune old violations (keep last 24h)
    state.violations = state.violations.filter((t) => t > now - 86_400_000);
    state.violations.push(now);
    state.lastViolationAt = now;

    // Increase tightening level
    state.tighteningLevel = Math.min(state.tighteningLevel + 1, 10);
    this.logger.warn(
      `[${sessionId}] Violation recorded, tightening level → ${state.tighteningLevel}`,
    );
  }

  getWaitTime(sessionId: string, messageType: MessageType = 'text'): number {
    const now = Date.now();
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);

    const entry = state.entries[messageType];
    this.pruneEntries(entry, now);

    const effectiveFactor = Math.pow(config.tighteningFactor, state.tighteningLevel);
    const limits = config.perType[messageType];
    const effectiveMaxPerMinute = Math.max(1, Math.floor(limits.maxPerMinute * effectiveFactor));

    const minuteTimestamps = entry.timestamps.filter((t) => t > now - 60_000);
    if (minuteTimestamps.length >= effectiveMaxPerMinute) {
      const oldest = minuteTimestamps.sort((a, b) => a - b)[0];
      return Math.max(0, oldest + 60_000 - now);
    }

    // Check hourly
    const hourTimestamps = entry.timestamps.filter((t) => t > now - 3_600_000);
    const effectiveMaxPerHour = Math.max(1, Math.floor(limits.maxPerHour * effectiveFactor));
    if (hourTimestamps.length >= effectiveMaxPerHour) {
      const oldest = hourTimestamps.sort((a, b) => a - b)[0];
      return Math.max(0, oldest + 3_600_000 - now);
    }

    return 0;
  }

  getStats(sessionId: string) {
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);
    const now = Date.now();

    const typeStats: Record<string, { lastMinute: number; lastHour: number; lastDay: number }> =
      {} as Record<string, { lastMinute: number; lastHour: number; lastDay: number }>;

    for (const [type, entry] of Object.entries(state.entries)) {
      this.pruneEntries(entry, now);
      typeStats[type] = {
        lastMinute: entry.timestamps.filter((t) => t > now - 60_000).length,
        lastHour: entry.timestamps.filter((t) => t > now - 3_600_000).length,
        lastDay: entry.timestamps.length,
      };
    }

    return {
      tighteningLevel: state.tighteningLevel,
      violations: state.violations.length,
      lastViolationAt: state.lastViolationAt,
      config,
      typeStats,
    };
  }

  reset(sessionId: string) {
    this.store.delete(sessionId);
    this.configs.delete(sessionId);
  }

  private pruneEntries(entry: TypeEntry, now: number) {
    const oneDayAgo = now - 86_400_000;
    entry.timestamps = entry.timestamps.filter((t) => t > oneDayAgo);
  }

  private maybeRecoverTightening(state: SessionState, config: RateLimitV2Config) {
    if (state.tighteningLevel <= 0) return;
    if (!state.lastViolationAt) return;

    if (Date.now() - state.lastViolationAt >= config.tighteningRecoveryMs) {
      state.tighteningLevel = Math.max(0, state.tighteningLevel - 1);
      state.lastViolationAt = null;
    }
  }
}
