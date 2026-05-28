import { act, renderHook } from '@testing-library/react';
import { useChatStore, type Message } from '@/stores/chat-store';

const makeMsg = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversation_id: 'conv-1',
  type: 'text',
  content: 'Hello',
  from_me: true,
  timestamp: '2025-01-01T00:00:00Z',
  status: 'SENT',
  ...overrides,
});

describe('chat-store', () => {
  beforeEach(() => {
    act(() => useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messages: {},
      unreadCounts: {},
      isLoading: false,
      error: null,
    }));
  });

  it('starts with default state', () => {
    const { result } = renderHook(() => useChatStore());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
    expect(result.current.messages).toEqual({});
    expect(result.current.unreadCounts).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('adds a message to a conversation', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => result.current.addMessage('conv-1', makeMsg()));

    expect(result.current.messages['conv-1']).toHaveLength(1);
    expect(result.current.messages['conv-1'][0].content).toBe('Hello');
  });

  it('does not add duplicate messages', () => {
    const { result } = renderHook(() => useChatStore());
    const msg = makeMsg();

    act(() => result.current.addMessage('conv-1', msg));
    act(() => result.current.addMessage('conv-1', msg));

    expect(result.current.messages['conv-1']).toHaveLength(1);
  });

  it('bumps conversation preview when adding message', () => {
    const { result } = renderHook(() => useChatStore());
    act(() => useChatStore.setState({
      conversations: [{ id: 'conv-1', session_id: 's1', contact_jid: 'jid', unread_count: 0 }],
    }));

    act(() => result.current.addMessage('conv-1', makeMsg({ content: 'New preview' })));

    expect(result.current.conversations[0].last_message_preview).toBe('New preview');
  });

  it('updates message status', () => {
    const { result } = renderHook(() => useChatStore());
    const msg = makeMsg({ id: 'm1', status: 'PENDING' });

    act(() => result.current.addMessage('conv-1', msg));
    act(() => result.current.updateMessageStatus('m1', 'READ'));

    expect(result.current.messages['conv-1'][0].status).toBe('READ');
  });

  it('sets active conversation and marks it as read', () => {
    const { result } = renderHook(() => useChatStore());
    act(() => useChatStore.setState({
      conversations: [{ id: 'conv-1', session_id: 's1', contact_jid: 'jid', unread_count: 5 }],
      unreadCounts: { 'conv-1': 5 },
    }));

    act(() => result.current.setActiveConversation('conv-1'));

    expect(result.current.activeConversationId).toBe('conv-1');
    expect(result.current.unreadCounts['conv-1']).toBe(0);
  });

  it('clears active conversation', () => {
    const { result } = renderHook(() => useChatStore());
    act(() => useChatStore.setState({ activeConversationId: 'conv-1' }));

    act(() => result.current.setActiveConversation(null));

    expect(result.current.activeConversationId).toBeNull();
  });
});
