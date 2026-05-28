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

import { Company } from '../../tenancy/entities/company.entity';
import { Conversation } from './conversation.entity';

export enum SessionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  QR_CODE = 'QR_CODE',
  CONNECTED = 'CONNECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('whatsapp_sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 100 })
  session_name!: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.DISCONNECTED })
  status!: SessionStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number!: string | null;

  @Column({ type: 'text', nullable: true })
  auth_state!: string | null;

  @Column({ type: 'datetime', nullable: true })
  last_seen!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Conversation, (c) => c.session)
  conversations!: Conversation[];
}
