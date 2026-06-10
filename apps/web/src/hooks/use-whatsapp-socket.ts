'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSessionStore, SessionStatus } from '@/stores/session-store';
import { useChatStore, Message, MessageStatus } from '@/stores/chat-store';

interface UseWhatsAppSocketOptions {
  companyId?: string;
  autoConnect?: boolean;
}

export function useWhatsAppSocket({ companyId, autoConnect = true }: UseWhatsAppSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const updateSessionStatus = useSessionStore((s) => s.updateSessionStatus);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const sock = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/whatsapp`, {
      query: companyId ? { companyId } : {},
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 300000,
    });

    sock.on('connect', () => {
      console.log('[WS] Connected to WhatsApp namespace');
    });

    sock.on('session:statusChanged', (payload: { sessionId: string; status: SessionStatus }) => {
      updateSessionStatus(payload.sessionId, payload.status);
    });

    sock.on('message:received', (payload: { conversationId: string; message: Message }) => {
      addMessage(payload.conversationId, payload.message);
    });

    sock.on('message:sent', (payload: { conversationId: string; message: Message }) => {
      addMessage(payload.conversationId, payload.message);
    });

    sock.on('message:status', (payload: { messageId: string; status: MessageStatus }) => {
      updateMessageStatus(payload.messageId, payload.status);
    });

    sock.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    sock.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });

    socketRef.current = sock;
  }, [companyId, updateSessionStatus, addMessage, updateMessageStatus]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const emit = useCallback((event: string, data?: Record<string, unknown>) => {
    socketRef.current?.emit(event, data);
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => { disconnect(); };
  }, [autoConnect, connect, disconnect]);

  return { socket: socketRef.current, connect, disconnect, emit };
}
