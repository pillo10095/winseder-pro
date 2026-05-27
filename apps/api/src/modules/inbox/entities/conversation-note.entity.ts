import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Conversation } from '../../whatsapp/entities/conversation.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('conversation_notes')
export class ConversationNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  conversation_id!: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @Column()
  author_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  created_at!: Date;
}
