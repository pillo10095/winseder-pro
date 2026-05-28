import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Message } from '../../whatsapp/entities/message.entity';
import { Session } from '../../whatsapp/entities/session.entity';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  message_id!: string;

  @ManyToOne(() => Message)
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @Column()
  session_id!: string;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Column({ length: 500, nullable: true, type: 'varchar' })
  original_url!: string | null;

  @Column({ length: 500 })
  storage_key!: string;

  @Column({ length: 100 })
  mime_type!: string;

  @Column()
  file_size!: number;

  @Column({ length: 500, nullable: true, type: 'varchar' })
  thumbnail_key!: string | null;

  @Column({ nullable: true, type: 'int' })
  width!: number | null;

  @Column({ nullable: true, type: 'int' })
  height!: number | null;

  @CreateDateColumn()
  created_at!: Date;
}
