import { act, renderHook } from '@testing-library/react';
import { useScheduleStore } from '@/stores/schedule-store';
import * as api from '@/lib/schedule-api';

jest.mock('@/lib/schedule-api', () => ({
  fetchScheduledMessages: jest.fn(),
  scheduleMessage: jest.fn(),
  cancelScheduledMessage: jest.fn(),
}));

const mockMsg = {
  id: 'msg-1',
  contacto_id: 'c1',
  contacto_nombre: 'Carlos',
  plantilla_id: 't1',
  fecha_envio: '2026-05-20T10:00:00',
  estado: 'pendiente' as const,
};

describe('schedule-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() =>
      useScheduleStore.setState({ messages: [], isLoading: false })
    );
  });

  describe('loadMessages', () => {
    it('loads messages from API', async () => {
      (api.fetchScheduledMessages as jest.Mock).mockResolvedValue([mockMsg]);

      await act(async () => {
        await useScheduleStore.getState().loadMessages();
      });

      const { result } = renderHook(() => useScheduleStore());
      expect(result.current.messages).toEqual([mockMsg]);
      expect(result.current.isLoading).toBe(false);
    });

    it('handles fetch error gracefully', async () => {
      (api.fetchScheduledMessages as jest.Mock).mockRejectedValue(new Error('Fail'));

      await act(async () => {
        await useScheduleStore.getState().loadMessages();
      });

      const { result } = renderHook(() => useScheduleStore());
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('scheduleMessage', () => {
    it('schedules and appends to state', async () => {
      (api.scheduleMessage as jest.Mock).mockResolvedValue({ data: mockMsg });

      await act(async () => {
        await useScheduleStore.getState().scheduleMessage({
          contacto_id: 'c1',
          contacto_nombre: 'Carlos',
          plantilla_id: 't1',
          fecha_envio: '2026-05-20T10:00:00',
          estado: 'pendiente',
        });
      });

      const { result } = renderHook(() => useScheduleStore());
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].contacto_nombre).toBe('Carlos');
    });

    it('handles error gracefully', async () => {
      (api.scheduleMessage as jest.Mock).mockRejectedValue(new Error('Fail'));

      await act(async () => {
        await useScheduleStore.getState().scheduleMessage({
          contacto_id: 'c1',
          contacto_nombre: 'Carlos',
          plantilla_id: 't1',
          fecha_envio: '2026-05-20T10:00:00',
          estado: 'pendiente',
        });
      });

      const { result } = renderHook(() => useScheduleStore());
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('cancelMessage', () => {
    it('sets status to fallido optimistically and calls API', async () => {
      act(() =>
        useScheduleStore.setState({ messages: [mockMsg] })
      );

      (api.cancelScheduledMessage as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useScheduleStore.getState().cancelMessage('msg-1');
      });

      const { result } = renderHook(() => useScheduleStore());
      expect(result.current.messages[0].estado).toBe('fallido');
      expect(api.cancelScheduledMessage).toHaveBeenCalledWith('msg-1');
    });

    it('handles cancel API error gracefully (keeps optimistic state)', async () => {
      act(() =>
        useScheduleStore.setState({ messages: [mockMsg] })
      );

      (api.cancelScheduledMessage as jest.Mock).mockRejectedValue(new Error('Fail'));

      await act(async () => {
        await useScheduleStore.getState().cancelMessage('msg-1');
      });

      const { result } = renderHook(() => useScheduleStore());
      // Optimistic update stays even if API fails
      expect(result.current.messages[0].estado).toBe('fallido');
    });
  });
});
