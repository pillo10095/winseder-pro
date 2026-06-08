import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  source?: string;
  role?: string;
  notes?: string;
  labels?: { id: string; name: string; color: string }[];
  created_at?: string;
};

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Contact | null>(null);
  const [currentLoading, setCurrentLoading] = useState(false);

  const fetchContacts = useCallback(
    async (_companyId: string, search?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('limit', '50');

        const res = await fetchWithAuth(
          `${API_URL}/crm/contacts?${params.toString()}`,
        );
        if (!res.ok) throw new Error('Failed to fetch contacts');

        const data = await res.json();
        setContacts(data.data ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchContactById = useCallback(async (id: string) => {
    setCurrentLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/contacts/${id}`);
      if (!res.ok) throw new Error('Contact not found');
      const body = await res.json();
      const data = body.data ?? body;
      setCurrent(data);
      return data as Contact;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCurrent(null);
      return null;
    } finally {
      setCurrentLoading(false);
    }
  }, []);

  const createContact = useCallback(
    async (companyId: string, dto: Partial<Contact>) => {
      const res = await fetchWithAuth(`${API_URL}/crm/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!res.ok) throw new Error('Failed to create contact');
      const body = await res.json();
      const contact = body.data ?? body;
      setContacts((prev) => [contact, ...prev]);
      setTotal((t) => t + 1);
      return contact;
    },
    [],
  );

  const updateContact = useCallback(
    async (id: string, dto: Partial<Contact>) => {
      const res = await fetchWithAuth(`${API_URL}/crm/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!res.ok) throw new Error('Failed to update contact');
      const updated = await res.json();
      setCurrent(updated);
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      return updated;
    },
    [],
  );

  const deleteContact = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/contacts/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Failed to delete contact');
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setTotal((t) => t - 1);
    return true;
  }, []);

  return {
    contacts, total, loading, error,
    current, currentLoading,
    fetchContacts, fetchContactById, createContact, updateContact, deleteContact,
  };
}
