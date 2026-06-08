import type { ReactNode } from 'react';
import { AutomationTabs } from '@/components/crm/automation/automation-tabs';

export default function AutomationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Automatización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas inteligentes y mapeo de etiquetas para automatizar el pipeline desde WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Reglas Activas', value: '—', color: 'bg-accent/10 text-accent' },
          { label: 'Ejecuciones Hoy', value: '—', color: 'bg-green-500/10 text-green-600' },
          { label: 'Tasa de Éxito', value: '—', color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Leads Automatizados', value: '—', color: 'bg-primary/10 text-primary' },
        ].map(stat => (
          <div key={stat.label} className="rounded-sm border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className={`mt-1 text-xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <AutomationTabs />
      {children}
    </div>
  );
}
