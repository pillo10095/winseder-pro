'use client';

import { useState, useEffect } from 'react';
import { fetchActivities } from '@/lib/calendar-api';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTIVITY_ICONS: Record<string, string> = {
  cita: '📅',
  mensaje: '💬',
  recordatorio: '🔔',
  llamada: '📞',
  correo: '📧',
};

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities()
      .then(data =>
        setActivities(
          (Array.isArray(data) ? data : []).slice(0, limit)
        )
      )
      .catch(() => setActivities([]))
      .finally(() => setIsLoading(false));
  }, [limit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin actividades recientes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((act, i) => (
        <div
          key={act.id || i}
          className="flex gap-3 border-l-2 border-border/50 px-3 pb-4 pt-1 last:pb-1"
          style={{ marginLeft: '6px' }}
        >
          <div className="mt-0.5 text-sm">
            {ACTIVITY_ICONS[act.tipo] || '📌'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{act.titulo}</p>
            {act.descripcion && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {act.descripcion}
              </p>
            )}
            {act.contacto_nombre && (
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                {act.contacto_nombre}
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground/40">
              {act.fecha
                ? format(new Date(act.fecha), 'Pp', { locale: es })
                : ''}
              {act.hora ? ` — ${act.hora}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
