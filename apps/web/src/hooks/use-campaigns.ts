import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Campaign = {
  id: string;
  name: string;
  template_id?: string;
  status: string;
  scheduled_at?: string;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_count: number;
  completed_at?: string;
  template?: { id: string; name: string };
  created_at: string;
};

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Campaign | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/campaigns`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const data = await res.json();
      setCampaigns(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaignById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/campaigns/${id}`);
      if (!res.ok) throw new Error('Campaign not found');
      const data = await res.json();
      setCurrent(data);
      return data as Campaign;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (dto: Partial<Campaign>) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create campaign');
    const campaign = await res.json();
    setCampaigns((prev) => [campaign, ...prev]);
    return campaign;
  }, []);

  const startCampaign = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/${id}/start`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to start campaign');
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'sending' } : c)),
    );
    return true;
  }, []);

  const pauseCampaign = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/${id}/pause`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to pause campaign');
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'paused' } : c)),
    );
    return true;
  }, []);

  const cancelCampaign = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/${id}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to cancel campaign');
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, []);

  return {
    campaigns, total, loading, error, current,
    fetchCampaigns, fetchCampaignById,
    createCampaign, startCampaign, pauseCampaign, cancelCampaign,
  };
}
