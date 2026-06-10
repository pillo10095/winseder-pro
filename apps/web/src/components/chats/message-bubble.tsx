'use client';

import { memo } from 'react';
import type { Message } from '@/stores/chat-store';

interface MessageBubbleProps {
  message: Message;
}

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-500',
  SENT: 'text-blue-500',
  DELIVERED: 'text-green-500',
  READ: 'text-blue-600',
  FAILED: 'text-red-500',
};

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const time = new Date(message.timestamp).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.from_me) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-green-100 px-4 py-2 shadow-sm">
          {message.type === 'image' && message.media_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={message.media_url}
              alt="Shared image"
              className="mb-1 max-w-full rounded-lg"
            />
          )}
          {message.content && (
            <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] text-gray-400">{time}</span>
            <span className={`text-[10px] ${statusColors[message.status] || 'text-gray-400'}`}>
              {message.status === 'READ' ? '✓✓' : message.status === 'DELIVERED' ? '✓✓' : '✓'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 shadow-sm">
        {message.type === 'image' && message.media_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={message.media_url}
            alt="Received image"
            className="mb-1 max-w-full rounded-lg"
          />
        )}
        {message.content && (
          <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[10px] text-gray-400">{time}</span>
        </div>
      </div>
    </div>
  );
});
