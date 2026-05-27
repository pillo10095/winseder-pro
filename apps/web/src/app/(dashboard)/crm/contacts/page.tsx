'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useContacts } from '@/src/hooks/use-contacts';
import { Plus, Search } from 'lucide-react';

export default function ContactsPage() {
  const { contacts, total, loading, error, fetchContacts } = useContacts();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchContacts('current', search);
  }, [fetchContacts, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${total} contact${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all">
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search contacts..."
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {contacts.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No contacts found
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="cursor-pointer hover:bg-muted-light transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/crm/contacts/${contact.id}`}
                      className="font-medium text-primary hover:text-foreground"
                    >
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{contact.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{contact.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{contact.company_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{contact.source || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
