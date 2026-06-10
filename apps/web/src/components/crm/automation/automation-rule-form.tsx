'use client';

import { useState } from 'react';
import { useAutomationRules } from '@/src/hooks/use-automation-rules';

const EVENTS = [
  { value: 'whatsapp.first_message', label: 'Primer mensaje WhatsApp' },
  { value: 'whatsapp.label_added', label: 'Etiqueta agregada en WhatsApp' },
  { value: 'whatsapp.label_removed', label: 'Etiqueta quitada en WhatsApp' },
  { value: 'deal.stage_changed', label: 'Deal cambió de etapa' },
  { value: 'deal.won', label: 'Deal ganado' },
  { value: 'deal.lost', label: 'Deal perdido' },
];

const ACTIONS = [
  { value: 'pipeline.move', label: 'Mover deal de etapa', params: [{ key: 'stage_id', label: 'ID de etapa', type: 'text' }] },
  { value: 'campaign.trigger', label: 'Disparar campaña', params: [{ key: 'campaign_id', label: 'ID de campaña', type: 'text' }] },
  { value: 'contact.assign', label: 'Asignar contacto', params: [{ key: 'user_id', label: 'ID de usuario', type: 'text' }] },
];

interface Props {
  onClose: () => void;
  initial?: any;
}

export function AutomationRuleForm({ onClose, initial }: Props) {
  const { createRule, updateRule } = useAutomationRules();
  const [name, setName] = useState(initial?.name || '');
  const [event, setEvent] = useState(initial?.event || EVENTS[0].value);
  const [actionType, setActionType] = useState(initial?.action?.type || ACTIONS[0].value);
  const [actionParams, setActionParams] = useState<Record<string, string>>(initial?.action?.params || {});
  const [submitting, setSubmitting] = useState(false);

  const selectedAction = ACTIONS.find((a) => a.value === actionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const dto = {
        name: name.trim(),
        event,
        action: { type: actionType, params: actionParams },
      };
      if (initial) {
        await updateRule(initial.id, dto);
      } else {
        await createRule(dto);
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
        <h2 className="text-lg font-semibold mb-4">{initial ? 'Editar regla' : 'Nueva regla'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: Mover a Calificado por etiqueta"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Evento</label>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              {EVENTS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Acción</label>
            <select
              value={actionType}
              onChange={(e) => { setActionType(e.target.value); setActionParams({}); }}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {selectedAction?.params.map((param) => (
            <div key={param.key}>
              <label className="text-xs font-medium text-muted-foreground">{param.label}</label>
              <input
                value={actionParams[param.key] || ''}
                onChange={(e) => setActionParams((prev) => ({ ...prev, [param.key]: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                placeholder={param.label}
              />
            </div>
          ))}

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
