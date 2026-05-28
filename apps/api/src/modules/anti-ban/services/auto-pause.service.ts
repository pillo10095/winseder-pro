import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface AutoPauseConfig {
  autoResumeMinutes: number;
  pauseOnDegraded: boolean;
  pauseOnRateLimit: boolean;
  pauseOnReport: boolean;
  pauseOnBudgetExceeded: boolean;
  rateLimitViolationThreshold: number;
}

export interface PauseEntry {
  sessionId: string;
  reason: string;
  pausedAt: number;
  autoResumeAt: number | null;
  resumedAt: number | null;
  triggeredBy: string;
}

const DEFAULT_CONFIG: AutoPauseConfig = {
  autoResumeMinutes: 30,
  pauseOnDegraded: true,
  pauseOnRateLimit: true,
  pauseOnReport: true,
  pauseOnBudgetExceeded: true,
  rateLimitViolationThreshold: 3,
};

@Injectable()
export class AutoPauseService {
  private readonly logger = new Logger(AutoPauseService.name);

  private readonly paused = new Map<string, PauseEntry>();
  private readonly configs = new Map<string, Partial<AutoPauseConfig>>();
  private readonly rateLimitViolations = new Map<string, number[]>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  private getEffectiveConfig(sessionId: string): AutoPauseConfig {
    const overrides = this.configs.get(sessionId);
    if (!overrides) return DEFAULT_CONFIG;
    return {
      autoResumeMinutes: overrides.autoResumeMinutes ?? DEFAULT_CONFIG.autoResumeMinutes,
      pauseOnDegraded: overrides.pauseOnDegraded ?? DEFAULT_CONFIG.pauseOnDegraded,
      pauseOnRateLimit: overrides.pauseOnRateLimit ?? DEFAULT_CONFIG.pauseOnRateLimit,
      pauseOnReport: overrides.pauseOnReport ?? DEFAULT_CONFIG.pauseOnReport,
      pauseOnBudgetExceeded: overrides.pauseOnBudgetExceeded ?? DEFAULT_CONFIG.pauseOnBudgetExceeded,
      rateLimitViolationThreshold: overrides.rateLimitViolationThreshold ?? DEFAULT_CONFIG.rateLimitViolationThreshold,
    };
  }

  setConfig(sessionId: string, config: Partial<AutoPauseConfig>) {
    this.configs.set(sessionId, config);
  }

  getConfig(sessionId: string): AutoPauseConfig {
    return this.getEffectiveConfig(sessionId);
  }

  /**
   * Pause a session manually or automatically.
   */
  pause(sessionId: string, reason: string, triggeredBy: 'manual' | 'auto' = 'manual') {
    const config = this.getEffectiveConfig(sessionId);
    const now = Date.now();

    const entry: PauseEntry = {
      sessionId,
      reason,
      pausedAt: now,
      autoResumeAt: triggeredBy === 'auto' ? now + config.autoResumeMinutes * 60_000 : null,
      resumedAt: null,
      triggeredBy,
    };

    this.paused.set(sessionId, entry);
    this.logger.warn(`[${sessionId}] PAUSED: ${reason} (triggeredBy: ${triggeredBy})`);

    this.eventEmitter.emit('anti-ban.session_paused', {
      sessionId,
      reason,
      triggeredBy,
      autoResumeAt: entry.autoResumeAt,
      pausedAt: entry.pausedAt,
    });
  }

  /**
   * Resume a paused session.
   */
  resume(sessionId: string): boolean {
    const entry = this.paused.get(sessionId);
    if (!entry) return false;

    entry.resumedAt = Date.now();
    this.paused.delete(sessionId);
    this.logger.log(`[${sessionId}] RESUMED after ${(entry.resumedAt - entry.pausedAt) / 1000}s`);

    this.eventEmitter.emit('anti-ban.session_resumed', {
      sessionId,
      reason: entry.reason,
      pausedDuration: entry.resumedAt - entry.pausedAt,
      resumedAt: entry.resumedAt,
    });

    return true;
  }

  /**
   * Check if a session is currently paused.
   * Auto-resumes if the auto-resume time has passed.
   */
  isPaused(sessionId: string): boolean {
    const entry = this.paused.get(sessionId);
    if (!entry) return false;

    // Auto-resume check
    if (entry.autoResumeAt && Date.now() >= entry.autoResumeAt) {
      this.resume(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Get pause info for a session.
   */
  getPauseInfo(sessionId: string): {
    paused: boolean;
    reason: string | null;
    pausedAt: number | null;
    autoResumeAt: number | null;
    triggeredBy: string | null;
  } {
    const entry = this.paused.get(sessionId);
    if (!entry || (entry.autoResumeAt && Date.now() >= entry.autoResumeAt)) {
      if (entry) this.resume(sessionId);
      return { paused: false, reason: null, pausedAt: null, autoResumeAt: null, triggeredBy: null };
    }
    return {
      paused: true,
      reason: entry.reason,
      pausedAt: entry.pausedAt,
      autoResumeAt: entry.autoResumeAt,
      triggeredBy: entry.triggeredBy,
    };
  }

  /**
   * Check if a rate limit violation should trigger auto-pause.
   * Call this when a rate limit violation occurs.
   */
  checkRateLimitViolations(sessionId: string): boolean {
    const config = this.getEffectiveConfig(sessionId);
    if (!config.pauseOnRateLimit) return false;

    const now = Date.now();
    let violations = this.rateLimitViolations.get(sessionId) ?? [];
    // Keep only last 5 minutes
    violations = violations.filter((t) => t > now - 300_000);
    violations.push(now);
    this.rateLimitViolations.set(sessionId, violations);

    if (violations.length >= config.rateLimitViolationThreshold) {
      this.pause(sessionId, `Rate limit exceeded: ${violations.length} violations in 5min`, 'auto');
      this.rateLimitViolations.delete(sessionId);
      return true;
    }

    return false;
  }

  /**
   * Check and auto-pause based on health status.
   */
  checkHealthTrigger(sessionId: string, healthStatus: string): boolean {
    const config = this.getEffectiveConfig(sessionId);
    if (!config.pauseOnDegraded) return false;

    if (healthStatus === 'unhealthy') {
      this.pause(sessionId, 'Session health degraded to unhealthy', 'auto');
      return true;
    }
    return false;
  }

  /**
   * Check and auto-pause based on budget.
   */
  checkBudgetTrigger(sessionId: string, budgetExceeded: boolean): boolean {
    const config = this.getEffectiveConfig(sessionId);
    if (!config.pauseOnBudgetExceeded) return false;

    if (budgetExceeded) {
      this.pause(sessionId, 'Daily budget exceeded', 'auto');
      return true;
    }
    return false;
  }

  /**
   * Check and auto-pause based on report detection.
   */
  checkReportTrigger(sessionId: string, severity: string): boolean {
    const config = this.getEffectiveConfig(sessionId);
    if (!config.pauseOnReport) return false;

    if (severity === 'high' || severity === 'critical') {
      this.pause(sessionId, `Report detected: ${severity} severity`, 'auto');
      return true;
    }
    return false;
  }

  /**
   * Get all currently paused sessions.
   */
  getAllPaused(): PauseEntry[] {
    // Auto-resume expired entries
    for (const [id, entry] of this.paused.entries()) {
      if (entry.autoResumeAt && Date.now() >= entry.autoResumeAt) {
        this.resume(id);
      }
    }
    return Array.from(this.paused.values());
  }

  getPauseHistory(_sessionId: string): PauseEntry[] {
    // In-memory implementation — for MVP we return current state only
    return this.getAllPaused();
  }
}
