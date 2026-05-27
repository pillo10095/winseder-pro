'use client';

import { useWhatsAppSocket } from '@/hooks/use-whatsapp-socket';
import { useChats } from '@/hooks/use-chats';
import { ChatSidebar } from '@/components/chats/chat-sidebar';
import { ChatHeader } from '@/components/chats/chat-header';
import { ChatMessages } from '@/components/chats/chat-messages';
import { ChatInput } from '@/components/chats/chat-input';
import { EmptyState } from '@/components/chats/empty-state';

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
            <ChatInput />
          </>
        ) : (
          <EmptyState hasSession={activeSession != null} />
        )}
      </div>
    </div>
  );
}
