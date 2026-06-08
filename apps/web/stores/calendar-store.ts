import { create } from 'zustand';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from '@/lib/date-utils';
import type { CalendarEvent } from '@/types/events';

interface CalendarState {
  view: 'monthly' | 'weekly';
  currentDate: Date;
  events: CalendarEvent[];
  isLoading: boolean;

  setView: (view: 'monthly' | 'weekly') => void;
  setCurrentDate: (date: Date) => void;
  next: () => void;
  prev: () => void;
  goToday: () => void;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: 'monthly',
  currentDate: new Date(),
  events: [],
  isLoading: false,

  setView: view => set({ view }),
  setCurrentDate: currentDate => set({ currentDate }),

  next: () => {
    const { view, currentDate } = get();
    set({
      currentDate:
        view === 'monthly'
          ? addMonths(currentDate, 1)
          : addWeeks(currentDate, 1),
    });
  },

  prev: () => {
    const { view, currentDate } = get();
    set({
      currentDate:
        view === 'monthly'
          ? subMonths(currentDate, 1)
          : subWeeks(currentDate, 1),
    });
  },

  goToday: () => set({ currentDate: new Date() }),

  setEvents: events => set({ events }),

  addEvent: event =>
    set(s => ({ events: [...s.events, event] })),

  updateEvent: (id, data) =>
    set(s => ({
      events: s.events.map(e =>
        e.id === id ? { ...e, ...data } : e
      ),
    })),

  removeEvent: id =>
    set(s => ({
      events: s.events.filter(e => e.id !== id),
    })),
}));
