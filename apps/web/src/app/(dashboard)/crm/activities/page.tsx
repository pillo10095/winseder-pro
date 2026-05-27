'use client';

import { useEffect, useState, useCallback } from 'react';
import { useActivities } from '@/src/hooks/use-activities';
import { ActivityForm } from '@/src/components/crm/activity-form';
import { Phone, Mail, Handshake, FileText, CheckCircle, Pin } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Handshake,
  note: FileText,
  task: CheckCircle,
};

export default function ActivitiesPage() {
  const { activities, loading, error, fetchActivities, createActivity } = useActivities();
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchActivities('current', filter === 'all' ? undefined : filter);
  }, [fetchActivities, filter]);

  const handleSave = useCallback(
    async (data: { type: string; description: string }) => {
      await createActivity('current', data);
      setShowForm(false);
    },
    [createActivity],
  );

  const filtered =
    filter === 'all'
      ? activities
      : activities.filter((a) => a.type === filter);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filtered.length} activities`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
        >
          + Log Activity
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'call', 'email', 'meeting', 'note', 'task'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted-light text-muted-foreground hover:bg-muted-light hover:text-foreground'
            }`}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && !loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No activities found</div>
        ) : (
          filtered.map((activity) => {
            const Icon = TYPE_ICONS[activity.type] || Pin;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <Icon className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {activity.activity_date
                        ? new Date(activity.activity_date).toLocaleString()
                        : '—'}
                    </span>
                    {activity.logged_by && (
                      <>
                        <span>·</span>
                        <span>{activity.logged_by}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="rounded-sm px-2 py-0.5 text-xs font-medium capitalize bg-muted-light text-muted-foreground">
                  {activity.type}
                </span>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ActivityForm
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
