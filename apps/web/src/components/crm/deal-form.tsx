'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface DealFormProps {
  stages: { id: string; name: string; color: string }[];
  onClose: () => void;
  onSave: (data: any) => void;
}

export function DealForm({ stages, onClose, onSave }: DealFormProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [stageId, setStageId] = useState(stages[0]?.id || '');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-sm bg-card border border-border p-6 shadow-constructivist">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">New Deal</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="geometric-frame block pl-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Deal Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. Enterprise Plan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Value (USD)</label>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Company"
              />
            </div>
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
            onClick={() =>
              onSave({
                name,
                value: parseFloat(value) || 0,
                pipeline_stage_id: stageId,
                company_name: companyName || undefined,
              })
            }
            className="rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
