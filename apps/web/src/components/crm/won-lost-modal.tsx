'use client';

import { useState } from 'react';
import { fetchWithAuth, API_URL } from '../../lib/api';
import { X } from 'lucide-react';

interface WonLostModalProps {
  dealId: string;
  dealName: string;
  targetStageId: string;
  targetStageName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function WonLostModal({
  dealId,
  dealName,
  targetStageId,
  targetStageName,
  onConfirm,
  onClose,
}: WonLostModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/deals/${dealId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_stage_id: targetStageId,
          reason: reason || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed');
      onConfirm();
    } catch {
      /* error */
    } finally {
      setSaving(false);
    }
  };

  const isWon = targetStageId === '5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-sm bg-card border border-border p-6 shadow-constructivist">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-foreground">
            Move to <span className={isWon ? 'text-success' : 'text-destructive'}>{targetStageName}</span>
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{dealName}</p>

        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder={
              isWon
                ? 'What won the deal? e.g. Competitive pricing, strong relationship...'
                : 'Why was this deal lost? e.g. Budget, competitor, timing...'
            }
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`rounded-sm px-4 py-2 text-sm text-primary-foreground disabled:opacity-50 transition-all ${
              isWon
                ? 'bg-success hover:brightness-110'
                : 'bg-destructive hover:brightness-110'
            }`}
          >
            {saving ? 'Saving...' : `Move to ${targetStageName}`}
          </button>
        </div>
      </div>
    </div>
  );
}
