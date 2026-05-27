'use client';

import type { Conversation } from '@/stores/chat-store';

interface ChatListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ChatListItem({ conversation, isActive, onClick }: ChatListItemProps) {
  const initials = (conversation.contact_name || conversation.contact_jid).slice(0, 2).toUpperCase();
  const lastMessageDate = conversation.last_message_at
    ? new Date(conversation.last_message_at)
    : null;

  const timeStr = lastMessageDate
    ? lastMessageDate.toLocaleDateString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        ...(lastMessageDate.toDateString() === new Date().toDateString()
          ? {}
          : { day: '2-digit', month: '2-digit' }),
      })
    : '';

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
        isActive ? 'bg-green-50' : ''
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-gray-900">
            {conversation.contact_name || conversation.contact_jid}
          </p>
          {timeStr && (
            <span className="ml-2 shrink-0 text-xs text-gray-400">{timeStr}</span>
          )}
        </div>
        <p className="truncate text-sm text-gray-500">
          {conversation.last_message_preview || 'Sin mensajes'}
        </p>
      </div>

      {conversation.unread_count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-medium text-white">
          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
        </span>
      )}
    </button>
  );
}
