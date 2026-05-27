import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Campaign } from './campaign.entity';
import { Contact } from '../../crm/entities/contact.entity';

@Entity('campaign_contacts')
export class CampaignContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  campaign_id!: string;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign!: Campaign;

  @Column()
  contact_id!: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contact_id' })
  contact!: Contact;

  @Column({ length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'datetime', nullable: true })
  sent_at!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  delivered_at!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  read_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
