import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Deal = {
  id: string;
  name: string;
  value: number;
  pipeline_stage_id: string;
  contact_id?: string;
  company_name?: string;
  probability: number;
  close_date?: string;
  assigned_to?: string;
  won_lost_reason?: string | null;
};

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Deal | null>(null);
  const [currentLoading, setCurrentLoading] = useState(false);

  const fetchDeals = useCallback(
    async (
      _companyId: string,
      stageId?: string,
      assignedTo?: string,
      search?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (stageId) params.set('stage_id', stageId);
        if (assignedTo) params.set('assigned_to', assignedTo);
        if (search) params.set('search', search);
        params.set('limit', '50');

        const res = await fetchWithAuth(
          `${API_URL}/crm/deals?${params.toString()}`,
        );
        if (!res.ok) throw new Error('Failed to fetch deals');

        const data = await res.json();
        setDeals(data.data ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchDealById = useCallback(async (id: string) => {
    setCurrentLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/deals/${id}`);
      if (!res.ok) throw new Error('Deal not found');
      const data = await res.json();
      setCurrent(data);
      return data as Deal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCurrent(null);
      return null;
    } finally {
      setCurrentLoading(false);
    }
  }, []);

  return {
    deals, total, loading, error,
    current, currentLoading,
    fetchDeals, fetchDealById,
  };
}
