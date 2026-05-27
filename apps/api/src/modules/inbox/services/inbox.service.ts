import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { Conversation, ConversationStatus } from '../../whatsapp/entities/conversation.entity';
import { ConversationRepository } from '../../whatsapp/repositories/conversation.repository';
import { ConversationNoteRepository } from '../repositories/conversation-note.repository';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly noteRepo: ConversationNoteRepository,
  ) {}

  async assignConversation(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.assigned_to = userId;
    return this.conversationRepo.save(conversation);
  }

  async updateStatus(conversationId: string, status: ConversationStatus): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.status = status;
    return this.conversationRepo.save(conversation);
  }

  async addNote(conversationId: string, authorId: string, content: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.noteRepo.save(
      this.noteRepo.create({
        conversation_id: conversationId,
        author_id: authorId,
        content,
      }),
    );
  }

  async getNotes(conversationId: string) {
    return this.noteRepo.findByConversationId(conversationId);
  }

  async findConversations(
    sessionId: string,
    status?: ConversationStatus,
    assignedTo?: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Conversation[], number]> {
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .where('c.session_id = :sessionId', { sessionId })
      .orderBy('c.last_message_at', 'DESC')
      .take(limit);

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (assignedTo) {
      qb.andWhere('c.assigned_to = :assignedTo', { assignedTo });
    }

    if (search) {
      qb.andWhere('(c.contact_name LIKE :search OR c.contact_jid LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (cursor) {
      qb.andWhere('c.last_message_at < :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }
}
