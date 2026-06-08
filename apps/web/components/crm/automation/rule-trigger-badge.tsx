'use client';

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'Lead Creado',
  lead_moved: 'Lead Movido',
  lead_inactive: 'Lead Inactivo',
  days_since: 'Días desde',
};

interface RuleTriggerBadgeProps {
  trigger: { type: string; config?: Record<string, any> };
}

export function RuleTriggerBadge({ trigger }: RuleTriggerBadgeProps) {
  const label = TRIGGER_LABELS[trigger.type] || trigger.type;

  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
      {label}
      {trigger.type === 'days_since' && trigger.config?.days && (
        <span className="text-muted-foreground">
          ({trigger.config.days}d)
        </span>
      )}
    </span>
  );
}
