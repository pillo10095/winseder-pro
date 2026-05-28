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
import { PipelineStage } from './pipeline-stage.entity';
import { Contact } from './contact.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column()
  pipeline_stage_id!: string;

  @ManyToOne(() => PipelineStage)
  @JoinColumn({ name: 'pipeline_stage_id' })
  pipeline_stage!: PipelineStage;

  @Column({ nullable: true, type: 'varchar' })
  contact_id!: string | null;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact!: Contact | null;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value!: number;

  @Column({ length: 200, nullable: true, type: 'varchar' })
  company_name!: string | null;

  @Column({ default: 0 })
  probability!: number;

  @Column({ type: 'datetime', nullable: true })
  close_date!: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  assigned_to!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assigned_user!: User | null;

  @Column({ type: 'text', nullable: true })
  won_lost_reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
