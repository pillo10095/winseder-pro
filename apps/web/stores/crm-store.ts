import { create } from 'zustand';
import type { PipelineLead, PipelineStats, PipelineFilters } from '@/types/crm';
import * as api from '@/lib/crm-api';

export interface CRMEvent {
  type: 'lead:moved' | 'lead:created' | 'lead:updated' | 'contact:imported' | 'lead:deleted';
  payload: any;
  timestamp: number;
}

interface CRMState {
  leads: PipelineLead[];
  stats: PipelineStats | null;
  filters: PipelineFilters;
  total: number;
  isLoading: boolean;
  error: string | null;
  eventLog: CRMEvent[];

  loadLeads: (filters?: PipelineFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  setFilters: (filters: PipelineFilters) => void;
  moveLead: (dealId: string, newStageKey: string) => Promise<void>;
  createLead: (dto: api.CreateLeadDto) => Promise<void>;
  updateLead: (dealId: string, data: Partial<PipelineLead>) => void;
  removeLead: (dealId: string) => Promise<void>;
  emit: (type: CRMEvent['type'], payload: any) => void;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  leads: [],
  stats: null,
  filters: {},
  total: 0,
  isLoading: false,
  error: null,
  eventLog: [],

  loadLeads: async (filters?: PipelineFilters) => {
    set({ isLoading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const result = await api.fetchPipelineLeads(mergedFilters);
      set({
        leads: result.data,
        total: result.total,
        filters: mergedFilters,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await api.fetchPipelineStats();
      set({ stats });
    } catch {
      // Stats are non-critical, fail silently
    }
  },

  setFilters: (filters: PipelineFilters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().loadLeads();
  },

  moveLead: async (dealId: string, newStageKey: string) => {
    const previous = get().leads;
    // Optimistic update
    set(state => ({
      leads: state.leads.map(l =>
        l.id === dealId
          ? { ...l, pipeline_stage: { ...l.pipeline_stage, id: newStageKey } }
          : l
      ),
    }));
    try {
      await api.movePipelineLead(dealId, newStageKey);
      get().emit('lead:moved', { dealId, newStageKey });
    } catch (e: any) {
      // Rollback on failure
      set({ leads: previous, error: e.message });
    }
  },

  createLead: async (dto: api.CreateLeadDto) => {
    try {
      const lead = await api.createPipelineLead(dto);
      set(state => ({ leads: [lead, ...state.leads] }));
      get().emit('lead:created', lead);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  updateLead: (dealId: string, data: Partial<PipelineLead>) => {
    const previous = get().leads;
    // Optimistic update
    set(state => ({
      leads: state.leads.map(l =>
        l.id === dealId ? { ...l, ...data } : l
      ),
    }));
    get().emit('lead:updated', { dealId, data });

    // Persist async
    api.updatePipelineLead(dealId, data).catch(() => {
      set({ leads: previous, error: 'Error al guardar cambios' });
    });
  },

  removeLead: async (dealId: string) => {
    const previous = get().leads;
    // Optimistic update
    set(state => ({
      leads: state.leads.filter(l => l.id !== dealId),
    }));
    try {
      await api.deletePipelineLead(dealId);
      get().emit('lead:deleted', { dealId });
    } catch (e: any) {
      set({ leads: previous, error: e.message });
    }
  },

  emit: (type, payload) => {
    set(state => ({
      eventLog: [...state.eventLog.slice(-50), { type, payload, timestamp: Date.now() }],
    }));
  },
}));
