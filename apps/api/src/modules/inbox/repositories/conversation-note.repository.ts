import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { ConversationNote } from '../entities/conversation-note.entity';

@Injectable()
export class ConversationNoteRepository extends Repository<ConversationNote> {
  constructor(private dataSource: DataSource) {
    super(ConversationNote, dataSource.createEntityManager());
  }

  async findByConversationId(conversationId: string): Promise<ConversationNote[]> {
    return this.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
      relations: ['author'],
    });
  }
}
