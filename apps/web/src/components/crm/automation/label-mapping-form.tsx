'use client';

import { useEffect, useState } from 'react';
import { useLabelMappings, type LabelMapping } from '@/src/hooks/use-label-mappings';
import { usePipeline } from '@/src/hooks/use-pipeline';

interface Props {
  onClose: () => void;
  initial?: LabelMapping;
}

export function LabelMappingForm({ onClose, initial }: Props) {
  const { createMapping, updateMapping } = useLabelMappings();
  const { stages, fetchStages } = usePipeline();
  const [label, setLabel] = useState(initial?.whatsapp_label || '');
  const [stageId, setStageId] = useState(initial?.pipeline_stage_id || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !stageId) return;
    setSubmitting(true);
    try {
      if (initial) {
        await updateMapping(initial.id, { whatsapp_label: label.trim(), pipeline_stage_id: stageId });
      } else {
        await createMapping({ whatsapp_label: label.trim(), pipeline_stage_id: stageId });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">{initial ? 'Editar mapeo' : 'Nuevo mapeo de etiqueta'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Etiqueta de WhatsApp</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: interesado, ganado..."
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Etapa del Pipeline</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccionar etapa...</option>
              {stages.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted-light"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
