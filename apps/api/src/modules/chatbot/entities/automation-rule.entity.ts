import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from '../../tenancy/entities/company.entity';

export interface RuleCondition {
  field: 'message.content' | 'message.sender_jid' | 'message.type';
  operator: 'contains' | 'equals' | 'starts_with' | 'regex';
  value: string;
}

export interface RuleAction {
  type: 'reply.text' | 'reply.image' | 'webhook' | 'ai_hook';
  config: Record<string, string>;
}

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 200 })
  name!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'json' })
  conditions!: RuleCondition[];

  @Column({ type: 'json' })
  actions!: RuleAction[];

  @Column({ default: 0 })
  priority!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
