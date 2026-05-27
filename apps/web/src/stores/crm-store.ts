'use client';

import { create } from 'zustand';

export interface CrmState {
  activeSection: string;
  recentRecords: { id: string; name: string; type: string }[];
  setActiveSection: (section: string) => void;
  addRecentRecord: (record: { id: string; name: string; type: string }) => void;
}

export const useCrmStore = create<CrmState>((set) => ({
  activeSection: 'pipeline',
  recentRecords: [],
  setActiveSection: (section) => set({ activeSection: section }),
  addRecentRecord: (record) =>
    set((state) => ({
      recentRecords: [
        record,
        ...state.recentRecords.filter((r) => r.id !== record.id),
      ].slice(0, 5),
    })),
}));
