import { useCRMStore } from '@/stores/crm-store';
import * as api from '@/lib/crm-api';

jest.mock('@/lib/crm-api');

const mockedApi = api as jest.Mocked<typeof api>;

const mockLead = {
  id: 'deal-1',
  name: 'Juan Pérez',
  value: 50000,
  company_name: 'Acme Inc',
  probability: 80,
  pipeline_stage_id: 'lead_nuevo',
  pipeline_stage: { id: 'lead_nuevo', name: 'Lead Nuevo', color: '#6B7280' },
  assigned_to: 'user-1',
  assigned_user: { id: 'user-1', name: 'Vendedor' },
  contact_id: 'contact-1',
  contact: { id: 'contact-1', name: 'Juan Pérez', phone: '+541155555555', source: 'whatsapp' },
  tags: ['hot'],
  last_activity_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

describe('CRM Store', () => {
  beforeEach(() => {
    useCRMStore.setState({
      leads: [],
      stats: null,
      filters: {},
      total: 0,
      isLoading: false,
      error: null,
      eventLog: [],
    });
    jest.clearAllMocks();
  });

  describe('loadLeads', () => {
    it('should fetch leads and update state', async () => {
      mockedApi.fetchPipelineLeads.mockResolvedValue({ data: [mockLead], total: 1 });

      await useCRMStore.getState().loadLeads();

      const state = useCRMStore.getState();
      expect(mockedApi.fetchPipelineLeads).toHaveBeenCalledWith({});
      expect(state.leads).toHaveLength(1);
      expect(state.leads[0].name).toBe('Juan Pérez');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should merge provided filters with existing', async () => {
      useCRMStore.setState({ filters: { stage: 'lead_nuevo' } });
      mockedApi.fetchPipelineLeads.mockResolvedValue({ data: [mockLead], total: 1 });

      await useCRMStore.getState().loadLeads({ search: 'Juan' });

      expect(mockedApi.fetchPipelineLeads).toHaveBeenCalledWith({
        stage: 'lead_nuevo',
        search: 'Juan',
      });
    });

    it('should handle errors gracefully', async () => {
      mockedApi.fetchPipelineLeads.mockRejectedValue(new Error('Network error'));

      await useCRMStore.getState().loadLeads();

      const state = useCRMStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.leads).toHaveLength(0);
    });
  });

  describe('loadStats', () => {
    it('should fetch and set stats', async () => {
      const stats = {
        total_deals: 10,
        total_value: 500000,
        avg_value: 50000,
        conversion_rate: 30,
        by_stage: [],
      };
      mockedApi.fetchPipelineStats.mockResolvedValue(stats);

      await useCRMStore.getState().loadStats();

      expect(useCRMStore.getState().stats).toEqual(stats);
    });

    it('should silently fail on error', async () => {
      mockedApi.fetchPipelineStats.mockRejectedValue(new Error('fail'));

      await useCRMStore.getState().loadStats();

      expect(useCRMStore.getState().stats).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('should update filters and reload leads', async () => {
      mockedApi.fetchPipelineLeads.mockResolvedValue({ data: [mockLead], total: 1 });

      useCRMStore.getState().setFilters({ stage: 'negociacion' });

      expect(useCRMStore.getState().filters.stage).toBe('negociacion');
      expect(mockedApi.fetchPipelineLeads).toHaveBeenCalled();
    });

    it('should merge with existing filters', async () => {
      useCRMStore.setState({ filters: { stage: 'lead_nuevo' } });
      mockedApi.fetchPipelineLeads.mockResolvedValue({ data: [mockLead], total: 1 });

      useCRMStore.getState().setFilters({ search: 'test' });

      expect(useCRMStore.getState().filters).toEqual({
        stage: 'lead_nuevo',
        search: 'test',
      });
    });
  });

  describe('moveLead', () => {
    it('should optimistically update and persist', async () => {
      useCRMStore.setState({ leads: [mockLead] });
      mockedApi.movePipelineLead.mockResolvedValue(mockLead);

      await useCRMStore.getState().moveLead('deal-1', 'negociacion');

      expect(mockedApi.movePipelineLead).toHaveBeenCalledWith('deal-1', 'negociacion');
      // Optimistic update happened
      expect(useCRMStore.getState().leads[0].pipeline_stage_id).toBe('negociacion');
    });

    it('should rollback on failure', async () => {
      useCRMStore.setState({ leads: [mockLead] });
      mockedApi.movePipelineLead.mockRejectedValue(new Error('Server error'));

      await useCRMStore.getState().moveLead('deal-1', 'negociacion');

      // Rolled back to original
      expect(useCRMStore.getState().leads[0].pipeline_stage_id).toBe('lead_nuevo');
      expect(useCRMStore.getState().error).toBe('Server error');
    });
  });

  describe('createLead', () => {
    it('should create and prepend lead', async () => {
      mockedApi.createPipelineLead.mockResolvedValue(mockLead);

      await useCRMStore.getState().createLead({ name: 'Juan Pérez', source: 'whatsapp' });

      expect(mockedApi.createPipelineLead).toHaveBeenCalledWith({
        name: 'Juan Pérez',
        source: 'whatsapp',
      });
      const leads = useCRMStore.getState().leads;
      expect(leads).toHaveLength(1);
      expect(leads[0].name).toBe('Juan Pérez');
    });

    it('should handle creation error', async () => {
      mockedApi.createPipelineLead.mockRejectedValue(new Error('Validation error'));

      await useCRMStore.getState().createLead({ name: 'Test' });

      expect(useCRMStore.getState().error).toBe('Validation error');
      expect(useCRMStore.getState().leads).toHaveLength(0);
    });
  });

  describe('removeLead', () => {
    it('should optimistically remove and call API', async () => {
      useCRMStore.setState({ leads: [mockLead] });
      mockedApi.deletePipelineLead.mockResolvedValue(undefined);

      await useCRMStore.getState().removeLead('deal-1');

      expect(mockedApi.deletePipelineLead).toHaveBeenCalledWith('deal-1');
      expect(useCRMStore.getState().leads).toHaveLength(0);
    });

    it('should rollback on delete failure', async () => {
      useCRMStore.setState({ leads: [mockLead] });
      mockedApi.deletePipelineLead.mockRejectedValue(new Error('Delete failed'));

      await useCRMStore.getState().removeLead('deal-1');

      expect(useCRMStore.getState().leads).toHaveLength(1);
      expect(useCRMStore.getState().error).toBe('Delete failed');
    });
  });

  describe('eventLog', () => {
    it('should emit events and cap at 50 entries', () => {
      // Fill with 50 events first
      for (let i = 0; i < 50; i++) {
        useCRMStore.getState().emit('lead:created', { id: `initial-${i}` });
      }
      expect(useCRMStore.getState().eventLog).toHaveLength(50);

      // Add 10 more — log should stay at 50 (oldest dropped)
      for (let i = 0; i < 10; i++) {
        useCRMStore.getState().emit('lead:moved', { dealId: `deal-${i}` });
      }
      expect(useCRMStore.getState().eventLog).toHaveLength(50);

      // First should be initial-10 (50+10-50=10), last should be deal-9
      expect(useCRMStore.getState().eventLog[0].payload.id).toBe('initial-10');
      const last = useCRMStore.getState().eventLog[49];
      expect(last.payload.dealId).toBe('deal-9');
    });
  });
});
