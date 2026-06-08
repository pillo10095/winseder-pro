import { act, renderHook } from '@testing-library/react';
import { useCalendarStore } from '@/stores/calendar-store';
import { format } from 'date-fns';

const makeEvent = (overrides: Record<string, any> = {}) => ({
  id: 'evt-1',
  tipo: 'cita' as const,
  titulo: 'Test Event',
  fecha: '2026-05-15',
  estado: 'pendiente' as const,
  ...overrides,
});

describe('calendar-store', () => {
  beforeEach(() => {
    act(() =>
      useCalendarStore.setState({
        view: 'monthly',
        currentDate: new Date(2026, 4, 15),
        events: [],
        isLoading: false,
      })
    );
  });

  it('starts with default state', () => {
    const { result } = renderHook(() => useCalendarStore());
    expect(result.current.view).toBe('monthly');
    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('toggles view', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => result.current.setView('weekly'));

    expect(result.current.view).toBe('weekly');
  });

  it('navigates next/prev in monthly mode', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => result.current.next());
    expect(result.current.currentDate.getMonth()).toBe(5); // June

    act(() => result.current.prev());
    expect(result.current.currentDate.getMonth()).toBe(4); // May
  });

  it('navigates next/prev in weekly mode', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => result.current.setView('weekly'));
    act(() => result.current.next());

    const weekLater = new Date(2026, 4, 22);
    expect(result.current.currentDate.getDate()).toBe(weekLater.getDate());
  });

  it('goToday resets to current date', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => result.current.next());
    act(() => result.current.goToday());

    const today = new Date();
    expect(result.current.currentDate.getMonth()).toBe(today.getMonth());
    expect(result.current.currentDate.getDate()).toBe(today.getDate());
  });

  it('adds an event', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => result.current.addEvent(makeEvent()));

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].titulo).toBe('Test Event');
  });

  it('updates an event', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => useCalendarStore.getState().addEvent(makeEvent({ id: 'e1' })));
    act(() => result.current.updateEvent('e1', { titulo: 'Updated' }));

    expect(result.current.events[0].titulo).toBe('Updated');
  });

  it('ignores update for non-existent event', () => {
    const { result } = renderHook(() => useCalendarStore());
    act(() => result.current.addEvent(makeEvent({ id: 'e1' })));

    act(() => result.current.updateEvent('does-not-exist', { titulo: 'Nope' }));

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].titulo).toBe('Test Event');
  });

  it('removes an event', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() => useCalendarStore.getState().addEvent(makeEvent({ id: 'e1' })));
    act(() => useCalendarStore.getState().addEvent(makeEvent({ id: 'e2' })));
    act(() => result.current.removeEvent('e1'));

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('e2');
  });

  it('setEvents replaces all events', () => {
    const { result } = renderHook(() => useCalendarStore());

    act(() =>
      result.current.setEvents([
        makeEvent({ id: 'e1' }),
        makeEvent({ id: 'e2' }),
      ])
    );

    expect(result.current.events).toHaveLength(2);
  });
});
