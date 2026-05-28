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

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 200 })
  name!: string;

  @Column({ length: 255, nullable: true, type: 'varchar' })
  email!: string | null;

  @Column({ length: 50, nullable: true, type: 'varchar' })
  phone!: string | null;

  @Column({ length: 200, nullable: true, type: 'varchar' })
  company_name!: string | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  source!: string | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  role!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
