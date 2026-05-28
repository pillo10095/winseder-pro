import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from '../../tenancy/entities/company.entity';
import { Contact } from './contact.entity';
import { Deal } from './deal.entity';
import { User } from '../../auth/entities/user.entity';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ nullable: true, type: 'varchar' })
  contact_id!: string | null;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact!: Contact | null;

  @Column({ nullable: true, type: 'varchar' })
  deal_id!: string | null;

  @ManyToOne(() => Deal, { nullable: true })
  @JoinColumn({ name: 'deal_id' })
  deal!: Deal | null;

  @Column({ length: 20 })
  type!: ActivityType;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  logged_by!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'logged_by' })
  logged_by_user!: User;

  @Column({ type: 'datetime' })
  activity_date!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
