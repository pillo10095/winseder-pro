import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Message, MessageStatus } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends Repository<Message> {
  constructor(private dataSource: DataSource) {
    super(Message, dataSource.createEntityManager());
  }

  async findByConversation(
    conversationId: string,
    limit = 50,
    cursor?: string,
  ): Promise<[Message[], number]> {
    const qb = this.createQueryBuilder('m')
      .where('m.conversation_id = :conversationId', { conversationId })
      .orderBy('m.timestamp', 'ASC')
      .take(limit);

    if (cursor) {
      qb.andWhere('m.timestamp > :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }

  async findBySessionAndMessageId(
    sessionId: string,
    messageId: string,
  ): Promise<Message | null> {
    return this.findOne({ where: { session_id: sessionId, message_id: messageId } });
  }

  async updateStatus(
    id: string,
    status: MessageStatus,
  ): Promise<void> {
    await this.update(id, { status });
  }
}
