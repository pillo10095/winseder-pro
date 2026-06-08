import { create } from 'zustand';
import * as api from '@/lib/schedule-api';

export interface ScheduledMessage {
  id: string;
  contacto_id: string;
  contacto_nombre: string;
  contacto_telefono?: string;
  plantilla_id: string;
  plantilla_nombre?: string;
  fecha_envio: string;
  estado: 'pendiente' | 'enviado' | 'fallido';
  session_id?: string;
  error?: string;
}

interface ScheduleState {
  messages: ScheduledMessage[];
  isLoading: boolean;

  loadMessages: () => Promise<void>;
  scheduleMessage: (
    msg: Omit<ScheduledMessage, 'id'>
  ) => Promise<void>;
  cancelMessage: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>(set => ({
  messages: [],
  isLoading: false,

  loadMessages: async () => {
    set({ isLoading: true });
    try {
      const messages = await api.fetchScheduledMessages();
      set({ messages, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  scheduleMessage: async msg => {
    try {
      const data = await api.scheduleMessage(msg);
      set(s => ({
        messages: [...s.messages, data.data ?? data],
      }));
    } catch {}
  },

  cancelMessage: async id => {
    set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, estado: 'fallido' as const } : m
      ),
    }));
    try {
      await api.cancelScheduledMessage(id);
    } catch {}
  },
}));
