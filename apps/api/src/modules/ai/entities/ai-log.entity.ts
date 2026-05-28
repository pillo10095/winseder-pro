import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from '../../tenancy/entities/company.entity';
import { AiAgent } from './ai-agent.entity';

@Entity('ai_logs')
export class AiLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ nullable: true, type: 'varchar' })
  agent_id!: string | null;

  @ManyToOne(() => AiAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent!: AiAgent | null;

  @Column({ length: 50 })
  type!: string;

  @Column({ type: 'text', nullable: true })
  prompt!: string | null;

  @Column({ type: 'text', nullable: true })
  response!: string | null;

  @Column({ default: 0 })
  tokens_used!: number;

  @Column({ default: 0 })
  duration_ms!: number;

  @CreateDateColumn()
  created_at!: Date;
}
