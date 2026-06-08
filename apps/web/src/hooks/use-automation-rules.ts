import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type AutomationRule = {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, unknown> | null;
  action: { type: string; params: Record<string, unknown> };
  enabled: boolean;
  created_at: string;
};

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/automation-rules`);
      if (!res.ok) throw new Error('Failed to fetch rules');
      setRules(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (dto: Partial<AutomationRule>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create rule');
    const rule = await res.json();
    setRules((prev) => [...prev, rule]);
    return rule;
  }, []);

  const updateRule = useCallback(async (id: string, dto: Partial<AutomationRule>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to update rule');
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const toggleRule = useCallback(async (id: string, enabled: boolean) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle rule');
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete rule');
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { rules, loading, error, fetchRules, createRule, updateRule, toggleRule, deleteRule };
}
