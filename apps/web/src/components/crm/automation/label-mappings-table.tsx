'use client';

import { useLabelMappings, type LabelMapping } from '@/src/hooks/use-label-mappings';
import { useEffect, useState } from 'react';
import { LabelMappingForm } from './label-mapping-form';

export function LabelMappingsTable() {
  const { mappings, loading, error, fetchMappings, deleteMapping } = useLabelMappings();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LabelMapping | null>(null);

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{mappings.length} mapeo{mappings.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          + Nuevo mapeo
        </button>
      </div>

      {mappings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          <p>No hay mapeos de etiquetas.</p>
          <p className="text-xs">Mapeá una etiqueta de WhatsApp a una etapa del pipeline.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted-light">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Etiqueta WhatsApp</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Etapa del Pipeline</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase text-muted-foreground">Activo</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-muted-light">
                  <td className="px-4 py-3 text-sm font-medium">{m.whatsapp_label}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{m.pipeline_stage?.name || m.pipeline_stage_id}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-2 w-2 rounded-full ${m.enabled ? 'bg-green-500' : 'bg-muted'}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(m)} className="text-xs text-muted-foreground hover:text-foreground">
                        Editar
                      </button>
                      <button onClick={() => deleteMapping(m.id)} className="text-xs text-muted-foreground hover:text-destructive">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <LabelMappingForm onClose={() => setShowForm(false)} />}
      {editing && <LabelMappingForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
