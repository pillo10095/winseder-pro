'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDeals } from '@/src/hooks/use-deals';
import { usePipeline } from '@/src/hooks/use-pipeline';
import { DealForm } from '@/src/components/crm/deal-form';
import { ConfirmDialog } from '@/src/components/crm/confirm-dialog';
import { fetchWithAuth, API_URL } from '@/src/lib/api';
import { exportToCsv } from '@/src/lib/export-csv';
import { Search, Trash2, Download } from 'lucide-react';

const STAGE_NAMES: Record<string, string> = {
  '1': 'Lead',
  '2': 'Qualified',
  '3': 'Proposal',
  '4': 'Negotiation',
  '5': 'Closed Won',
  '6': 'Closed Lost',
};

export default function DealsPage() {
  const { deals, total, loading, error, fetchDeals, deleteDeal } = useDeals();
  const { stages, fetchStages } = usePipeline();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchDeals('current', undefined, undefined, search);
    fetchStages();
  }, [fetchDeals, fetchStages, search]);

  const filtered = deals.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.company_name && d.company_name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Deals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? 'Loading...'
              : `${filtered.length} deals · $${filtered.reduce((s, d) => s + d.value, 0).toLocaleString()} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCsv(
              'deals',
              ['Name', 'Value', 'Stage', 'Company', 'Close Date', 'Assigned'],
              filtered.map((d) => [
                d.name,
                d.value.toString(),
                STAGE_NAMES[d.pipeline_stage_id] || 'Unknown',
                d.company_name || '',
                d.close_date ? new Date(d.close_date).toLocaleDateString() : '',
                d.assigned_to || '',
              ]),
            )}
            className="flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted-light transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
          >
            + Add Deal
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search deals..."
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Close Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {filtered.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No deals found
                </td>
              </tr>
            ) : (
              filtered.map((deal) => (
                <tr key={deal.id} className="cursor-pointer hover:bg-muted-light transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/crm/deals/${deal.id}`}
                      className="font-medium text-primary hover:text-foreground"
                    >
                      {deal.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{deal.company_name || '—'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    ${deal.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-sm px-2 py-1 text-xs font-medium bg-muted-light text-muted-foreground">
                      {STAGE_NAMES[deal.pipeline_stage_id] || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {deal.close_date
                      ? new Date(deal.close_date).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{deal.assigned_to || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleting(deal.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete deal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete Deal"
          message="Are you sure you want to delete this deal? This action cannot be undone."
          onConfirm={async () => {
            await deleteDeal(deleting);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {showForm && (
        <DealForm
          stages={stages}
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await fetchWithAuth(`${API_URL}/crm/deals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            setShowForm(false);
            fetchDeals('current');
          }}
        />
      )}
    </div>
  );
}
