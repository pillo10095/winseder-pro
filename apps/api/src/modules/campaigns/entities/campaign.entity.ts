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
import { Template } from './template.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 200 })
  name!: string;

  @Column({ nullable: true, type: 'varchar' })
  template_id!: string | null;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template!: Template | null;

  @Column({ length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'datetime', nullable: true })
  scheduled_at!: Date | null;

  @Column({ default: 0 })
  sent_count!: number;

  @Column({ default: 0 })
  delivered_count!: number;

  @Column({ default: 0 })
  read_count!: number;

  @Column({ default: 0 })
  failed_count!: number;

  @Column({ default: 0 })
  total_count!: number;

  @Column({ type: 'datetime', nullable: true })
  completed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
