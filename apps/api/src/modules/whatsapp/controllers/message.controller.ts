import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SendMessageDto } from '../dto/send-message.dto';
import { MessageRepository } from '../repositories/message.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageStatus, MessageType } from '../entities/message.entity';
import { ConversationStatus } from '../entities/conversation.entity';

@Controller('whatsapp/sessions/:sessionId/messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  /**
   * Send a message via an active WhatsApp session.
   * Auto-creates a conversation if `conversation_id` is not provided
   * or if the referenced conversation does not exist.
   */
  @Post()
  async send(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    // Resolve — or auto-create — the conversation
    let conversationId = dto.conversation_id;
    if (!conversationId) {
      // No conversation_id given → create one
      const conversation = await this.conversationRepository.save(
        this.conversationRepository.create({
          session_id: sessionId,
          contact_jid: `unknown-${Date.now()}`,
          contact_name: null,
          last_message_at: new Date(),
          status: ConversationStatus.OPEN,
        }),
      );
      conversationId = conversation.id;
    } else {
      // conversation_id given → verify it exists, auto-create if not
      const existing = await this.conversationRepository.findOne({
        where: { id: conversationId, session_id: sessionId },
      });
      if (!existing) {
        const conversation = this.conversationRepository.create({
          id: conversationId,
          session_id: sessionId,
          contact_jid: `unknown-${Date.now()}`,
          contact_name: null,
          last_message_at: new Date(),
          status: ConversationStatus.OPEN,
        });
        await this.conversationRepository.save(conversation);
      }
    }

    // The actual sending logic will be added when BaileysClient
    // is integrated with the controller layer.
    // For now, save to DB as pending.
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversation_id: conversationId,
        session_id: sessionId,
        message_id: `pending-${Date.now()}`,
        type: dto.type ?? MessageType.TEXT,
        content: dto.content,
        from_me: true,
        timestamp: new Date(),
        status: MessageStatus.PENDING,
      }),
    );

    return { data: message };
  }
}
