import { Injectable, Logger } from '@nestjs/common';

export type SessionHealth = 'healthy' | 'degraded' | 'unhealthy';
export type CircuitState = 'closed' | 'half-open' | 'open';

export interface HealthConfig {
  failureThreshold: number;
  circuitTimeout: number;
  degradedThreshold: number;
}

interface SessionHealthState {
  sessionId: string;
  status: SessionHealth;
  circuitState: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalSent: number;
  totalFailed: number;
  lastSeen: number;
  lastError: string | null;
  lastErrorAt: number | null;
  isConnected: boolean;
  registeredAt: number;
}

interface MessageMetrics {
  sent: number;
  failed: number;
  latencies: number[];
}

const DEFAULT_CONFIG: HealthConfig = {
  failureThreshold: 5,
  circuitTimeout: 300_000, // 5 min
  degradedThreshold: 3,
};

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);

  private readonly states = new Map<string, SessionHealthState>();
  private readonly metrics = new Map<string, MessageMetrics>();
  private readonly configs = new Map<string, Partial<HealthConfig>>();

  private getEffectiveConfig(sessionId: string): HealthConfig {
    const overrides = this.configs.get(sessionId);
    if (!overrides) return DEFAULT_CONFIG;
    return {
      failureThreshold: overrides.failureThreshold ?? DEFAULT_CONFIG.failureThreshold,
      circuitTimeout: overrides.circuitTimeout ?? DEFAULT_CONFIG.circuitTimeout,
      degradedThreshold: overrides.degradedThreshold ?? DEFAULT_CONFIG.degradedThreshold,
    };
  }

  setConfig(sessionId: string, config: Partial<HealthConfig>) {
    this.configs.set(sessionId, config);
  }

  getConfig(sessionId: string): HealthConfig {
    return this.getEffectiveConfig(sessionId);
  }

  registerSession(sessionId: string) {
    if (!this.states.has(sessionId)) {
      this.states.set(sessionId, {
        sessionId,
        status: 'healthy',
        circuitState: 'closed',
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalSent: 0,
        totalFailed: 0,
        lastSeen: Date.now(),
        lastError: null,
        lastErrorAt: null,
        isConnected: false,
        registeredAt: Date.now(),
      });
      this.metrics.set(sessionId, { sent: 0, failed: 0, latencies: [] });
      this.logger.log(`[${sessionId}] Registered for health monitoring`);
    }
  }

  unregisterSession(sessionId: string) {
    this.states.delete(sessionId);
    this.metrics.delete(sessionId);
    this.configs.delete(sessionId);
    this.logger.log(`[${sessionId}] Unregistered from health monitoring`);
  }

  markConnected(sessionId: string) {
    const state = this.getOrCreateState(sessionId);
    state.isConnected = true;
    state.lastSeen = Date.now();
  }

  markDisconnected(sessionId: string) {
    const state = this.getOrCreateState(sessionId);
    state.isConnected = false;
    state.lastSeen = Date.now();
  }

  recordPing(sessionId: string) {
    const state = this.getOrCreateState(sessionId);
    state.lastSeen = Date.now();
  }

  recordSuccess(sessionId: string, latencyMs?: number) {
    const state = this.getOrCreateState(sessionId);
    state.consecutiveFailures = 0;
    state.consecutiveSuccesses++;
    state.totalSent++;
    state.lastSeen = Date.now();

    if (state.circuitState === 'half-open') {
      state.circuitState = 'closed';
      state.status = 'healthy';
      this.logger.log(`[${sessionId}] Circuit closed after successful operation`);
    } else if (state.status === 'degraded' && state.consecutiveSuccesses >= 5) {
      state.status = 'healthy';
      this.logger.log(`[${sessionId}] Health restored after ${state.consecutiveSuccesses} successes`);
    }

    // Track metrics
    const metrics = this.metrics.get(sessionId);
    if (metrics) {
      metrics.sent++;
      if (latencyMs !== undefined) {
        metrics.latencies.push(latencyMs);
        // Keep only last 100 latencies
        if (metrics.latencies.length > 100) {
          metrics.latencies = metrics.latencies.slice(-100);
        }
      }
    }
  }

  recordFailure(sessionId: string, error: string) {
    const state = this.getOrCreateState(sessionId);
    state.consecutiveFailures++;
    state.consecutiveSuccesses = 0;
    state.totalFailed++;
    state.lastError = error;
    state.lastErrorAt = Date.now();
    state.lastSeen = Date.now();

    const config = this.getEffectiveConfig(sessionId);

    if (state.consecutiveFailures >= config.failureThreshold) {
      state.circuitState = 'open';
      state.status = 'unhealthy';
      this.logger.warn(
        `[${sessionId}] Circuit OPEN after ${state.consecutiveFailures} consecutive failures: ${error}`,
      );
    } else if (state.consecutiveFailures >= config.degradedThreshold) {
      state.status = 'degraded';
      this.logger.warn(
        `[${sessionId}] Degraded: ${state.consecutiveFailures}/${config.failureThreshold}`,
      );
    }

    // Track metrics
    const metrics = this.metrics.get(sessionId);
    if (metrics) metrics.failed++;
  }

  getHealth(sessionId: string): SessionHealth {
    const state = this.states.get(sessionId);
    if (!state) return 'unhealthy';
    this.tryHalfOpen(sessionId, state);
    return state.status;
  }

  getCircuitState(sessionId: string): CircuitState {
    const state = this.states.get(sessionId);
    if (!state) return 'open';
    this.tryHalfOpen(sessionId, state);
    return state.circuitState;
  }

  isOperationAllowed(sessionId: string): boolean {
    const circuitState = this.getCircuitState(sessionId);
    if (circuitState === 'open') return false;
    return true;
  }

  isHealthy(sessionId: string): boolean {
    return this.getHealth(sessionId) === 'healthy';
  }

  /**
   * Get detailed stats for a session.
   */
  getSessionStats(sessionId: string) {
    const state = this.states.get(sessionId);
    if (!state) return null;

    const metrics = this.metrics.get(sessionId);
    const totalOps = state.totalSent + state.totalFailed;
    const avgLatency = metrics && metrics.latencies.length > 0
      ? Math.round(metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length)
      : null;

    return {
      sessionId: state.sessionId,
      status: state.status,
      circuitState: state.circuitState,
      isConnected: state.isConnected,
      totalSent: state.totalSent,
      totalFailed: state.totalFailed,
      successRate: totalOps > 0 ? Math.round((state.totalSent / totalOps) * 100) : 100,
      consecutiveFailures: state.consecutiveFailures,
      consecutiveSuccesses: state.consecutiveSuccesses,
      lastSeen: state.lastSeen,
      lastError: state.lastError,
      lastErrorAt: state.lastErrorAt,
      registeredAt: state.registeredAt,
      avgLatency,
      uptime: Date.now() - state.registeredAt,
    };
  }

  /**
   * Get all sessions' stats for the health dashboard.
   */
  getAllSessionStats() {
    const stats: Array<ReturnType<typeof this.getSessionStats>> = [];
    for (const id of this.states.keys()) {
      stats.push(this.getSessionStats(id));
    }
    return stats;
  }

  /**
   * Get aggregate health across all sessions.
   */
  getAggregateHealth() {
    const all = this.getAllSessionStats();
    return {
      total: all.length,
      healthy: all.filter((s) => s?.status === 'healthy').length,
      degraded: all.filter((s) => s?.status === 'degraded').length,
      unhealthy: all.filter((s) => s?.status === 'unhealthy').length,
      totalSent: all.reduce((sum, s) => sum + (s?.totalSent ?? 0), 0),
      totalFailed: all.reduce((sum, s) => sum + (s?.totalFailed ?? 0), 0),
      paused: 0, // Will be populated by AutoPauseService
    };
  }

  private tryHalfOpen(sessionId: string, state: SessionHealthState) {
    if (state.circuitState !== 'open') return;
    const config = this.getEffectiveConfig(sessionId);
    if (Date.now() - (state.lastErrorAt ?? 0) >= config.circuitTimeout) {
      state.circuitState = 'half-open';
      state.status = 'degraded';
      this.logger.log(`[${sessionId}] Circuit half-open, allowing test operation`);
    }
  }

  private getOrCreateState(sessionId: string): SessionHealthState {
    let state = this.states.get(sessionId);
    if (!state) {
      this.registerSession(sessionId);
      state = this.states.get(sessionId)!;
    }
    return state;
  }
}
