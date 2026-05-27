import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Activity = {
  id: string;
  type: string;
  description: string;
  contact_id?: string;
  deal_id?: string;
  activity_date: string;
  logged_by?: string;
};

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(
    async (
      _companyId: string,
      type?: string,
      contactId?: string,
      dealId?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (contactId) params.set('contact_id', contactId);
        if (dealId) params.set('deal_id', dealId);
        params.set('limit', '50');

        const res = await fetchWithAuth(
          `${API_URL}/crm/activities?${params.toString()}`,
        );
        if (!res.ok) throw new Error('Failed to fetch activities');

        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createActivity = useCallback(
    async (companyId: string, dto: Partial<Activity>) => {
      const res = await fetchWithAuth(`${API_URL}/crm/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!res.ok) throw new Error('Failed to create activity');
      const activity = await res.json();
      setActivities((prev) => [activity, ...prev]);
      return activity;
    },
    [],
  );

  return { activities, loading, error, fetchActivities, createActivity };
}
