'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useSessionStore } from '@/stores/session-store';

export function useChats() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSession = sessions.find((s) => s.status === 'CONNECTED');

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const error = useChatStore((s) => s.error);

  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  useEffect(() => {
    if (activeSession) {
      fetchConversations(activeSession.id);
    }
  }, [activeSession?.id, fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  return {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    error,
    setActiveConversation,
    activeSession,
  };
}
