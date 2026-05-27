import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SendMessageDto } from '../dto/send-message.dto';
import { MessageRepository } from '../repositories/message.repository';
import { ConversationRepository } from '../repositories/conversation.repository';

@Controller('whatsapp/sessions/:sessionId/messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  /**
   * Send a message via an active WhatsApp session.
   */
  @Post()
  async send(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    // The actual sending logic will be added when BaileysClient
    // is integrated with the controller layer.
    // For now, save to DB as pending.
    const conversationId = dto.conversation_id;
    if (!conversationId) {
      return { error: 'conversation_id is required' };
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversation_id: conversationId,
        session_id: sessionId,
        message_id: `pending-${Date.now()}`,
        type: dto.type ?? 'text' as any,
        content: dto.content,
        from_me: true,
        timestamp: new Date(),
        status: 'PENDING' as any,
      }),
    );

    return { data: message };
  }
}
