import { act, renderHook } from '@testing-library/react';
import { useSessionStore, type Session } from '@/stores/session-store';

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'sess-1',
  session_name: 'Test Session',
  status: 'CONNECTED',
  phone_number: '+5511999999999',
  company_id: 'comp-1',
  ...overrides,
});

describe('session-store', () => {
  beforeEach(() => {
    act(() => useSessionStore.setState({
      sessions: [],
      currentSession: null,
      isLoading: false,
      error: null,
    }));
  });

  it('starts with default state', () => {
    const { result } = renderHook(() => useSessionStore());
    expect(result.current.sessions).toEqual([]);
    expect(result.current.currentSession).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets current session', () => {
    const { result } = renderHook(() => useSessionStore());
    const session = makeSession();

    act(() => result.current.setCurrentSession(session));

    expect(result.current.currentSession).toEqual(session);
  });

  it('clears current session', () => {
    const { result } = renderHook(() => useSessionStore());
    act(() => useSessionStore.setState({ currentSession: makeSession() }));

    act(() => result.current.setCurrentSession(null));

    expect(result.current.currentSession).toBeNull();
  });

  it('updates session status in sessions list', () => {
    const { result } = renderHook(() => useSessionStore());
    act(() => useSessionStore.setState({ sessions: [makeSession()] }));

    act(() => result.current.updateSessionStatus('sess-1', 'DISCONNECTED'));

    expect(result.current.sessions[0].status).toBe('DISCONNECTED');
  });

  it('updates session status in currentSession when it matches', () => {
    const { result } = renderHook(() => useSessionStore());
    const session = makeSession();
    act(() => useSessionStore.setState({ sessions: [session], currentSession: session }));

    act(() => result.current.updateSessionStatus('sess-1', 'EXPIRED'));

    expect(result.current.currentSession?.status).toBe('EXPIRED');
  });

  it('does not update currentSession status when id does not match', () => {
    const { result } = renderHook(() => useSessionStore());
    const session = makeSession();
    act(() => useSessionStore.setState({ sessions: [session], currentSession: session }));

    act(() => result.current.updateSessionStatus('other-id', 'ERROR'));

    expect(result.current.currentSession?.status).toBe('CONNECTED');
  });
});
