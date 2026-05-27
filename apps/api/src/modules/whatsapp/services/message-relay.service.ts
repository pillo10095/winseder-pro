import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ParsedMessage } from './message-handler.service';

export const MESSAGE_EVENTS = {
  INBOUND: 'whatsapp.message.inbound',
  OUTBOUND: 'whatsapp.message.outbound',
  STATUS_UPDATE: 'whatsapp.message.status',
} as const;

export interface MessageEventPayload {
  sessionId: string;
  conversationId: string;
  messageId: string;
  content: string;
  type: string;
  fromMe: boolean;
  timestamp: Date;
}

@Injectable()
export class MessageRelayService {
  private readonly logger = new Logger(MessageRelayService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Relay an inbound message (received from WhatsApp).
   * The WS gateway listens for this event and pushes to frontend.
   */
  relayInbound(parsed: ParsedMessage): void {
    this.eventEmitter.emit(MESSAGE_EVENTS.INBOUND, this.toPayload(parsed));
  }

  /**
   * Relay an outbound message (sent from our UI).
   */
  relayOutbound(parsed: ParsedMessage): void {
    this.eventEmitter.emit(MESSAGE_EVENTS.OUTBOUND, this.toPayload(parsed));
  }

  /**
   * Notify frontend of a status change (sent → delivered → read → failed).
   */
  relayStatusUpdate(
    sessionId: string,
    messageId: string,
    status: string,
  ): void {
    this.eventEmitter.emit(MESSAGE_EVENTS.STATUS_UPDATE, {
      sessionId,
      messageId,
      status,
      timestamp: new Date(),
    });
  }

  private toPayload(parsed: ParsedMessage): MessageEventPayload {
    return {
      sessionId: parsed.sessionId,
      conversationId: parsed.conversationId,
      messageId: parsed.messageId,
      content: parsed.content,
      type: parsed.type,
      fromMe: parsed.fromMe,
      timestamp: parsed.timestamp,
    };
  }
}
