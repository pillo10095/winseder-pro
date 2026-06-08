'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCalendarStore } from '@/stores/calendar-store';
import { CalendarMonthly } from '@/components/crm/activities/calendar-monthly';
import { CalendarWeekly } from '@/components/crm/activities/calendar-weekly';
import { EventFormDialog } from '@/components/crm/activities/event-form-dialog';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, CalendarRange } from 'lucide-react';
import type { CalendarEvent } from '@/types/events';

const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    tipo: 'cita',
    titulo: 'Test Drive Toyota Corolla',
    fecha: new Date().toISOString().split('T')[0],
    hora: '10:00',
    duracion_minutos: 60,
    contacto_nombre: 'Carlos Martínez',
    color: '#3B82F6',
    estado: 'pendiente',
  },
  {
    id: '2',
    tipo: 'recordatorio',
    titulo: 'Seguimiento lead frío',
    fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    hora: '14:30',
    contacto_nombre: 'Ana López',
    color: '#F59E0B',
    estado: 'pendiente',
  },
  {
    id: '3',
    tipo: 'mensaje',
    titulo: 'Oferta especial Julio',
    fecha: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    hora: '09:00',
    color: '#22C55E',
    estado: 'pendiente',
  },
];

export default function CalendarPage() {
  const { view, setView } = useCalendarStore();
  const [eventFormOpen, setEventFormOpen] = useState(false);

  useEffect(() => {
    useCalendarStore.getState().setEvents(DEMO_EVENTS);
  }, []);

  const handleSave = useCallback(
    (event: Omit<CalendarEvent, 'id'>) => {
      const newEvent: CalendarEvent = {
        ...event,
        id: crypto.randomUUID?.() || String(Date.now()),
      };
      useCalendarStore.getState().addEvent(newEvent);
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná citas, recordatorios y mensajes programados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-sm border border-border">
            <button
              onClick={() => setView('monthly')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors ${
                view === 'monthly'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-light/40'
              }`}
            >
              <CalendarDays className="size-3.5" />
              Mes
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`flex items-center gap-1 border-l border-border px-3 py-1.5 text-xs font-bold transition-colors ${
                view === 'weekly'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-light/40'
              }`}
            >
              <CalendarRange className="size-3.5" />
              Semana
            </button>
          </div>
          <Button size="sm" onClick={() => setEventFormOpen(true)}>
            <Plus className="mr-1 size-3.5" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Calendar view */}
      {view === 'monthly' ? <CalendarMonthly /> : <CalendarWeekly />}

      {/* Event form */}
      <EventFormDialog
        open={eventFormOpen}
        onClose={() => setEventFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
