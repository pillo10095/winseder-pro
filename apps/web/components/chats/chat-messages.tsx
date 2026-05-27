'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './message-bubble';
import type { Message } from '@/stores/chat-store';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessages, setShowNewMessages] = useState(false);

  // Auto-scroll when new messages arrive if user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowNewMessages(true);
    }
  }, [messages.length, isAtBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsAtBottom(atBottom);
    if (atBottom) setShowNewMessages(false);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessages(false);
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      grouped.push({ date: msgDate, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
      >
        <div className="space-y-1">
          {grouped.map((group, gi) => (
            <div key={gi}>
              <div className="flex justify-center py-2">
                <span className="rounded-full bg-gray-200 px-3 py-1 text-[11px] text-gray-500">
                  {group.date}
                </span>
              </div>
              <div className="space-y-1">
                {group.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {showNewMessages && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-green-500"
        >
          Mensajes nuevos ↓
        </button>
      )}
    </div>
  );
}
