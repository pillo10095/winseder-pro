import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Conversation } from '../entities/conversation.entity';

@Injectable()
export class ConversationRepository extends Repository<Conversation> {
  constructor(private dataSource: DataSource) {
    super(Conversation, dataSource.createEntityManager());
  }

  async findBySessionId(
    sessionId: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Conversation[], number]> {
    const qb = this.createQueryBuilder('c')
      .where('c.session_id = :sessionId', { sessionId })
      .orderBy('c.last_message_at', 'DESC')
      .take(limit);

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

  async findBySessionAndJid(sessionId: string, contactJid: string): Promise<Conversation | null> {
    return this.findOne({ where: { session_id: sessionId, contact_jid: contactJid } });
  }

  async upsertBySessionAndJid(
    sessionId: string,
    contactJid: string,
    data: Partial<Conversation>,
  ): Promise<Conversation> {
    const existing = await this.findBySessionAndJid(sessionId, contactJid);
    if (existing) {
      await this.update(existing.id, data);
      return { ...existing, ...data } as Conversation;
    }
    return this.save(
      this.create({ session_id: sessionId, contact_jid: contactJid, ...data }),
    );
  }
}
