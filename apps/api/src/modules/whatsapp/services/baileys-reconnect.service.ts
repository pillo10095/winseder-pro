import { Injectable, Logger } from '@nestjs/common';
import { DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

export interface ReconnectResult {
  shouldReconnect: boolean;
  reason: string;
}

@Injectable()
export class BaileysReconnectService {
  private readonly logger = new Logger(BaileysReconnectService.name);

  private readonly maxRetries = 3;
  private retryCounters = new Map<string, number>();
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Evaluate a disconnection and determine if reconnection is needed.
   * Returns { shouldReconnect, reason }.
   */
  evaluateDisconnect(sessionId: string, lastDisconnect?: { error?: Error }): ReconnectResult {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

    switch (statusCode) {
      case DisconnectReason.loggedOut:
        this.clearRetries(sessionId);
        return { shouldReconnect: false, reason: 'Logged out — manual QR rescan required' };

      case DisconnectReason.restartRequired:
        return { shouldReconnect: true, reason: 'Restart required by WhatsApp' };

      case DisconnectReason.connectionClosed:
      case DisconnectReason.connectionLost:
      case DisconnectReason.timedOut:
        return this.handleRetryableDisconnect(sessionId, 'Network issue');

      default:
        // Unknown errors — retry by default
        return this.handleRetryableDisconnect(sessionId, `Unknown error (code: ${statusCode})`);
    }
  }

  private handleRetryableDisconnect(sessionId: string, reason: string): ReconnectResult {
    const current = this.retryCounters.get(sessionId) || 0;

    if (current >= this.maxRetries) {
      this.clearRetries(sessionId);
      return { shouldReconnect: false, reason: `${reason} — max retries (${this.maxRetries}) exceeded` };
    }

    this.retryCounters.set(sessionId, current + 1);
    return { shouldReconnect: true, reason };
  }

  getBackoffDelay(sessionId: string): number {
    const attempt = this.retryCounters.get(sessionId) || 0;
    // Exponential backoff: 5s, 15s, 45s
    return Math.min(5000 * Math.pow(3, attempt), 45000);
  }

  scheduleReconnect(
    sessionId: string,
    callback: () => Promise<void>,
  ): void {
    const delay = this.getBackoffDelay(sessionId);
    this.logger.log(`Scheduling reconnect for session ${sessionId} in ${delay}ms`);

    const timer = setTimeout(async () => {
      this.timers.delete(sessionId);
      try {
        await callback();
      } catch (err) {
        this.logger.error(`Reconnect callback failed for session ${sessionId}`, err);
      }
    }, delay);

    this.timers.set(sessionId, timer);
  }

  onReconnectSuccess(sessionId: string): void {
    this.clearRetries(sessionId);
  }

  clearRetries(sessionId: string): void {
    this.retryCounters.delete(sessionId);
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  onApplicationShutdown(): void {
    for (const [sessionId, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.retryCounters.clear();
  }
}
