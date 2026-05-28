import { Injectable, Logger } from '@nestjs/common';

export type ReportType = 'spam_report' | 'block_notice' | 'suspicious_activity' | 'account_warning';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ReportAnalysis {
  detected: boolean;
  type: ReportType | null;
  severity: ReportSeverity | null;
  confidence: number;
  matchedPatterns: string[];
  frequencyInWindow: number;
  timestamp: number;
}

export interface ReportDetectorConfig {
  keywords: string[];
  frequencyThreshold: number;
  frequencyWindowMs: number;
  enabled: boolean;
}

export interface ReportHistoryEntry {
  type: ReportType;
  severity: ReportSeverity;
  confidence: number;
  matchedPatterns: string[];
  messageSnippet: string;
  timestamp: number;
}

interface SessionReportState {
  history: ReportHistoryEntry[];
}

const DETECTION_PATTERNS: Array<{
  type: ReportType;
  severity: ReportSeverity;
  patterns: RegExp[];
}> = [
  {
    type: 'spam_report',
    severity: 'high',
    patterns: [
      /(?:report(?:ed)?\s*(?:as|for)?\s*(?:spam|abuse))|(?:fue\s*reportado)|(?:denunciado\s*como\s*spam)|(?:has\s*been\s*reported)/i,
      /(?:spam\s*report)|(?:reporte\s*de\s*spam)/i,
      /(?:you\s*were\s*reported)|(?:te\s*reportaron)/i,
      /(?:marked\s*as\s*spam)|(?:marcado\s*como\s*spam)/i,
    ],
  },
  {
    type: 'block_notice',
    severity: 'critical',
    patterns: [
      /(?:your\s*account\s*has\s*been\s*blocked)|(?:tu\s*cuenta\s*ha\s*sido\s*bloqueada)/i,
      /(?:account\s*(?:restricted|banned|suspended))|(?:cuenta\s*(?:restringida|baneada|suspendida))/i,
      /(?:violaci[óo]n\s*de\s*t[ée]rminos)|(?:terms\s*of\s*service\s*violation)/i,
      /(?:temporary\s*ban)|(?:baneo\s*temporal)/i,
    ],
  },
  {
    type: 'suspicious_activity',
    severity: 'medium',
    patterns: [
      /(?:suspicious\s*activity)|(?:actividad\s*sospechosa)/i,
      /(?:unusual\s*(?:login|activity|behavior))|(?:comportamiento\s*inusual)/i,
      /(?:new\s*(?:device|login|location)\s*detected)|(?:nuevo\s*(?:dispositivo|inicio\s*de\s*sesi[óo]n|ubicaci[óo]n))/i,
      /(?:verify\s*your\s*(?:account|identity))|(?:verifica\s*tu\s*(?:cuenta|identidad))/i,
    ],
  },
  {
    type: 'account_warning',
    severity: 'high',
    patterns: [
      /(?:warning|advertencia|alerta).*(?:account|cuenta|session|sesi[óo]n)/i,
      /(?:final\s*warning)|(?:última\s*advertencia)/i,
      /(?:your\s*account\s*is\s*at\s*risk)|(?:tu\s*cuenta\s*est[aá]\s*en\s*riesgo)/i,
      /(?:action\s*required)|(?:acci[óo]n\s*requerida)/i,
    ],
  },
];

const DEFAULT_KEYWORDS = [
  'report', 'spam', 'bloqueado', 'baneado', 'suspendido',
  'warning', 'advertencia', 'violación', 'términos',
  'restricted', 'suspicious', 'unusual', 'verify',
];

const DEFAULT_CONFIG: ReportDetectorConfig = {
  keywords: DEFAULT_KEYWORDS,
  frequencyThreshold: 3,
  frequencyWindowMs: 3_600_000, // 1 hour
  enabled: true,
};

@Injectable()
export class ReportDetectorService {
  private readonly logger = new Logger(ReportDetectorService.name);

  private readonly states = new Map<string, SessionReportState>();
  private readonly configs = new Map<string, Partial<ReportDetectorConfig>>();

  private getEffectiveConfig(sessionId: string): ReportDetectorConfig {
    const overrides = this.configs.get(sessionId);
    if (!overrides) return DEFAULT_CONFIG;
    return {
      keywords: overrides.keywords ?? [...DEFAULT_CONFIG.keywords],
      frequencyThreshold: overrides.frequencyThreshold ?? DEFAULT_CONFIG.frequencyThreshold,
      frequencyWindowMs: overrides.frequencyWindowMs ?? DEFAULT_CONFIG.frequencyWindowMs,
      enabled: overrides.enabled ?? DEFAULT_CONFIG.enabled,
    };
  }

