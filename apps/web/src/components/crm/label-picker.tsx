'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { useLabels, Label } from '../../hooks/use-labels';

interface LabelPickerProps {
  companyId?: string;
  value: string[];
  onChange: (labelIds: string[]) => void;
}

export function LabelPicker({ companyId, value, onChange }: LabelPickerProps) {
  const { labels, fetchLabels } = useLabels();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLabels(companyId ?? '');
  }, [companyId, fetchLabels]);

  const selected = labels.filter((l) => value.includes(l.id));

  const toggle = (labelId: string) => {
    if (value.includes(labelId)) {
      onChange(value.filter((id) => id !== labelId));
    } else {
      onChange([...value, labelId]);
    }
  };

  return (
    <div className="relative">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Labels</label>
      <div className="mt-1 flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-sm border border-input bg-background px-3 py-2 text-sm">
        {selected.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: label.color + '20', color: label.color }}
          >
            {label.name}
            <button type="button" onClick={() => toggle(label.id)} className="hover:opacity-70">×</button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {selected.length === 0 ? '+ Add label' : '+'}
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-sm border border-border bg-card p-2 shadow-constructivist">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Select labels</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                    value.includes(label.id) ? 'bg-muted-light font-medium' : 'hover:bg-muted-light'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              ))}
              {labels.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                  No labels yet. Create them in Settings.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
