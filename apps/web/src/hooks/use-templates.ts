import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Template = {
  id: string;
  name: string;
  body: string;
  variables?: string[];
  created_at?: string;
};

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetchWithAuth(
        `${API_URL}/campaigns/templates?${params.toString()}`,
      );
      if (!res.ok) throw new Error('Failed to fetch templates');

      const data = await res.json();
      setTemplates(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplateById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/campaigns/templates/${id}`);
      if (!res.ok) throw new Error('Template not found');
      const data = await res.json();
      setCurrent(data);
      return data as Template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (dto: Partial<Template>) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create template');
    const template = await res.json();
    setTemplates((prev) => [template, ...prev]);
    return template;
  }, []);

  const updateTemplate = useCallback(async (id: string, dto: Partial<Template>) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to update template');
    const updated = await res.json();
    setCurrent(updated);
    setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/templates/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete template');
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  return {
    templates, loading, error, current,
    fetchTemplates, fetchTemplateById, createTemplate, updateTemplate, deleteTemplate,
  };
}
