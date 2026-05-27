'use client';

import { create } from 'zustand';

export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'sticker';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Message {
  id: string;
  conversation_id: string;
  type: MessageType;
  content?: string | null;
  media_url?: string | null;
  from_me: boolean;
  timestamp: string;
  status: MessageStatus;
}

export interface Conversation {
  id: string;
  session_id: string;
  contact_jid: string;
  contact_name?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  last_message_preview?: string | null;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  fetchConversations: (sessionId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessageStatus: (messageId: string, status: MessageStatus) => void;
  setActiveConversation: (id: string | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  unreadCounts: {},
  isLoading: false,
  error: null,

  fetchConversations: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/whatsapp/sessions/${sessionId}/conversations`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data: Conversation[] = await res.json();
      const unreadCounts: Record<string, number> = {};
      data.forEach((c) => { unreadCounts[c.id] = c.unread_count; });
      set({ conversations: data, unreadCounts, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    const sessionId = get().conversations.find((c) => c.id === conversationId)?.session_id;
    if (!sessionId) return;

    set({ isLoading: true });
    try {
      const res = await fetch(
        `/api/whatsapp/sessions/${sessionId}/conversations/${conversationId}/messages`
      );
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data: Message[] = await res.json();
      set((state) => ({
        messages: { ...state.messages, [conversationId]: data },
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      type: 'text',
      content,
      from_me: true,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), optimistic],
      },
    }));

    try {
      const res = await fetch(`/api/whatsapp/sessions/${conversation.session_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, type: 'text' }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      const sent: Message = await res.json();
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === tempId ? sent : m
          ),
        },
      }));
    } catch (err) {
      // Mark as failed
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === tempId ? { ...m, status: 'FAILED' as MessageStatus } : m
          ),
        },
        error: (err as Error).message,
      }));
    }
  },

  markAsRead: (conversationId: string) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    }));
    // TODO: call API to mark read server-side
  },

  addMessage: (conversationId: string, message: Message) => {
    set((state) => {
      const existing = state.messages[conversationId] || [];
      // Avoid duplicates
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
        // Bump conversation to top
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, last_message_at: message.timestamp, last_message_preview: message.content }
            : c
        ),
      };
    });
  },

  updateMessageStatus: (messageId: string, status: MessageStatus) => {
    set((state) => {
      const updated: Record<string, Message[]> = {};
      for (const [convId, msgs] of Object.entries(state.messages)) {
        updated[convId] = msgs.map((m) => (m.id === messageId ? { ...m, status } : m));
      }
      return { messages: updated };
    });
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) get().markAsRead(id);
  },
}));
