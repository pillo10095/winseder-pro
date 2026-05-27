import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';

import { ConversationStatus } from '../../whatsapp/entities/conversation.entity';
import { InboxService } from '../services/inbox.service';
import { AssignConversationDto } from '../dto/assign-conversation.dto';
import { UpdateConversationStatusDto } from '../dto/update-conversation-status.dto';

@Controller('inbox')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get(':sessionId/conversations')
  async list(
    @Param('sessionId') sessionId: string,
    @Query('status') status?: ConversationStatus,
    @Query('assigned_to') assignedTo?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<unknown> {
    const [items, total] = await this.inbox.findConversations(
      sessionId,
      status,
      assignedTo,
      search,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
    return { items, total };
  }

  @Patch(':conversationId/assign')
  async assign(
    @Param('conversationId') conversationId: string,
    @Body() dto: AssignConversationDto,
  ): Promise<unknown> {
    return this.inbox.assignConversation(conversationId, dto.user_id);
  }

  @Patch(':conversationId/status')
  async updateStatus(
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateConversationStatusDto,
  ): Promise<unknown> {
    return this.inbox.updateStatus(conversationId, dto.status);
  }
}
