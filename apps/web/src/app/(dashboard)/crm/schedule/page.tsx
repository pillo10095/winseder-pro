'use client';

import { ScheduledList } from '@/components/crm/schedule/scheduled-list';

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold">Programación de Mensajes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Programá y gestioná envíos de WhatsApp automatizados.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendientes', value: '—', color: 'bg-amber-500/10 text-amber-600' },
          { label: 'Enviados Hoy', value: '—', color: 'bg-green-500/10 text-green-600' },
          { label: 'Próximo Envío', value: '—', color: 'bg-blue-500/10 text-blue-600' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-sm border border-border p-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className={`mt-1 text-xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Scheduled messages */}
      <div className="rounded-sm border border-border p-4">
        <ScheduledList />
      </div>
    </div>
  );
}
