'use client';

interface ChatActionsProps {
  onAttach?: () => void;
  onEmoji?: () => void;
}

export function ChatActions({ onAttach, onEmoji }: ChatActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {onEmoji && (
        <button
          onClick={onEmoji}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Emoji"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
          </svg>
        </button>
      )}
      {onAttach && (
        <button
          onClick={onAttach}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Adjuntar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
        </button>
      )}
    </div>
  );
}
