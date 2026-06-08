import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type LabelMapping = {
  id: string;
  whatsapp_label: string;
  pipeline_stage_id: string;
  pipeline_stage?: { id: string; name: string };
  enabled: boolean;
};

export function useLabelMappings() {
  const [mappings, setMappings] = useState<LabelMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/label-mappings`);
      if (!res.ok) throw new Error('Failed to fetch mappings');
      setMappings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMapping = useCallback(async (dto: Partial<LabelMapping>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/label-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create mapping');
    const mapping = await res.json();
    setMappings((prev) => [...prev, mapping]);
    return mapping;
  }, []);

  const updateMapping = useCallback(async (id: string, dto: Partial<LabelMapping>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/label-mappings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to update mapping');
    const updated = await res.json();
    setMappings((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const deleteMapping = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/label-mappings/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete mapping');
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { mappings, loading, error, fetchMappings, createMapping, updateMapping, deleteMapping };
}
