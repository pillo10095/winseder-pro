import { Injectable, Logger } from '@nestjs/common';

export interface HealthConfig {
  pingInterval: number;
  failureThreshold: number;
  circuitTimeout: number;
}

export type SessionHealth = 'healthy' | 'degraded' | 'unhealthy';
export type CircuitState = 'closed' | 'half-open' | 'open';

interface SessionHealthState {
  sessionId: string;
  status: SessionHealth;
  circuitState: CircuitState;
  consecutiveFailures: number;
  lastPing: number;
  lastError: string | null;
  lastErrorAt: number | null;
  isConnected: boolean;
}

@Injectable()
export class HealthMonitor {
  private readonly logger = new Logger(HealthMonitor.name);
  private readonly states = new Map<string, SessionHealthState>();

  private readonly defaultConfig: HealthConfig = {
    pingInterval: 30_000,
    failureThreshold: 5,
    circuitTimeout: 300_000,
  };

  private readonly configs = new Map<string, HealthConfig>();

  setConfig(sessionId: string, config: Partial<HealthConfig>) {
    const existing = this.configs.get(sessionId) ?? { ...this.defaultConfig };
    this.configs.set(sessionId, { ...existing, ...config });
  }

  getConfig(sessionId: string): HealthConfig {
    return this.configs.get(sessionId) ?? { ...this.defaultConfig };
  }

  registerSession(sessionId: string) {
    if (!this.states.has(sessionId)) {
      this.states.set(sessionId, {
        sessionId,
        status: 'healthy',
        circuitState: 'closed',
        consecutiveFailures: 0,
        lastPing: Date.now(),
        lastError: null,
        lastErrorAt: null,
        isConnected: false,
      });
      this.logger.log(`[${sessionId}] Registered for health monitoring`);
    }
  }

  recordPing(sessionId: string) {
    const state = this.getState(sessionId);
    state.lastPing = Date.now();
    state.isConnected = true;
  }

  recordSuccess(sessionId: string) {
    const state = this.getState(sessionId);
    state.consecutiveFailures = 0;
    state.status = 'healthy';

    if (state.circuitState === 'half-open') {
      state.circuitState = 'closed';
      this.logger.log(`[${sessionId}] Circuit closed after successful operation`);
    }
  }

  recordFailure(sessionId: string, error: string) {
    const state = this.getState(sessionId);
    state.consecutiveFailures++;
    state.lastError = error;
    state.lastErrorAt = Date.now();
    state.isConnected = false;

    const config = this.getConfig(sessionId);

    if (state.consecutiveFailures >= config.failureThreshold) {
      state.circuitState = 'open';
      state.status = 'unhealthy';
      this.logger.warn(
        `[${sessionId}] Circuit OPEN after ${state.consecutiveFailures} consecutive failures: ${error}`,
      );
    } else if (state.consecutiveFailures >= Math.floor(config.failureThreshold / 2)) {
      state.status = 'degraded';
      this.logger.warn(`[${sessionId}] Degraded: ${state.consecutiveFailures}/${config.failureThreshold}`);
    }
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
    if (circuitState === 'half-open') {
      // Allow one request through to test
      return true;
    }
    return true;
  }

  isHealthy(sessionId: string): boolean {
    return this.getHealth(sessionId) === 'healthy';
  }

  private tryHalfOpen(sessionId: string, state: SessionHealthState) {
    if (state.circuitState !== 'open') return;
    const config = this.getConfig(sessionId);
    if (Date.now() - (state.lastErrorAt ?? 0) >= config.circuitTimeout) {
      state.circuitState = 'half-open';
      state.status = 'degraded';
      this.logger.log(`[${sessionId}] Circuit half-open, allowing test operation`);
    }
  }

  unregisterSession(sessionId: string) {
    this.states.delete(sessionId);
    this.configs.delete(sessionId);
    this.logger.log(`[${sessionId}] Unregistered from health monitoring`);
  }

  getAllSessions(): SessionHealthState[] {
    return Array.from(this.states.values());
  }

  private getState(sessionId: string): SessionHealthState {
    let state = this.states.get(sessionId);
    if (!state) {
      this.registerSession(sessionId);
      state = this.states.get(sessionId)!;
    }
    return state;
  }
}
