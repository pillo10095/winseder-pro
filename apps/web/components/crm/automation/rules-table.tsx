'use client';

import { useAutomationRules } from '@/src/hooks/use-automation-rules';
import { useEffect, useState } from 'react';
import { AutomationRuleForm } from './automation-rule-form';

const EVENT_LABELS: Record<string, string> = {
  'whatsapp.first_message': 'Primer mensaje WhatsApp',
  'whatsapp.label_added': 'Etiqueta agregada en WhatsApp',
  'whatsapp.label_removed': 'Etiqueta quitada en WhatsApp',
  'deal.stage_changed': 'Deal cambió de etapa',
  'deal.won': 'Deal ganado',
  'deal.lost': 'Deal perdido',
};

const ACTION_LABELS: Record<string, string> = {
  'pipeline.move': 'Mover deal de etapa',
  'campaign.trigger': 'Disparar campaña',
  'contact.assign': 'Asignar contacto',
};

export function RulesTable() {
  const { rules, loading, error, fetchRules, toggleRule, deleteRule } = useAutomationRules();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} regla{rules.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
        >
          + Nueva regla
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          <p>No hay reglas de automatización todavía.</p>
          <p className="text-xs">Creá tu primera regla para empezar a automatizar el pipeline.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted-light">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Evento</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Acción</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase text-muted-foreground">Activa</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted-light transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{EVENT_LABELS[rule.event] || rule.event}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ACTION_LABELS[rule.action.type] || rule.action.type}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteRule(rule.id)} className="text-xs text-muted-foreground hover:text-destructive">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AutomationRuleForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
