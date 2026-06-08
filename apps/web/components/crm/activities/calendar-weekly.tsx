'use client';

import { useCalendarStore } from '@/stores/calendar-store';
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  getEventsForDay,
  HOURS,
  LOCALE,
} from '@/lib/date-utils';
import { EventCard } from './event-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarWeekly() {
  const { currentDate, events, next, prev, goToday } = useCalendarStore();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          Semana del {format(weekStart, "d 'de' MMMM", { locale: LOCALE })}
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
      <div className="mb-1 grid grid-cols-8 border-b border-border pb-1">
        <div className="p-1 text-[10px] font-bold uppercase text-muted-foreground" />
        {days.map((day, i) => (
          <div key={i} className="text-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              {format(day, 'EEE', { locale: LOCALE })}
            </p>
            <span
              className={`inline-flex size-6 items-center justify-center rounded-sm text-xs ${
                isToday(day)
                  ? 'bg-primary font-bold text-primary-foreground'
                  : ''
              }`}
            >
              {format(day, 'd')}
            </span>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[500px] overflow-y-auto">
        {HOURS.map(hour => (
          <div
            key={hour}
            className="grid grid-cols-8 border-b border-border/50"
          >
            <div className="p-1 pr-2 text-right text-[10px] text-muted-foreground">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {days.map((day, di) => {
              const dayEvents = getEventsForDay(events, day).filter(
                e =>
                  e.hora &&
                  parseInt(e.hora.split(':')[0]) === hour
              );
              return (
                <div
                  key={di}
                  className="min-h-[40px] border-l border-border/50 p-0.5"
                >
                  {dayEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      compact
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
