'use client';

import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Label = {
  id: string;
  name: string;
  color: string;
};

export function useLabels() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async (_companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/labels`);
      if (!res.ok) throw new Error('Failed to fetch labels');
      const body = await res.json();
      setLabels(body.data ?? body ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createLabel = useCallback(
    async (companyId: string, dto: { name: string; color?: string }) => {
      const res = await fetchWithAuth(`${API_URL}/crm/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Failed to create label');
      const body = await res.json();
      const label = body.data ?? body;
      setLabels((prev) => [...prev, label]);
      return label;
    },
    [],
  );

  const updateLabel = useCallback(
    async (id: string, dto: { name?: string; color?: string }) => {
      const res = await fetchWithAuth(`${API_URL}/crm/labels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Failed to update label');
      const body = await res.json();
      const updated = body.data ?? body;
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    },
    [],
  );

  const deleteLabel = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/labels/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete label');
    setLabels((prev) => prev.filter((l) => l.id !== id));
    return true;
  }, []);

  return { labels, loading, error, fetchLabels, createLabel, updateLabel, deleteLabel };
}
