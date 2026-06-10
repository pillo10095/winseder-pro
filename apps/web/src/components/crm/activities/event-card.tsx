'use client';

import type { CalendarEvent } from '@/types/events';

interface EventCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
}

const EVENT_DOTS: Record<string, string> = {
  cita: 'bg-blue-500',
  mensaje: 'bg-green-500',
  recordatorio: 'bg-amber-500',
};

export function EventCard({ event, compact, onClick }: EventCardProps) {
  if (compact) {
    return (
      <div
        className="flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 hover:opacity-80"
        style={{ borderLeft: `2px solid ${event.color || '#3B82F6'}` }}
        onClick={() => onClick?.(event)}
        title={`${event.titulo}${event.hora ? ` — ${event.hora}` : ''}`}
      >
        <div
          className={`size-1.5 shrink-0 rounded-full ${EVENT_DOTS[event.tipo] || 'bg-gray-400'}`}
        />
        <span className="truncate text-[10px]">{event.titulo}</span>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer rounded-sm border border-border p-2 transition-shadow hover:shadow-constructivist"
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-center gap-1.5">
        <div
          className={`size-2 rounded-full shrink-0 ${EVENT_DOTS[event.tipo] || 'bg-gray-400'}`}
        />
        <p className="truncate text-xs font-bold">{event.titulo}</p>
      </div>
      {event.hora && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {event.hora}
        </p>
      )}
      {event.contacto_nombre && (
        <p className="truncate text-[10px] text-muted-foreground/60">
          {event.contacto_nombre}
        </p>
      )}
    </div>
  );
}
