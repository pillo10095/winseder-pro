import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Condition = {
  field: 'message.content' | 'message.sender_jid' | 'message.type';
  operator: 'contains' | 'equals' | 'starts_with' | 'regex';
  value: string;
};

export type Action = {
  type: 'reply.text' | 'reply.image' | 'webhook' | 'ai_hook';
  config: Record<string, string>;
};

export type AutomationRule = {
  id: string;
  name: string;
  is_active: boolean;
  conditions: Condition[];
  actions: Action[];
  priority: number;
  created_at: string;
  updated_at: string;
};

const API = `${API_URL}/automation-rules`;

export function useAutomations() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<AutomationRule | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(API);
      if (!res.ok) throw new Error('Failed to fetch rules');
      setRules(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRuleById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API}/${id}`);
      if (!res.ok) throw new Error('Rule not found');
      const data = await res.json();
      setCurrent(data);
      return data as AutomationRule;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (dto: Partial<AutomationRule>) => {
    const res = await fetchWithAuth(API, {
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
    const res = await fetchWithAuth(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to update rule');
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setCurrent(updated);
    return updated;
  }, []);

  const toggleRule = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API}/${id}/toggle`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to toggle rule');
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete rule');
    setRules((prev) => prev.filter((r) => r.id !== id));
    return true;
  }, []);

  return {
    rules, loading, error, current,
    fetchRules, fetchRuleById, createRule, updateRule, toggleRule, deleteRule,
  };
}