  private getState(sessionId: string): SessionReportState {
    let state = this.states.get(sessionId);
    if (!state) {
      state = { history: [] };
      this.states.set(sessionId, state);
    }
    return state;
  }

  setConfig(sessionId: string, config: Partial<ReportDetectorConfig>) {
    this.configs.set(sessionId, config);
  }

  getConfig(sessionId: string): ReportDetectorConfig {
    return this.getEffectiveConfig(sessionId);
  }

  /**
   * Analyze a message for report-related content.
   * Returns null if nothing detected.
   */
  analyze(sessionId: string, messageContent: string): ReportAnalysis | null {
    const config = this.getEffectiveConfig(sessionId);
    if (!config.enabled) return null;

    const state = this.getState(sessionId);
    const now = Date.now();

    // Check built-in patterns
    let bestMatch: { type: ReportType; severity: ReportSeverity; matchedPatterns: string[]; confidence: number } | null = null;

    for (const detection of DETECTION_PATTERNS) {
      const matched: string[] = [];
      for (const pattern of detection.patterns) {
        if (pattern.test(messageContent)) {
          matched.push(pattern.source);
        }
      }

      if (matched.length > 0) {
        const confidence = Math.min(1, matched.length / detection.patterns.length + 0.3);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            type: detection.type,
            severity: detection.severity,
            matchedPatterns: matched,
            confidence,
          };
        }
      }
    }

    // Check custom keywords
    const keywordMatches = config.keywords.filter((kw) =>
      messageContent.toLowerCase().includes(kw.toLowerCase()),
    );

    if (!bestMatch && keywordMatches.length === 0) return null;

    // Calculate overall confidence
    let confidence = bestMatch?.confidence ?? 0;
    if (keywordMatches.length > 0) {
      const kwConfidence = Math.min(1, keywordMatches.length / config.keywords.length);
      confidence = Math.max(confidence, kwConfidence * 0.5);
    }

    const finalType = bestMatch?.type ?? 'spam_report';
    const finalSeverity = bestMatch?.severity ?? 'low';
    const allPatterns = [
      ...(bestMatch?.matchedPatterns ?? []),
      ...keywordMatches.map((kw) => `keyword:${kw}`),
    ];

    // Check frequency in window
    const windowStart = now - config.frequencyWindowMs;
    const frequency = state.history.filter((h) => h.timestamp > windowStart).length + 1;

    // Store in history
    const analysis: ReportAnalysis = {
      detected: true,
      type: finalType,
      severity: frequency >= config.frequencyThreshold ? 'critical' : finalSeverity,
      confidence,
      matchedPatterns: allPatterns,
      frequencyInWindow: frequency,
      timestamp: now,
    };

    state.history.push({
      type: finalType ?? 'spam_report',
      severity: analysis.severity ?? 'low',
      confidence,
      matchedPatterns: allPatterns,
      messageSnippet: messageContent.substring(0, 200),
      timestamp: now,
    });

    // Prune old history (keep 7 days)
    const sevenDays = now - 604_800_000;
    state.history = state.history.filter((h) => h.timestamp > sevenDays);

    this.logger.warn(
      `[${sessionId}] Report detected: ${finalType} (${analysis.severity}) confidence=${confidence.toFixed(2)} freq=${frequency}`,
    );

    return analysis;
  }

  /**
   * Get report history for a session.
   */
  getHistory(sessionId: string) {
    const state = this.getState(sessionId);
    const now = Date.now();
    const config = this.getEffectiveConfig(sessionId);
    const windowStart = now - config.frequencyWindowMs;

    return {
      total: state.history.length,
      recentWindow: state.history.filter((h) => h.timestamp > windowStart).length,
      entries: [...state.history].reverse(), // newest first
    };
  }

  /**
   * Get statistics per severity level.
   */
  getStats(sessionId: string) {
    const state = this.getState(sessionId);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const entry of state.history) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
    }

    return { byType, bySeverity, total: state.history.length };
  }

  reset(sessionId: string) {
    this.states.delete(sessionId);
    this.configs.delete(sessionId);
  }
}
