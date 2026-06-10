'use client';

import { create } from 'zustand';

export type SessionStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED' | 'EXPIRED' | 'ERROR';

export interface Session {
  id: string;
  session_name: string;
  status: SessionStatus;
  phone_number?: string | null;
  last_seen?: string | null;
  company_id: string;
}

interface SessionStore {
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
  fetchSessions: () => Promise<void>;
  disconnectSession: (id: string) => Promise<void>;
  updateSessionStatus: (id: string, status: SessionStatus) => void;
  setCurrentSession: (session: Session | null) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/whatsapp/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      set({ sessions: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  disconnectSession: async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        currentSession: state.currentSession?.id === id ? null : state.currentSession,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateSessionStatus: (id: string, status: SessionStatus) => {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, status } : s)),
      currentSession: state.currentSession?.id === id
        ? { ...state.currentSession, status }
        : state.currentSession,
    }));
  },

  setCurrentSession: (session) => set({ currentSession: session }),
}));
