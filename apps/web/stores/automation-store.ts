import { create } from 'zustand';
import type { AutomationRule } from '@/lib/rule-engine';
import * as api from '@/lib/automation-api';

interface AutomationState {
  rules: AutomationRule[];
  isLoading: boolean;

  loadRules: () => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  addRule: (
    rule: Omit<AutomationRule, 'id' | 'created_at'>
  ) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: [],
  isLoading: false,

  loadRules: async () => {
    set({ isLoading: true });
    try {
      const rules = await api.fetchRules();
      set({ rules, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleRule: async id => {
    const rule = get().rules.find(r => r.id === id);
    if (!rule) return;
    set(s => ({
      rules: s.rules.map(r =>
        r.id === id ? { ...r, activa: !r.activa } : r
      ),
    }));
    try {
      await api.updateRule(id, { activa: !rule.activa });
    } catch {
      set(s => ({
        rules: s.rules.map(r =>
          r.id === id ? { ...r, activa: rule.activa } : r
        ),
      }));
    }
  },

  addRule: async ruleData => {
    try {
      const data = await api.createRule(ruleData);
      set(s => ({ rules: [...s.rules, data.data ?? data] }));
    } catch {}
  },

  removeRule: async id => {
    set(s => ({ rules: s.rules.filter(r => r.id !== id) }));
    try {
      await api.deleteRule(id);
    } catch {}
  },
}));
