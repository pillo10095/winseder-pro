import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type SessionHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthOverview {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  totalSent: number;
  totalFailed: number;
  paused: number;
  pausedSessions: Array<{
    sessionId: string;
    reason: string;
    pausedAt: number;
    autoResumeAt: number | null;
  }>;
}

export interface SessionHealthDetail {
  health: {
    sessionId: string;
    status: SessionHealthStatus;
    circuitState: string;
    isConnected: boolean;
    totalSent: number;
    totalFailed: number;
    successRate: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastSeen: number;
    lastError: string | null;
    lastErrorAt: number | null;
    avgLatency: number | null;
  };
  delay: {
    currentDelay: number;
    minDelay: number;
    maxDelay: number;
    consecutiveFailures: number;
    totalFailures: number;
    totalSuccesses: number;
    alertTriggered: boolean;
  };
  pause: {
    paused: boolean;
    reason: string | null;
    pausedAt: number | null;
    autoResumeAt: number | null;
  };
  budget: {
    limit: number;
    consumed: number;
    remaining: number;
    usagePercent: number;
  };
  rateLimiter: {
    tighteningLevel: number;
    violations: number;
    lastViolationAt: number | null;
  };
  quietHours: {
    isActive: boolean;
  };
}

export interface AntiBanConfig {
  rateLimiter: Record<string, unknown>;
  adaptiveDelay: Record<string, unknown>;
  quietHours: Record<string, unknown>;
  dailyBudget: Record<string, unknown>;
  reportDetector: Record<string, unknown>;
  autoPause: Record<string, unknown>;
}

const API = `${API_URL ?? 'http://localhost:4000/api'}/anti-ban`;

export function useSessionHealth() {
  const [overview, setOverview] = useState<HealthOverview | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionHealthDetail | null>(null);
  const [config, setConfig] = useState<AntiBanConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/health`);
      if (!res.ok) throw new Error('Failed to fetch health overview');
      const json = await res.json();
      setOverview(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionHealth = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/health/${sessionId}`);
      if (!res.ok) throw new Error('Session not found');
      const json = await res.json();
      setSessionDetail(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/config/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch config');
      const json = await res.json();
      setConfig(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (sessionId: string, partial: Partial<AntiBanConfig>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/config/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error('Failed to update config');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const pauseSession = useCallback(async (sessionId: string, reason?: string) => {
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/${sessionId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return res.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const resumeSession = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/${sessionId}/resume`, {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const fetchBudget = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/budget/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      const json = await res.json();
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  return {
    overview,
    sessionDetail,
    config,
    loading,
    error,
    fetchOverview,
    fetchSessionHealth,
    fetchConfig,
    updateConfig,
    pauseSession,
    resumeSession,
    fetchBudget,
  };
}
