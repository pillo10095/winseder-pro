'use client';

import type { Conversation } from '@/stores/chat-store';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const initials = (conversation.contact_name || conversation.contact_jid).slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {conversation.contact_name || conversation.contact_jid}
        </p>
        <p className="text-xs text-gray-500">{conversation.contact_jid}</p>
      </div>
    </div>
  );
}
