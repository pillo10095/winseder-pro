'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { ChatActions } from './chat-actions';
import { useSendMessage } from '@/hooks/use-send-message';

interface ChatInputProps {
  onAttach?: () => void;
  onEmoji?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onAttach,
  onEmoji,
  placeholder = 'Escribí un mensaje...',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { send, isSending } = useSendMessage();

  const handleSend = useCallback(() => {
    if (!text.trim() || isSending) return;
    send(text);
    setText('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isSending, send]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
      <ChatActions onAttach={onAttach} onEmoji={onEmoji} />

      <div className="flex flex-1 items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          rows={1}
          className="max-h-[120px] min-h-[36px] w-full resize-none bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          disabled={isSending}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={!text.trim() || isSending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-500 disabled:opacity-40 disabled:hover:bg-green-600"
      >
        {isSending ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
