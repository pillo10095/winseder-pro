'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useContacts } from '@/src/hooks/use-contacts';
import { useDeals } from '@/src/hooks/use-deals';
import { ArrowLeft } from 'lucide-react';

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const { contacts, fetchContacts } = useContacts();
  const { deals, fetchDeals } = useDeals();

  const companyName = decodeURIComponent(params.id);

  useEffect(() => {
    fetchContacts('current');
    fetchDeals('current');
  }, [fetchContacts, fetchDeals]);

  const companyContacts = contacts.filter((c) => c.company_name === companyName);
  const companyDeals = deals.filter((d) => d.company_name === companyName);
  const totalValue = companyDeals.reduce((s, d) => s + d.value, 0);

  if (contacts.length > 0 && companyContacts.length === 0 && companyDeals.length === 0) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/crm/companies" className="geometric-frame inline-flex items-center gap-1.5 pl-3 py-1 text-sm text-primary hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Companies
      </Link>

      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{companyName}</h1>
            <p className="text-sm text-muted-foreground">
              {companyContacts.length} contact{companyContacts.length !== 1 ? 's' : ''}
              {' · '}${totalValue.toLocaleString()} total deals
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">Contacts</h2>
        <div className="mt-3 space-y-2">
          {companyContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts from this company</p>
          ) : (
            companyContacts.map((c) => (
              <Link
                key={c.id}
                href={`/crm/contacts/${c.id}`}
                className="flex items-center justify-between rounded-sm px-4 py-2 text-sm bg-muted-light hover:bg-muted-light/80 transition-colors"
              >
                <span className="text-foreground">{c.name}</span>
                <span className="text-muted-foreground">{c.role || '—'}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">Deals</h2>
        <div className="mt-3 space-y-2">
          {companyDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deals for this company</p>
          ) : (
            companyDeals.map((d) => (
              <Link
                key={d.id}
                href={`/crm/deals/${d.id}`}
                className="flex items-center justify-between rounded-sm px-4 py-2 text-sm bg-muted-light hover:bg-muted-light/80 transition-colors"
              >
                <span className="text-foreground">{d.name}</span>
                <span className="font-medium text-foreground">${d.value.toLocaleString()}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
