import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { Plan } from './plan.entity';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column()
  plan_id!: string;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status!: SubscriptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  starts_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  ends_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at!: Date;

  @Column('simple-json', { nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
