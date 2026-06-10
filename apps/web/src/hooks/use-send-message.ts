'use client';

import { useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';

export function useSendMessage() {
  const [isSending, setIsSending] = useState(false);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore((s) => s.activeConversationId);

  const send = useCallback(
    async (content: string) => {
      if (!activeConversationId || !content.trim() || isSending) return;
      setIsSending(true);
      try {
        await sendMessage(activeConversationId, content.trim());
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, sendMessage, isSending]
  );

  return { send, isSending };
}
