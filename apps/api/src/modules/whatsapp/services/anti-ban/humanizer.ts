import { Injectable, Logger } from '@nestjs/common';

export interface HumanizerConfig {
  /** Min typing delay in ms before sending (default: 1000) */
  minTypingDelay: number;
  /** Max typing delay in ms before sending (default: 3000) */
  maxTypingDelay: number;
  /** Probability of taking a break between actions (0-1, default: 0.1) */
  breakProbability: number;
  /** Min break duration in ms (default: 5000) */
  minBreakDuration: number;
  /** Max break duration in ms (default: 30000) */
  maxBreakDuration: number;
  /** Quiet hours start (hour 0-23, default: 23) */
  quietHourStart: number;
  /** Quiet hours end (hour 0-23, default: 7) */
  quietHourEnd: number;
}

@Injectable()
export class AntiBanHumanizer {
  private readonly logger = new Logger(AntiBanHumanizer.name);
  private readonly configs = new Map<string, HumanizerConfig>();

  private readonly defaultConfig: HumanizerConfig = {
    minTypingDelay: 1000,
    maxTypingDelay: 3000,
    breakProbability: 0.1,
    minBreakDuration: 5000,
    maxBreakDuration: 30000,
    quietHourStart: 23,
    quietHourEnd: 7,
  };

  setConfig(sessionId: string, config: Partial<HumanizerConfig>) {
    const existing = this.configs.get(sessionId) ?? { ...this.defaultConfig };
    this.configs.set(sessionId, { ...existing, ...config });
  }

  getConfig(sessionId: string): HumanizerConfig {
    return this.configs.get(sessionId) ?? { ...this.defaultConfig };
  }

  /** Returns a random typing delay in ms */
  async simulateTyping(sessionId: string): Promise<void> {
    const config = this.getConfig(sessionId);
    const delay =
      Math.floor(Math.random() * (config.maxTypingDelay - config.minTypingDelay + 1)) +
      config.minTypingDelay;
    await this.sleep(delay);
  }

  /** Returns a break delay if roll succeeds, otherwise 0 */
  async maybeTakeBreak(sessionId: string): Promise<number> {
    const config = this.getConfig(sessionId);

    if (Math.random() < config.breakProbability) {
      const duration =
        Math.floor(Math.random() * (config.maxBreakDuration - config.minBreakDuration + 1)) +
        config.minBreakDuration;
      this.logger.debug(`[${sessionId}] Taking break for ${duration}ms`);
      await this.sleep(duration);
      return duration;
    }

    return 0;
  }

  /** Returns true if current time is within quiet hours */
  isQuietHours(): boolean {
    const hour = new Date().getHours();
    const config = this.defaultConfig;

    if (config.quietHourStart > config.quietHourEnd) {
      // Spans midnight, e.g. 23:00 - 07:00
      return hour >= config.quietHourStart || hour < config.quietHourEnd;
    }
    return hour >= config.quietHourStart && hour < config.quietHourEnd;
  }

  /** Returns a random delay for action spacing */
  async randomActionDelay(sessionId: string): Promise<void> {
    const config = this.getConfig(sessionId);
    const min = Math.floor(config.minTypingDelay * 0.3);
    const max = Math.floor(config.maxTypingDelay * 0.5);
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.sleep(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(sessionId: string) {
    this.configs.delete(sessionId);
  }
}
