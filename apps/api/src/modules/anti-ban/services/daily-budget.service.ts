import { Injectable, Logger } from '@nestjs/common';

export interface DailyBudgetConfig {
  dailyLimit: number;
  weights: Record<string, number>;
  resetHour: number;
  resetTimezone: string;
}

interface SessionBudgetState {
  consumed: number;
  lastReset: number; // timestamp
  details: Record<string, number>; // messageType → count
}

const DEFAULT_CONFIG: DailyBudgetConfig = {
  dailyLimit: 1000,
  weights: {
    text: 1,
    image: 2,
    video: 3,
    document: 2,
    audio: 2,
    sticker: 1,
    other: 1,
  },
  resetHour: 0,
  resetTimezone: 'America/Mexico_City',
};

@Injectable()
export class DailyBudgetService {
  private readonly logger = new Logger(DailyBudgetService.name);

  private readonly states = new Map<string, SessionBudgetState>();
  private readonly configs = new Map<string, Partial<DailyBudgetConfig>>();

  private getEffectiveConfig(sessionId: string): DailyBudgetConfig {
    const overrides = this.configs.get(sessionId);
    if (!overrides) return DEFAULT_CONFIG;
    return {
      dailyLimit: overrides.dailyLimit ?? DEFAULT_CONFIG.dailyLimit,
      weights: overrides.weights ?? { ...DEFAULT_CONFIG.weights },
      resetHour: overrides.resetHour ?? DEFAULT_CONFIG.resetHour,
      resetTimezone: overrides.resetTimezone ?? DEFAULT_CONFIG.resetTimezone,
    };
  }

  setConfig(sessionId: string, config: Partial<DailyBudgetConfig>) {
    this.configs.set(sessionId, config);
  }

  getConfig(sessionId: string): DailyBudgetConfig {
    return this.getEffectiveConfig(sessionId);
  }

  private getState(sessionId: string): SessionBudgetState {
    let state = this.states.get(sessionId);
    if (!state) {
      state = { consumed: 0, lastReset: Date.now(), details: {} };
      this.states.set(sessionId, state);
    }
    this.maybeReset(sessionId, state);
    return state;
  }

  private maybeReset(sessionId: string, state: SessionBudgetState) {
    const config = this.getEffectiveConfig(sessionId);
    const now = new Date();
    const lastReset = new Date(state.lastReset);

    // Check if reset should happen (different day after reset hour)
    const currentHour = now.getUTCHours() + this.getTimezoneOffset(config.resetTimezone);
    const adjustedHour = ((currentHour % 24) + 24) % 24;

    if (adjustedHour >= config.resetHour) {
      // Today's budget window is active
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      if (lastReset < todayStart) {
        this.logger.log(`[${sessionId}] Daily budget reset (new day)`);
        state.consumed = 0;
        state.details = {};
        state.lastReset = Date.now();
      }
    }
  }

  private getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const tzDate = new Date(
        now.toLocaleString('en-US', { timeZone: timezone }),
      );
      return tzDate.getUTCHours() - now.getUTCHours();
    } catch {
      return 0;
    }
  }

  /**
   * Consume from daily budget. Returns true if within budget.
   */
  consume(sessionId: string, messageType: string): boolean {
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);

    const weight = config.weights[messageType] ?? config.weights.other ?? 1;

    if (state.consumed + weight > config.dailyLimit) {
      this.logger.warn(
        `[${sessionId}] Daily budget exceeded: ${state.consumed}/${config.dailyLimit} (+${weight})`,
      );
      return false;
    }

    state.consumed += weight;
    state.details[messageType] = (state.details[messageType] ?? 0) + 1;
    return true;
  }

  /**
   * Get full budget status.
   */
  getBudget(sessionId: string) {
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);

    return {
      limit: config.dailyLimit,
      consumed: state.consumed,
      remaining: Math.max(0, config.dailyLimit - state.consumed),
      usagePercent: Math.round((state.consumed / config.dailyLimit) * 100),
      details: state.details,
      resetAt: this.getNextReset(sessionId),
    };
  }

  /**
   * Get the next reset time.
   */
  getNextReset(sessionId: string): Date {
    const config = this.getEffectiveConfig(sessionId);
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(config.resetHour, 0, 0, 0);

    const tzOffset = this.getTimezoneOffset(config.resetTimezone);
    next.setUTCHours(next.getUTCHours() - tzOffset);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  reset(sessionId: string) {
    this.states.delete(sessionId);
    this.configs.delete(sessionId);
  }
}
