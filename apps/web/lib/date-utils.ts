import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  getHours,
  setHours,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent } from '@/types/events';

export {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  getHours,
  setHours,
  isSameDay,
  isSameMonth,
  isToday,
};

export const LOCALE = es;

export function formatDate(date: Date, fmt: string = 'PPP'): string {
  return format(date, fmt, { locale: es });
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

export function getEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events.filter(e => {
    // Parse YYYY-MM-DD as local time to avoid UTC timezone offset issues
    const eventDate = parse(e.fecha, 'yyyy-MM-dd', new Date());
    return isSameDay(eventDate, day);
  });
}
