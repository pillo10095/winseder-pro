import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type DealStage = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  default_probability?: number;
};

export type DealCard = {
  id: string;
  name: string;
  company_name?: string;
  value: number;
  contact_name?: string;
  assigned_to?: string;
  stage_id: string;
};

export function usePipeline() {
  const [stages, setStages] = useState<DealStage[]>([]);
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAssigned, setFilterAssigned] = useState<string>('');
  const [filterValueMin, setFilterValueMin] = useState<number>(0);
  const [filterValueMax, setFilterValueMax] = useState<number>(Infinity);

  const fetchPipeline = useCallback(async (companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [stagesRes, dealsRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/crm/pipeline-stages`),
        fetchWithAuth(`${API_URL}/crm/deals`),
      ]);

      if (!stagesRes.ok || !dealsRes.ok) {
        throw new Error('Failed to fetch pipeline data');
      }

      const stagesData = await stagesRes.json();
      const dealsData = await dealsRes.json();

      setStages(Array.isArray(stagesData) ? stagesData : stagesData.data ?? []);
      setDeals(Array.isArray(dealsData) ? dealsData : dealsData.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/pipeline-stages`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];
      setStages(list.sort((a: DealStage, b: DealStage) => a.sort_order - b.sort_order));
    } catch {
      /* ignore */
    }
  }, []);

  const moveDeal = useCallback(async (dealId: string, targetStageId: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: targetStageId } : d)),
    );

    try {
      const res = await fetchWithAuth(`${API_URL}/crm/deals/${dealId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage_id: targetStageId }),
      });

      if (!res.ok) {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stage_id: d.stage_id } : d)),
        );
      }
    } catch {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: d.stage_id } : d)),
      );
    }
  }, []);

  const createDeal = useCallback(
    async (companyId: string, dto: {
      name: string;
      value: number;
      pipeline_stage_id: string;
      company_name?: string;
      contact_id?: string;
    }) => {
      const res = await fetchWithAuth(`${API_URL}/crm/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!res.ok) throw new Error('Failed to create deal');
      const deal = await res.json();
      setDeals((prev) => [deal, ...prev]);
      return deal;
    },
    [],
  );

  const filteredDeals = useCallback(() => {
    return deals.filter((d) => {
      if (filterAssigned && d.assigned_to !== filterAssigned) return false;
      if (d.value < filterValueMin) return false;
      if (d.value > filterValueMax) return false;
      return true;
    });
  }, [deals, filterAssigned, filterValueMin, filterValueMax]);

  return {
    stages,
    deals,
    loading,
    error,
    fetchPipeline,
    fetchStages,
    moveDeal,
    createDeal,
    filterAssigned,
    setFilterAssigned,
    filterValueMin,
    setFilterValueMin,
    filterValueMax,
    setFilterValueMax,
    filteredDeals,
  };
}
