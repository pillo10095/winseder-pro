'use client';

import type { AutomationRule } from '@/lib/rule-engine';
import { Switch } from '@/components/ui/switch';
import { RuleTriggerBadge } from './rule-trigger-badge';
import { useAutomationStore } from '@/stores/automation-store';
import { Trash2 } from 'lucide-react';

interface RuleCardProps {
  rule: AutomationRule;
  onEdit: (rule: AutomationRule) => void;
  labelsMap?: Record<string, { name: string; color: string }>;
}

export function RuleCard({ rule, onEdit, labelsMap }: RuleCardProps) {
  const toggleRule = useAutomationStore(s => s.toggleRule);
  const removeRule = useAutomationStore(s => s.removeRule);

  return (
    <div className="group flex items-start gap-3 rounded-sm border border-border p-3 transition-all hover:border-accent/50">
      {/* Color */}
      <div
        className="mt-1 h-8 w-1 shrink-0 rounded-sm"
        style={{ backgroundColor: rule.color || '#CC7722' }}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4
            className="cursor-pointer truncate text-sm font-bold hover:text-accent"
            onClick={() => onEdit(rule)}
          >
            {rule.nombre}
          </h4>
          <span
            className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              rule.prioridad === 'alta'
                ? 'bg-destructive/10 text-destructive'
                : rule.prioridad === 'media'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-blue-500/10 text-blue-600'
            }`}
          >
            {rule.prioridad}
          </span>
        </div>

        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {rule.descripcion}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {rule.trigger && <RuleTriggerBadge trigger={rule.trigger} />}
          <span className="rounded-sm border border-border/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {rule.action?.tipo || 'sin acción'}
          </span>
        </div>

        {rule.condiciones && rule.condiciones.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {rule.condiciones.slice(0, 3).map((c: any, i: number) => {
              if (c.campo === 'etiqueta') {
                const label = labelsMap?.[c.valor];
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-medium"
                    style={{
                      backgroundColor: (label?.color || '#6B7280') + '20',
                      color: label?.color || '#6B7280',
                    }}
                  >
                    {c.operador === 'no_tiene' && 'No '}Etiqueta:
                    {label?.name || '...'}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className="rounded-sm bg-muted-light/30 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                >
                  {c.campo} {c.operador} {c.valor}
                </span>
              );
            })}
            {rule.condiciones.length > 3 && (
              <span className="text-[9px] text-muted-foreground/60">
                +{rule.condiciones.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={rule.activa}
          onCheckedChange={() => toggleRule(rule.id)}
        />
        <button
          onClick={() => removeRule(rule.id)}
          className="rounded-sm p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
