'use client';

import { useMemo } from 'react';
import { useCalendarStore } from '@/stores/calendar-store';
import {
  getMonthDays,
  isSameMonth,
  isToday,
  getEventsForDay,
  indexEventsByDate,
  LOCALE,
} from '@/lib/date-utils';
import { EventCard } from './event-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarMonthly() {
  const currentDate = useCalendarStore(s => s.currentDate);
  const events = useCalendarStore(s => s.events);
  const next = useCalendarStore(s => s.next);
  const prev = useCalendarStore(s => s.prev);
  const goToday = useCalendarStore(s => s.goToday);
  const days = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const eventsByDate = useMemo(() => indexEventsByDate(events), [events]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {format(currentDate, 'MMMM yyyy', { locale: LOCALE })}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="rounded-sm p-1.5 hover:bg-muted-light/50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goToday}
            className="rounded-sm px-2 py-1.5 text-xs font-bold hover:bg-muted-light/50"
          >
            Hoy
          </button>
          <button
            onClick={next}
            className="rounded-sm p-1.5 hover:bg-muted-light/50"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_HEADERS.map(d => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l border-t border-border">
        {days.map((day, i) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dayKey) ?? [];
          const currentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r border-border p-1 ${
                !currentMonth ? 'bg-muted-light/30' : ''
              }`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-sm text-xs ${
                  isToday(day)
                    ? 'bg-primary font-bold text-primary-foreground'
                    : 'text-muted-foreground'
                } ${!currentMonth ? 'opacity-40' : ''}`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <EventCard key={event.id} event={event} compact />
                ))}
                {dayEvents.length > 3 && (
                  <p className="pl-1 text-[10px] text-muted-foreground/60">
                    +{dayEvents.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
