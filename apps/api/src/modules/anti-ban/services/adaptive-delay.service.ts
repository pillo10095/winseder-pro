import { Injectable, Logger } from '@nestjs/common';

export interface AdaptiveDelayConfig {
  initialDelay: number;
  minDelay: number;
  maxDelay: number;
  failureMultiplier: number;
  successMultiplier: number;
  maxConsecutiveFailures: number;
}

interface SessionDelayState {
  currentDelay: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalFailures: number;
  totalSuccesses: number;
  lastAdjustment: number;
  lastFailureAt: number | null;
  alertTriggered: boolean;
}

const DEFAULT_CONFIG: AdaptiveDelayConfig = {
  initialDelay: 2000,
  minDelay: 500,
  maxDelay: 15_000,
  failureMultiplier: 1.5,
  successMultiplier: 0.95,
  maxConsecutiveFailures: 10,
};

@Injectable()
export class AdaptiveDelayService {
  private readonly logger = new Logger(AdaptiveDelayService.name);

  private readonly states = new Map<string, SessionDelayState>();
  private readonly configs = new Map<string, Partial<AdaptiveDelayConfig>>();

  private getEffectiveConfig(sessionId: string): AdaptiveDelayConfig {
    const overrides = this.configs.get(sessionId);
    if (!overrides) return DEFAULT_CONFIG;
    return {
      initialDelay: overrides.initialDelay ?? DEFAULT_CONFIG.initialDelay,
      minDelay: overrides.minDelay ?? DEFAULT_CONFIG.minDelay,
      maxDelay: overrides.maxDelay ?? DEFAULT_CONFIG.maxDelay,
      failureMultiplier: overrides.failureMultiplier ?? DEFAULT_CONFIG.failureMultiplier,
      successMultiplier: overrides.successMultiplier ?? DEFAULT_CONFIG.successMultiplier,
      maxConsecutiveFailures: overrides.maxConsecutiveFailures ?? DEFAULT_CONFIG.maxConsecutiveFailures,
    };
  }

  private getState(sessionId: string): SessionDelayState {
    let state = this.states.get(sessionId);
    if (!state) {
      state = {
        currentDelay: DEFAULT_CONFIG.initialDelay,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        lastAdjustment: Date.now(),
        lastFailureAt: null,
        alertTriggered: false,
      };
      this.states.set(sessionId, state);
    }
    return state;
  }

  setConfig(sessionId: string, config: Partial<AdaptiveDelayConfig>) {
    this.configs.set(sessionId, config);
  }

  getConfig(sessionId: string): AdaptiveDelayConfig {
    return this.getEffectiveConfig(sessionId);
  }

  /**
   * Returns the current delay in ms for this session.
   */
  getDelay(sessionId: string): number {
    return this.getState(sessionId).currentDelay;
  }

  /**
   * Record a success: reduces delay using success multiplier.
   */
  recordSuccess(sessionId: string) {
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);

    state.consecutiveFailures = 0;
    state.consecutiveSuccesses++;
    state.totalSuccesses++;
    state.lastAdjustment = Date.now();

    const newDelay = Math.max(
      config.minDelay,
      Math.floor(state.currentDelay * config.successMultiplier),
    );

    if (newDelay !== state.currentDelay) {
      this.logger.debug(
        `[${sessionId}] Success → delay ${state.currentDelay}ms → ${newDelay}ms`,
      );
      state.currentDelay = newDelay;
    }

    // Reset alert flag on sustained success
    if (state.consecutiveSuccesses >= 5) {
      state.alertTriggered = false;
    }
  }

  /**
   * Record a failure: increases delay using failure multiplier.
   * Returns true if max consecutive failures threshold was crossed (alert).
   */
  recordFailure(sessionId: string): boolean {
    const config = this.getEffectiveConfig(sessionId);
    const state = this.getState(sessionId);

    state.consecutiveFailures++;
    state.consecutiveSuccesses = 0;
    state.totalFailures++;
    state.lastFailureAt = Date.now();
    state.lastAdjustment = Date.now();

    const newDelay = Math.min(
      config.maxDelay,
      Math.floor(state.currentDelay * config.failureMultiplier),
    );

    this.logger.warn(
      `[${sessionId}] Failure #${state.consecutiveFailures} → delay ${state.currentDelay}ms → ${newDelay}ms`,
    );
    state.currentDelay = newDelay;

    // Check alert threshold
    if (state.consecutiveFailures >= config.maxConsecutiveFailures && !state.alertTriggered) {
      state.alertTriggered = true;
      this.logger.error(
        `[${sessionId}] ALERT: ${state.consecutiveFailures} consecutive failures, delay at ${state.currentDelay}ms`,
      );
      return true;
    }

    return false;
  }

  /**
   * Get stats for the health dashboard.
   */
  getStats(sessionId: string) {
    const state = this.getState(sessionId);
    const config = this.getEffectiveConfig(sessionId);

    return {
      currentDelay: state.currentDelay,
      minDelay: config.minDelay,
      maxDelay: config.maxDelay,
      consecutiveFailures: state.consecutiveFailures,
      consecutiveSuccesses: state.consecutiveSuccesses,
      totalFailures: state.totalFailures,
      totalSuccesses: state.totalSuccesses,
      lastAdjustment: state.lastAdjustment,
      lastFailureAt: state.lastFailureAt,
      alertTriggered: state.alertTriggered,
    };
  }

  reset(sessionId: string) {
    this.states.delete(sessionId);
    this.configs.delete(sessionId);
  }
}
