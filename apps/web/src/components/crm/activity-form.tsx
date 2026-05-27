'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ActivityFormProps {
  onClose: () => void;
  onSave: (data: { type: string; description: string; contact_id?: string; deal_id?: string }) => void;
}

const TYPES = ['call', 'email', 'meeting', 'note', 'task'];

export function ActivityForm({ onClose, onSave }: ActivityFormProps) {
  const [type, setType] = useState('note');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-sm bg-card border border-border p-6 shadow-constructivist">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Log Activity</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="What happened?"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ type, description })}
            className="rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
