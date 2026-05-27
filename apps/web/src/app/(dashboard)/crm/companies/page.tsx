'use client';

import { useEffect, useState } from 'react';
import { useCompanies } from '@/src/hooks/use-companies';
import { Search } from 'lucide-react';

export default function CompaniesPage() {
  const { companies, loading, error, fetchCompanies } = useCompanies();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies('current');
  }, [fetchCompanies]);

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filtered.length} companies`}
          </p>
        </div>
        <button className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all">
          + Add Company
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-sm border border-input bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="overflow-hidden rounded-sm border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted-light">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Industry</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contacts</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Deals</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {filtered.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No companies found
                </td>
              </tr>
            ) : (
              filtered.map((company) => (
                <tr key={company.id} className="cursor-pointer hover:bg-muted-light transition-colors">
                  <td className="px-6 py-4 font-medium text-primary">
                    {company.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{company.industry || '—'}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{company.contacts_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{company.deals_count || 0}</td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    ${(company.total_value || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
