import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price_mxn!: number;

  @Column({ default: 100 })
  max_contacts!: number;

  @Column({ default: 1 })
  max_whatsapp_sessions!: number;

  @Column({ default: 0 })
  max_campaigns_per_month!: number;

  @Column('simple-json', { nullable: true })
  features!: string[];

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
