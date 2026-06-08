import { act, renderHook } from '@testing-library/react';
import { useAutomationStore } from '@/stores/automation-store';
import * as api from '@/lib/automation-api';

jest.mock('@/lib/automation-api', () => ({
  fetchRules: jest.fn(),
  createRule: jest.fn(),
  updateRule: jest.fn(),
  deleteRule: jest.fn(),
}));

const mockRule = {
  id: 'rule-1',
  nombre: 'Test Rule',
  activa: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('automation-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() =>
      useAutomationStore.setState({ rules: [], isLoading: false })
    );
  });

  describe('loadRules', () => {
    it('loads rules from API', async () => {
      (api.fetchRules as jest.Mock).mockResolvedValue([mockRule]);

      await act(async () => {
        await useAutomationStore.getState().loadRules();
      });

      const { result } = renderHook(() => useAutomationStore());
      expect(result.current.rules).toEqual([mockRule]);
      expect(result.current.isLoading).toBe(false);
    });

    it('handles fetch error gracefully', async () => {
      (api.fetchRules as jest.Mock).mockRejectedValue(new Error('API down'));

      await act(async () => {
        await useAutomationStore.getState().loadRules();
      });

      const { result } = renderHook(() => useAutomationStore());
      expect(result.current.rules).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('toggleRule', () => {
    it('toggles rule optimistically and calls API', async () => {
      act(() =>
        useAutomationStore.setState({ rules: [mockRule] })
      );

      (api.updateRule as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useAutomationStore.getState().toggleRule('rule-1');
      });

      const { result } = renderHook(() => useAutomationStore());
      expect(result.current.rules[0].activa).toBe(false);
      expect(api.updateRule).toHaveBeenCalledWith('rule-1', { activa: false });
    });

    it('rolls back on API error', async () => {
      act(() =>
        useAutomationStore.setState({ rules: [mockRule] })
      );

      (api.updateRule as jest.Mock).mockRejectedValue(new Error('Fail'));

      await act(async () => {
        await useAutomationStore.getState().toggleRule('rule-1');
      });

      const { result } = renderHook(() => useAutomationStore());
      // Should have rolled back to original state
      expect(result.current.rules[0].activa).toBe(true);
    });

    it('does nothing for non-existent rule', async () => {
      await act(async () => {
        await useAutomationStore.getState().toggleRule('does-not-exist');
      });

      expect(api.updateRule).not.toHaveBeenCalled();
    });
  });

  describe('addRule', () => {
    it('adds rule via API and appends to state', async () => {
      const newRule = { nombre: 'New Rule', activa: true };
      (api.createRule as jest.Mock).mockResolvedValue({ data: { id: 'new-1', ...newRule } });

      await act(async () => {
        await useAutomationStore.getState().addRule(newRule as any);
      });

      const { result } = renderHook(() => useAutomationStore());
      expect(result.current.rules).toHaveLength(1);
      expect(result.current.rules[0].nombre).toBe('New Rule');
    });

    it('handles add error gracefully', async () => {
      (api.createRule as jest.Mock).mockRejectedValue(new Error('Fail'));

      await act(async () => {
        await useAutomationStore.getState().addRule({ nombre: 'Fail' } as any);
      });

      const { result } = renderHook(() => useAutomationStore());
      expect(result.current.rules).toEqual([]);
    });
  });

  describe('removeRule', () => {
    it('removes optimistically and calls API', async () => {
      act(() =>
        useAutomationStore.setState({ rules: [mockRule] })
      );

      (api.deleteRule as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useAutomationStore.getState().removeRule('rule-1');
      });

      const { result } = renderHook(() => useAutomationStore());
      expect(result.current.rules).toEqual([]);
      expect(api.deleteRule).toHaveBeenCalledWith('rule-1');
    });
  });
});
