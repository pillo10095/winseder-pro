'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useContacts } from '@/src/hooks/use-contacts';
import { useDeals } from '@/src/hooks/use-deals';
import { useActivities } from '@/src/hooks/use-activities';
import { ActivityForm } from '@/src/components/crm/activity-form';
import { ActivityTimeline } from '@/src/components/crm/activity-timeline';
import { ContactForm } from '@/src/components/crm/contact-form';
import { ConfirmDialog } from '@/src/components/crm/confirm-dialog';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const { current, currentLoading, fetchContactById, updateContact, deleteContact } = useContacts();
  const { deals, fetchDeals } = useDeals();
  const { activities, fetchActivities, createActivity } = useActivities();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchContactById(params.id);
  }, [params.id, fetchContactById]);

  useEffect(() => {
    if (current?.id) {
      fetchDeals('current', undefined, undefined, current.company_name);
      fetchActivities('current', undefined, current.id);
    }
  }, [current?.id, current?.company_name, fetchDeals, fetchActivities]);

  const handleLogActivity = useCallback(
    async (data: { type: string; description: string }) => {
      await createActivity('current', { ...data, contact_id: current?.id });
      setShowActivityForm(false);
    },
    [createActivity, current?.id],
  );

  if (currentLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-sm border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!current && !currentLoading) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/crm/contacts" className="geometric-frame inline-flex items-center gap-1.5 pl-3 py-1 text-sm text-primary hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{current!.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[current!.role, current!.company_name].filter(Boolean).join(' at ') || '—'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-sm border border-border px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowEditForm(true)}
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</span>
            <p className="mt-1 text-sm text-foreground">{current!.email || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</span>
            <p className="mt-1 text-sm text-foreground">{current!.phone || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</span>
            <p className="mt-1 text-sm text-foreground">{current!.source || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</span>
            <p className="mt-1 text-sm text-foreground">{current!.role || '—'}</p>
          </div>
        </div>

        {current!.notes && (
          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</span>
            <p className="mt-1 text-sm text-foreground">{current!.notes}</p>
          </div>
        )}
      </div>

      <div className="rounded-sm border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">Linked Deals</h2>
        <div className="mt-3 space-y-2">
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked deals</p>
          ) : (
            deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/crm/deals/${deal.id}`}
                className="flex items-center justify-between rounded-sm px-4 py-2 text-sm bg-muted-light hover:bg-muted-light/80 transition-colors"
              >
                <span className="text-foreground">{deal.name}</span>
                <span className="font-medium text-foreground">${deal.value.toLocaleString()}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Activity Timeline</h2>
          <button
            onClick={() => setShowActivityForm(true)}
            className="rounded-sm border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            + Log Activity
          </button>
        </div>
        <div className="mt-3">
          <ActivityTimeline
            activities={activities.map((a) => ({
              id: a.id,
              type: a.type,
              description: a.description,
              date: a.activity_date ? new Date(a.activity_date).toLocaleString() : '',
              by: a.logged_by || '',
            }))}
          />
        </div>
      </div>

      {showDeleteConfirm && current && (
        <ConfirmDialog
          title="Delete Contact"
          message="Are you sure you want to delete this contact? This action cannot be undone."
          onConfirm={async () => {
            await deleteContact(current.id);
            window.location.href = '/crm/contacts';
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showActivityForm && (
        <ActivityForm
          onClose={() => setShowActivityForm(false)}
          onSave={handleLogActivity}
        />
      )}

      {showEditForm && current && (
        <ContactForm
          initial={{
            name: current.name,
            email: current.email || '',
            phone: current.phone || '',
            company_name: current.company_name || '',
            role: current.role || '',
            source: current.source || '',
            notes: current.notes || '',
          }}
          onClose={() => setShowEditForm(false)}
          onSave={async (data) => {
            await updateContact(current.id, data);
            setShowEditForm(false);
          }}
        />
      )}
    </div>
  );
}
