'use client';

import { useState, useCallback } from 'react';
import { API_URL, fetchWithAuth } from '../lib/api';

export type CalendarActivity = {
  id: string;
  type: string;
  description: string;
  activity_date: string;
  completed_at: string | null;
  contact_id: string | null;
  contact_name?: string;
  deal_id: string | null;
  deal_name?: string;
  logged_by?: string;
};

export function useCalendar() {
  const [events, setEvents] = useState<CalendarActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetchWithAuth(`${API_URL}/crm/activities/calendar?${params}`);
      if (!res.ok) throw new Error('Failed to fetch calendar events');
      setEvents(await res.json());
    } catch (err) {
      console.error('[useCalendar]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const completeActivity = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/activities/${id}/complete`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to complete activity');
    return res.json();
  }, []);

  const updateActivityDate = useCallback(async (id: string, date: Date) => {
    const res = await fetchWithAuth(`${API_URL}/crm/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_date: date.toISOString() }),
    });
    if (!res.ok) throw new Error('Failed to update activity date');
    return res.json();
  }, []);

  return { events, loading, fetchEvents, completeActivity, updateActivityDate };
}
