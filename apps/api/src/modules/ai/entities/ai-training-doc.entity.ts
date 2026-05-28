import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from '../../tenancy/entities/company.entity';

@Entity('ai_training_docs')
export class AiTrainingDoc {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'longtext' })
  content!: string;

  @Column({ length: 50, default: 'text' })
  content_type!: string;

  @Column({ type: 'json', nullable: true })
  chunks!: string[] | null;

  @CreateDateColumn()
  created_at!: Date;
}
