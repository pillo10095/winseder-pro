import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../tenancy/entities/company.entity';
import { PipelineStage } from '../../crm/entities/pipeline-stage.entity';

@Entity('whatsapp_label_mappings')
export class WhatsappLabelMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 100 })
  whatsapp_label!: string;

  @Column()
  pipeline_stage_id!: string;

  @ManyToOne(() => PipelineStage)
  @JoinColumn({ name: 'pipeline_stage_id' })
  pipeline_stage!: PipelineStage;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
