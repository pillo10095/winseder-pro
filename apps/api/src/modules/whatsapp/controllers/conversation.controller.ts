import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';

@Controller('whatsapp/sessions/:sessionId/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  /**
   * List conversations for a WhatsApp session.
   */
  @Get()
  async list(
    @Param('sessionId') sessionId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const [data, total] = await this.conversationRepository.findBySessionId(
      sessionId,
      search,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
    return { data, total };
  }

  /**
   * Get messages for a specific conversation.
   */
  @Get(':conversationId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const [data, total] = await this.messageRepository.findByConversation(
      conversationId,
      limit ? parseInt(limit, 10) : 50,
      cursor,
    );
    return { data, total };
  }
}
