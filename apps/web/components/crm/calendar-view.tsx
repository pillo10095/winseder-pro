'use client';

import { useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg, EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import type { CalendarActivity } from '@/src/hooks/use-calendar';
import { Phone, Mail, Handshake, FileText, CheckCircle, MessageCircle } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Handshake,
  note: FileText,
  task: CheckCircle,
  whatsapp: MessageCircle,
};

const TYPE_COLORS: Record<string, string> = {
  task: '#d97706',
  call: '#16a34a',
  meeting: '#2563eb',
  email: '#9333ea',
  note: '#6b7280',
  whatsapp: '#059669',
  system: '#475569',
};

interface Props {
  events: CalendarActivity[];
  loading: boolean;
  onDateClick: (date: Date) => void;
  onEventClick: (activity: CalendarActivity) => void;
  onEventDrop: (id: string, newDate: Date) => Promise<void>;
  onDatesSet: (start: Date, end: Date) => void;
  filter?: 'all' | 'pending';
}

export function CalendarView({
  events,
  loading,
  onDateClick,
  onEventClick,
  onEventDrop,
  onDatesSet,
  filter,
}: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  const calendarEvents = events
    .filter((a) => {
      if (filter === 'pending') return a.type === 'task' && !a.completed_at;
      return true;
    })
    .map((a) => ({
      id: a.id,
      title: a.description,
      start: a.activity_date,
      allDay: false,
      backgroundColor: TYPE_COLORS[a.type] || '#6b7280',
      borderColor: TYPE_COLORS[a.type] || '#6b7280',
      textColor: '#fff',
      classNames: [
        a.type === 'task' && !a.completed_at ? 'fc-event-task-pending' : '',
        a.completed_at ? 'fc-event-completed' : '',
      ].filter(Boolean),
      extendedProps: { activity: a },
    }));

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const activity = arg.event.extendedProps.activity as CalendarActivity;
    const Icon = TYPE_ICONS[activity?.type] || FileText;
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 text-[11px] text-white leading-tight truncate">
        <Icon className="h-3 w-3 shrink-0 opacity-80" />
        <span className="truncate">{arg.event.title}</span>
      </div>
    );
  }, []);

  const handleDateClick = useCallback(
    (info: { date: Date; dateStr: string }) => onDateClick(info.date),
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const activity = info.event.extendedProps.activity as CalendarActivity;
      onEventClick(activity);
    },
    [onEventClick],
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const activity = info.event.extendedProps.activity as CalendarActivity;
      await onEventDrop(activity.id, info.event.start!);
    },
    [onEventDrop],
  );

  const handleDatesSet = useCallback(
    (info: DatesSetArg) => {
      onDatesSet(info.start, info.end);
    },
    [onDatesSet],
  );

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay',
        }}
        locale="es"
        events={calendarEvents}
        editable={true}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        datesSet={handleDatesSet}
        height="auto"
        eventDisplay="block"
        eventContent={renderEventContent}
      />
    </div>
  );
}
