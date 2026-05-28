'use client';

import { useWhatsAppSocket } from '@/hooks/use-whatsapp-socket';
import { useChats } from '@/hooks/use-chats';
import { ChatSidebar } from '@/components/chats/chat-sidebar';
import { ChatHeader } from '@/components/chats/chat-header';
import { ChatMessages } from '@/components/chats/chat-messages';
import { ChatInput } from '@/components/chats/chat-input';
import { EmptyState } from '@/components/chats/empty-state';
import { AiSuggestion } from '@/components/chats/ai-suggestion';

export default function ChatsPage() {
  // Connect WebSocket for real-time updates
  useWhatsAppSocket({ autoConnect: true });

  const {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    setActiveConversation,
    activeSession,
  } = useChats();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 shrink-0 max-md:hidden">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversation}
          isLoading={isLoading && conversations.length === 0}
        />
      </div>

      {/* Mobile: conversation selector */}
      <div className="hidden max-md:flex w-full flex-col">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversation}
          isLoading={isLoading && conversations.length === 0}
        />
      </div>

      {/* Main Chat Panel */}
      <div className="flex flex-1 flex-col max-md:hidden">
        {activeConversation ? (
          <>
            <ChatHeader conversation={activeConversation} />
            <ChatMessages messages={conversationMessages} isLoading={false} />
            <div className="border-t border-border px-4 py-2">
              <AiSuggestion
                lastMessage={conversationMessages[conversationMessages.length - 1]?.content ?? undefined}
                conversationContext={conversationMessages
                  .slice(-10)
                  .map((m: any) => `${m.sender}: ${m.content}`)
                  .join('\n')}
                onSelectSuggestion={(suggestion) => {
                  const input = document.querySelector<HTMLTextAreaElement>(
                    'textarea[placeholder*="Escribí"]',
                  );
                  if (input) {
                    input.value = suggestion;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
              />
            </div>
            <ChatInput />
          </>
        ) : (
          <EmptyState hasSession={activeSession != null} />
        )}
      </div>
    </div>
  );
}
