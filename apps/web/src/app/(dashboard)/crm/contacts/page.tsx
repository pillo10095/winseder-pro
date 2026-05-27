'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useContacts } from '@/src/hooks/use-contacts';
import { ContactForm } from '@/src/components/crm/contact-form';
import { ConfirmDialog } from '@/src/components/crm/confirm-dialog';
import { exportToCsv } from '@/src/lib/export-csv';
import { Plus, Search, Trash2, Download } from 'lucide-react';

export default function ContactsPage() {
  const { contacts, total, loading, error, fetchContacts, createContact, deleteContact } = useContacts();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
        <div className="flex gap-2">
          <button
            onClick={() => exportToCsv(
              'contacts',
              ['Name', 'Email', 'Phone', 'Company', 'Source'],
              contacts.map((c) => [c.name, c.email || '', c.phone || '', c.company_name || '', c.source || '']),
            )}
            className="flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted-light transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
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
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
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
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleting(contact.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete contact"
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
          title="Delete Contact"
          message="Are you sure you want to delete this contact? This action cannot be undone."
          onConfirm={async () => {
            await deleteContact(deleting);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {showForm && (
        <ContactForm
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await createContact('current', data);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
