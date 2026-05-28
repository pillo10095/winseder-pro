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

@Entity('ai_agents')
export class AiAgent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ default: false })
  is_active!: boolean;

  @Column({ length: 50, default: 'openai' })
  provider!: string;

  @Column({ length: 100, default: 'gpt-4o-mini' })
  model!: string;

  @Column({ length: 255, nullable: true, type: 'varchar' })
  api_key!: string | null;

  @Column({ length: 255, nullable: true, type: 'varchar' })
  base_url!: string | null;

  @Column({ type: 'text', nullable: true })
  system_prompt!: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature!: number;

  @Column({ default: 500 })
  max_tokens!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
