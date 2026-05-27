import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Session } from './session.entity';
import { Message } from './message.entity';
import { User } from '../../auth/entities/user.entity';

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  CLOSED = 'CLOSED',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  session_id!: string;

  @ManyToOne(() => Session, (s) => s.conversations)
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Column({ length: 100 })
  contact_jid!: string;

  @Column({ length: 255, nullable: true })
  contact_name!: string | null;

  @Column({ type: 'datetime', nullable: true })
  last_message_at!: Date | null;

  @Column({ default: 0 })
  unread_count!: number;

  @Column({ nullable: true })
  assigned_to!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assigned_user!: User | null;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.OPEN })
  status!: ConversationStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Message, (m) => m.conversation)
  messages!: Message[];
}
