import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type Company = {
  id: string;
  name: string;
  industry?: string;
  contacts_count?: number;
  deals_count?: number;
  total_value?: number;
};

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async (_companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/contacts`);
      if (!res.ok) throw new Error('Failed to fetch companies');

      const data = await res.json();
      const contacts: any[] = data.data ?? [];
      const companyMap = new Map<string, Company>();
      for (const c of contacts) {
        if (!c.company_name) continue;
        if (!companyMap.has(c.company_name)) {
          companyMap.set(c.company_name, {
            id: c.company_name,
            name: c.company_name,
            contacts_count: 0,
            deals_count: 0,
            total_value: 0,
          });
        }
        companyMap.get(c.company_name)!.contacts_count! += 1;
      }
      setCompanies(Array.from(companyMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCompany = useCallback(async (companyId: string, dto: { name: string; industry?: string }) => {
    // Create a contact with the company name to register the company
    const res = await fetchWithAuth(`${API_URL}/crm/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dto.name, company_name: dto.name, role: dto.industry || undefined }),
    });

    if (!res.ok) throw new Error('Failed to create company');
    await fetchCompanies(companyId);
    return true;
  }, [fetchCompanies]);

  return { companies, loading, error, fetchCompanies, createCompany };
}
