'use client';

import { useState } from 'react';
import { ChatListItem } from './chat-list-item';
import type { Conversation } from '@/stores/chat-store';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isLoading: boolean;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const name = (c.contact_name || c.contact_jid).toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : conversations;

  // Sort by last message
  const sorted = [...filtered].sort((a, b) => {
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      {/* Search */}
      <div className="border-b border-gray-200 p-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                  <div className="h-2 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-gray-400">
            {search ? 'Sin resultados' : 'Sin conversaciones'}
          </div>
        ) : (
          sorted.map((conversation) => (
            <ChatListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => onSelectConversation(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
