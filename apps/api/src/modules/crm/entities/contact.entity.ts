import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from '../../tenancy/entities/company.entity';
import { Label } from './label.entity';

@Entity('contacts')
@Index('IDX_CONTACTS_COMPANY', ['company_id'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToMany(() => Label)
  @JoinTable({
    name: 'contact_labels',
    joinColumn: { name: 'contact_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'label_id', referencedColumnName: 'id' },
  })
  labels!: Label[];

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

  @Column({ type: 'simple-array', nullable: true })
  whatsapp_labels!: string[] | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  wa_id!: string | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  role!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
