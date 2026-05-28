import { Injectable, Logger } from '@nestjs/common';

export interface QuietHoursRange {
  /** Format: "HH:mm" (24h) */
  start: string;
  /** Format: "HH:mm" (24h) */
  end: string;
  /** 0=Sunday, 6=Saturday. Omit = every day */
  daysOfWeek?: number[];
}

export interface QuietHoursConfig {
  timezone: string;
  ranges: QuietHoursRange[];
  enabled: boolean;
}

const DEFAULT_CONFIG: QuietHoursConfig = {
  timezone: 'America/Mexico_City',
  ranges: [
    { start: '23:00', end: '07:00' },
  ],
  enabled: true,
};

@Injectable()
export class QuietHoursService {
  private readonly logger = new Logger(QuietHoursService.name);

  private readonly configs = new Map<string, QuietHoursConfig>();

  setConfig(sessionId: string, config: Partial<QuietHoursConfig>) {
    const existing = this.configs.get(sessionId) ?? { ...DEFAULT_CONFIG, ranges: [...DEFAULT_CONFIG.ranges] };
    this.configs.set(sessionId, {
      ...existing,
      ...config,
      ranges: config.ranges ?? existing.ranges,
    });
  }

  getConfig(sessionId: string): QuietHoursConfig {
    return this.configs.get(sessionId) ?? { ...DEFAULT_CONFIG, ranges: [...DEFAULT_CONFIG.ranges] };
  }

  /**
   * Returns true if current time falls within any quiet hours range.
   */
  isQuietHours(sessionId: string): boolean {
    const config = this.getConfig(sessionId);
    if (!config.enabled || config.ranges.length === 0) return false;

    const now = this.getNowInTimezone(config.timezone);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();

    for (const range of config.ranges) {
      // Check day of week filter
      if (range.daysOfWeek && range.daysOfWeek.length > 0) {
        if (!range.daysOfWeek.includes(currentDay)) continue;
      }

      const startParts = range.start.split(':').map(Number);
      const endParts = range.end.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];

      if (startMinutes <= endMinutes) {
        // Normal range (e.g. 08:00 - 17:00)
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return true;
        }
      } else {
        // Overnight range (e.g. 23:00 - 07:00)
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Returns the next time quiet hours start, or null if no ranges configured.
   */
  getNextStart(sessionId: string): Date | null {
    return this.getNextEdge(sessionId, 'start');
  }

  /**
   * Returns the next time quiet hours end, or null if no ranges configured.
   */
  getNextEnd(sessionId: string): Date | null {
    return this.getNextEdge(sessionId, 'end');
  }

  private getNextEdge(sessionId: string, edge: 'start' | 'end'): Date | null {
    const config = this.getConfig(sessionId);
    if (config.ranges.length === 0) return null;

    const now = this.getNowInTimezone(config.timezone);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();

    let bestCandidate: Date | null = null;
    let bestDiff = Infinity;

    for (const range of config.ranges) {
      const timeStr = edge === 'start' ? range.start : range.end;
      const parts = timeStr.split(':').map(Number);
      const targetMinutes = parts[0] * 60 + parts[1];

      const daysToCheck = range.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];

      for (const dayOffset of [0, 1, 2, 3, 4, 5, 6]) {
        const checkDay = (currentDay + dayOffset) % 7;
        if (!daysToCheck.includes(checkDay)) continue;

        let candidateMinutes = targetMinutes;
        let candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + dayOffset);
        candidateDate.setHours(parts[0], parts[1], 0, 0);

        // Fast-forward if candidate is in the past
        if (candidateDate.getTime() <= now.getTime()) {
          candidateDate.setDate(candidateDate.getDate() + 7);
        }

        const diff = candidateDate.getTime() - now.getTime();
        if (diff > 0 && diff < bestDiff) {
          bestDiff = diff;
          bestCandidate = candidateDate;
        }
      }
    }

    return bestCandidate;
  }

  /**
   * Get current time in the configured timezone.
   */
  private getNowInTimezone(timezone: string): Date {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
      return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    } catch {
      // Fallback to local time if timezone is invalid
      return now;
    }
  }
}
