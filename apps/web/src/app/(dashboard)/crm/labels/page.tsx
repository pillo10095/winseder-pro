'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Tag, Trash2, Pencil } from 'lucide-react';

import { useLabels } from '@/src/hooks/use-labels';
import type { Label } from '@/src/hooks/use-labels';
import { LabelForm } from '@/src/components/crm/label-form';
import { ConfirmDialog } from '@/src/components/crm/confirm-dialog';

export default function LabelsPage() {
  const { labels, loading, fetchLabels, createLabel, updateLabel, deleteLabel } = useLabels();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Label | null>(null);
  const [deleting, setDeleting] = useState<Label | null>(null);

  const load = useCallback(() => fetchLabels('current'), [fetchLabels]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: { name: string; color: string }) => {
    if (editing) {
      await updateLabel(editing.id, data);
    } else {
      await createLabel('current', data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteLabel(deleting.id);
    setDeleting(null);
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Labels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tags to organize your contacts
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Label
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">Loading...</div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
          <Tag className="h-12 w-12" />
          <p className="text-sm">No labels yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            Create your first label
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {labels.map((label: Label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 rounded-sm border border-border bg-card p-4 shadow-constructivist"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-sm"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 text-sm font-medium text-foreground">{label.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditing(label); setShowForm(true); }}
                  className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleting(label)}
                  className="rounded-sm p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LabelForm
          initial={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Label"
          message={`Are you sure you want to delete "${deleting.name}"? Contacts with this label will not be deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
