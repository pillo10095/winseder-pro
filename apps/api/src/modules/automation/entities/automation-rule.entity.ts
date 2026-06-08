import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../tenancy/entities/company.entity';

export type RuleEvent = 'whatsapp.first_message' | 'whatsapp.label_added' | 'whatsapp.label_removed' | 'deal.stage_changed' | 'deal.won' | 'deal.lost';

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

  @Column({ length: 50 })
  event!: RuleEvent;

  @Column({ type: 'json', nullable: true })
  conditions!: Record<string, unknown> | null;

  @Column({ type: 'json' })
  action!: { type: string; params: Record<string, unknown> };

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
