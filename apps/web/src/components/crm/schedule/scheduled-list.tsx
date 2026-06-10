'use client';

import { useState, useEffect } from 'react';
import { useScheduleStore, type ScheduledMessage } from '@/stores/schedule-store';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  Clock,
  Loader2,
  Ban,
  Send,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageScheduler } from './message-scheduler';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Send; className: string }
> = {
  pendiente: {
    label: 'Pendiente',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-600',
  },
  enviado: {
    label: 'Enviado',
    icon: Send,
    className: 'bg-green-500/10 text-green-600',
  },
  fallido: {
    label: 'Fallido',
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive',
  },
};

export function ScheduledList() {
  const { messages, isLoading, loadMessages, cancelMessage, scheduleMessage } =
    useScheduleStore();
  const [schedulerOpen, setSchedulerOpen] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSchedule = (data: {
    contacto_id?: string;
    contacto_nombre: string;
    mensaje: string;
    fecha_envio: string;
    hora_envio: string;
  }) => {
    scheduleMessage({
      contacto_id: data.contacto_id || '',
      contacto_nombre: data.contacto_nombre,
      contacto_telefono: undefined,
      plantilla_id: '',
      plantilla_nombre: undefined,
      fecha_envio: `${data.fecha_envio}T${data.hora_envio}:00`,
      estado: 'pendiente',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {messages.length}{' '}
          {messages.length === 1
            ? 'mensaje programado'
            : 'mensajes programados'}
        </p>
        <Button size="sm" onClick={() => setSchedulerOpen(true)}>
          Programar Mensaje
        </Button>
      </div>

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="rounded-sm border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay mensajes programados.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Programá mensajes para enviar automáticamente.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => setSchedulerOpen(true)}
          >
            Programar Mensaje
          </Button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {messages.map(msg => {
          const cfg = STATUS_CONFIG[msg.estado] || STATUS_CONFIG.pendiente;
          const Icon = cfg.icon;

          return (
            <div
              key={msg.id}
              className="flex items-start gap-3 rounded-sm border border-border p-3"
            >
              {/* Status */}
              <div className={`rounded-sm p-1.5 ${cfg.className}`}>
                <Icon className="size-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold">
                  {msg.contacto_nombre}
                </h4>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {msg.plantilla_nombre || 'Mensaje directo'}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    {format(new Date(msg.fecha_envio), 'P', {
                      locale: es,
                    })}
                  </span>
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.className}`}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {msg.estado === 'pendiente' && (
                <button
                  onClick={() => cancelMessage(msg.id)}
                  className="rounded-sm p-1 text-muted-foreground hover:text-destructive"
                  title="Cancelar mensaje"
                >
                  <Ban className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <MessageScheduler
        open={schedulerOpen}
        onClose={() => setSchedulerOpen(false)}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
